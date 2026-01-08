import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";
import { verifyAuth } from "../_shared/auth.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

function validateReason(value: unknown): "user_cancelled" | "no_show" | "technical" {
  const allowed = ["user_cancelled", "no_show", "technical"];
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`reason must be one of: ${allowed.join(", ")}`);
  }
  return value as "user_cancelled" | "no_show" | "technical";
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CANCEL-VIDEO-DATE] ${step}${detailsStr}`);
};

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) logStep("Missing env var", { name });
  return v;
}

async function getProfileName(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("name").eq("id", userId).single();
  return data?.name || null;
}

async function deleteDailyRoomIfExists(dailyApiKey: string | null, roomUrl: string | null | undefined) {
  if (!dailyApiKey || !roomUrl) return;

  try {
    const roomName = roomUrl.split("/").pop();
    if (!roomName) return;

    const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${dailyApiKey}` },
    });

    if (response.ok || response.status === 404) {
      logStep("Daily room deleted", { roomName });
    } else {
      logStep("Failed to delete Daily room", { status: response.status });
    }
  } catch (e) {
    logStep("Error deleting Daily room", { error: String(e) });
  }
}

async function refundWalletCreditsSafe(supabase: ReturnType<typeof createClient>, userId: string, creditsToAdd: number) {
  if (!creditsToAdd || !Number.isFinite(creditsToAdd) || creditsToAdd <= 0) return;

  // Ensure wallet exists
  const { error: upsertErr } = await supabase
    .from("wallets")
    .upsert({ user_id: userId, credit_balance: 0 }, { onConflict: "user_id" });
  if (upsertErr) throw new Error(`Failed to init wallet: ${upsertErr.message}`);

  // Prefer atomic RPC if present
  const { error: rpcErr } = await supabase.rpc("wallet_atomic_increment", {
    p_user_id: userId,
    p_field: "credit_balance",
    p_amount: creditsToAdd,
  });
  if (!rpcErr) return;

  // CAS fallback
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: w, error: readErr } = await supabase
      .from("wallets")
      .select("credit_balance")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr || !w) throw new Error(`Failed to read wallet: ${readErr?.message || "not found"}`);

    const current = Number((w as Record<string, unknown>).credit_balance ?? 0);
    const next = current + creditsToAdd;

    const { data: updated, error: updateErr } = await supabase
      .from("wallets")
      .update({ credit_balance: next, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("credit_balance", current)
      .select("credit_balance");

    if (updateErr) throw new Error(`Failed to update wallet: ${updateErr.message}`);
    if (updated && updated.length === 1) return;
  }

  throw new Error("Failed to refund credits due to contention. Please retry.");
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const dailyApiKey = Deno.env.get("DAILY_API_KEY") ?? null;

    if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase environment variables");

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Auth (single source of truth)
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) throw new Error("Unauthorized");

    // Input
    const body = await req.json();
    const videoDateId = validateUUID(body.videoDateId, "videoDateId");
    const reason = validateReason(body.reason);

    logStep("Cancelling video date", { videoDateId, reason, userId: user.id });

    // Fetch video date
    const { data: videoDate, error: vdErr } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .single();

    if (vdErr || !videoDate) throw new Error("Video date not found");

    // Authorization: only participants can cancel
    const isSeeker = user.id === videoDate.seeker_id;
    const isEarner = user.id === videoDate.earner_id;
    if (!isSeeker && !isEarner) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: already cancelled
    if (["cancelled", "cancelled_no_show", "no_show"].includes(videoDate.status)) {
      return new Response(
        JSON.stringify({ success: true, message: "Already cancelled", status: videoDate.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Completed calls cannot be cancelled
    if (videoDate.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Cannot cancel completed video date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete Daily room
    await deleteDailyRoomIfExists(dailyApiKey, videoDate.daily_room_url);

    const refundLabel = reason === "no_show" ? "no_show" : reason === "technical" ? "technical" : "user_cancelled";

    let creditsRefunded = 0;

    // Try RPC first
    const { data: refundRpc, error: refundRpcErr } = await supabase.rpc("refund_video_date_reservation", {
      p_video_date_id: videoDateId,
      p_reason: refundLabel,
    });

    if (!refundRpcErr && refundRpc?.success) {
      creditsRefunded = Number(refundRpc.credits_refunded || 0);
    } else {
      // Safe fallback
      logStep("RPC failed, using fallback", { error: refundRpcErr?.message });

      const releasedAt = new Date().toISOString();
      const { data: claimed, error: claimErr } = await supabase
        .from("credit_reservations")
        .update({ status: "released", released_at: releasedAt })
        .eq("video_date_id", videoDateId)
        .eq("status", "active")
        .select("id,user_id,credits_amount");

      if (claimErr) throw new Error(`Failed to release reservations: ${claimErr.message}`);

      for (const r of claimed || []) {
        const amt = Number((r as Record<string, unknown>).credits_amount || 0);
        const uid = (r as Record<string, unknown>).user_id as string;
        if (!uid || amt <= 0) continue;

        await refundWalletCreditsSafe(supabase, uid, amt);
        creditsRefunded += amt;

        await supabase.from("transactions").insert({
          user_id: uid,
          transaction_type: "video_date_refund",
          credits_amount: amt,
          description: `Credits refunded: ${refundLabel} video_date_id=${videoDateId}`,
          status: "completed",
        });
      }
    }

    // Mark as cancelled
    await supabase
      .from("video_dates")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", videoDateId);

    // Best-effort no-show email
    if (reason === "no_show") {
      const noShowUserId = isSeeker ? videoDate.earner_id : videoDate.seeker_id;
      const senderName = (await getProfileName(supabase, user.id)) || "Your date";

      await supabase.functions.invoke("send-notification-email", {
        body: {
          type: "video_date_no_show",
          recipientId: noShowUserId,
          senderName,
        },
      });
    }

    logStep("Video date cancelled", { creditsRefunded });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Video date cancelled",
        credits_refunded: creditsRefunded,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    logStep("Error", { error: String(error) });
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
