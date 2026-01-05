import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

// ---------------------------------------------
// Validation
// ---------------------------------------------
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

const VALID_REASONS = ["user_cancelled", "no_show", "technical", "other"] as const;
type CancelReason = (typeof VALID_REASONS)[number];

function validateReason(value: unknown): CancelReason {
  if (typeof value === "string" && (VALID_REASONS as readonly string[]).includes(value)) {
    return value as CancelReason;
  }
  return "user_cancelled";
}

async function getProfileName(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("name").eq("id", userId).single();
  return data?.name || null;
}

// ---------------------------------------------
// Daily helper
// ---------------------------------------------
async function deleteDailyRoomIfExists(dailyApiKey: string | null, roomUrl: string | null | undefined) {
  if (!dailyApiKey) return;
  if (!roomUrl) return;

  const roomName = roomUrl.split("/").pop();
  if (!roomName) return;

  try {
    await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${dailyApiKey}` },
    });
  } catch (_e) {
    // don't fail cancel if Daily cleanup fails
  }
}

// ---------------------------------------------
// Main
// ---------------------------------------------
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dailyApiKey = Deno.env.get("DAILY_API_KEY") ?? null;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const jwt = authHeader.replace("Bearer ", "");
    const { data: auth, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !auth?.user) throw new Error("Unauthorized");
    const user = auth.user;

    // Input
    const body = await req.json();
    const videoDateId = validateUUID(body.videoDateId, "videoDateId");
    const reason = validateReason(body.reason);

    // Load video date
    const { data: videoDate, error: fetchError } = await supabase
      .from("video_dates")
      .select("id,seeker_id,earner_id,status,daily_room_url,scheduled_start")
      .eq("id", videoDateId)
      .single();

    if (fetchError || !videoDate) throw new Error("Video date not found");

    // Participant check
    const isSeeker = videoDate.seeker_id === user.id;
    const isEarner = videoDate.earner_id === user.id;
    if (!isSeeker && !isEarner) throw new Error("Unauthorized to cancel this video date");

    // Idempotent: if already cancelled/completed, just return
    if (videoDate.status === "cancelled" || videoDate.status === "completed") {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Video date already ${videoDate.status}`,
          credits_refunded: 0,
          reason,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Daily cleanup (best-effort)
    await deleteDailyRoomIfExists(dailyApiKey, videoDate.daily_room_url);

    // ---------------------------------------------
    // Refund credits (ATOMIC via RPC if installed)
    // - refunds ALL active reservations for this video_date_id
    // - marks reservations released
    // - inserts a refund transaction (credits only)
    // ---------------------------------------------
    const refundLabel =
      reason === "no_show" ? "no_show" : reason === "technical" ? "technical" : "user_cancelled";

    let creditsRefunded = 0;

    const { data: refundRpc, error: refundRpcErr } = await supabase.rpc("refund_video_date_reservation", {
      p_video_date_id: videoDateId,
      p_reason: refundLabel,
    });

    if (!refundRpcErr && refundRpc?.success) {
      creditsRefunded = Number(refundRpc.credits_refunded || 0);
    } else {
      // ---------------------------------------------
      // Fallback (if RPC not installed yet):
      // Refund ALL active reservations safely (no .single())
      // ---------------------------------------------
      const { data: reservations, error: resErr } = await supabase
        .from("credit_reservations")
        .select("id,user_id,credits_amount")
        .eq("video_date_id", videoDateId)
        .eq("status", "active");

      if (resErr) throw new Error(`Failed to load reservations: ${resErr.message}`);

      for (const r of reservations || []) {
        // increment wallet with an atomic SQL update pattern (no read-modify-write)
        // NOTE: Supabase JS can't do "credit_balance = credit_balance + X" directly
        // without RPC, so we do a safe read+write per reservation as last resort.
        // This is why the RPC above is strongly recommended.
        const { data: wallet, error: wErr } = await supabase
          .from("wallets")
          .select("credit_balance")
          .eq("user_id", r.user_id)
          .single();

        if (wErr) continue;

        const newBal = Number(wallet?.credit_balance || 0) + Number(r.credits_amount || 0);

        await supabase
          .from("wallets")
          .update({ credit_balance: newBal, updated_at: new Date().toISOString() })
          .eq("user_id", r.user_id);

        await supabase
          .from("credit_reservations")
          .update({ status: "released", released_at: new Date().toISOString() })
          .eq("id", r.id);

        creditsRefunded += Number(r.credits_amount || 0);
      }

      if (creditsRefunded > 0) {
        await supabase.from("transactions").insert({
          user_id: videoDate.seeker_id,
          transaction_type: "video_date_refund",
          credits_amount: creditsRefunded,
          description: `Credits refunded: ${refundLabel}`,
          status: "completed",
        });
      }

      // Ensure status cancelled even if refund fallback used
      await supabase
        .from("video_dates")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", videoDateId);
    }

    // No-show email (best-effort)
    if (reason === "no_show") {
      const noShowUserId = isSeeker ? videoDate.earner_id : videoDate.seeker_id;
      const senderName = (await getProfileName(supabase, user.id)) || "Your date";

      try {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            type: "video_date_no_show",
            recipientId: noShowUserId,
            senderName,
            scheduledStart: videoDate.scheduled_start,
          },
        });
      } catch (_e) {}
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Video date cancelled",
        credits_refunded: creditsRefunded,
        reason,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: unknown) {
    console.error("[cancel-video-date] Error:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});