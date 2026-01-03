import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

const VALID_REASONS = ["user_cancelled", "no_show", "technical", "other"] as const;
type CancelReason = (typeof VALID_REASONS)[number];

function validateReason(value: unknown): CancelReason {
  if (typeof value === "string" && VALID_REASONS.includes(value as CancelReason)) {
    return value as CancelReason;
  }
  return "user_cancelled";
}

function getRoomNameFromDailyUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // room name is last path segment
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  } catch {
    // fallback if URL parsing fails
    const last = url.split("/").pop();
    return last ? last.split("?")[0] : null;
  }
}

async function getProfileName(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("name").eq("id", userId).maybeSingle();
  return data?.name ?? null;
}

function refundDescription(reason: CancelReason): string {
  if (reason === "no_show") return "Credits refunded: Partner did not join";
  if (reason === "technical") return "Credits refunded: Technical issues";
  if (reason === "other") return "Credits refunded: Cancelled";
  return "Credits refunded: Cancelled by user";
}

function nextVideoDateStatus(reason: CancelReason): "cancelled" | "no_show" {
  return reason === "no_show" ? "no_show" : "cancelled";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dailyApiKey = Deno.env.get("DAILY_API_KEY") || null;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- Auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const jwt = authHeader.replace("Bearer ", "").trim();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !user) throw new Error("Unauthorized");

    // ---- Input ----
    const body = await req.json().catch(() => ({}));
    const videoDateId = validateUUID(body.videoDateId, "videoDateId");
    const reason = validateReason(body.reason);

    console.log(`[cancel-video-date] videoDateId=${videoDateId} reason=${reason} user=${user.id}`);

    // ---- Fetch video date ----
    const { data: videoDate, error: fetchError } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .maybeSingle();

    if (fetchError || !videoDate) throw new Error("Video date not found");

    const isParticipant = videoDate.seeker_id === user.id || videoDate.earner_id === user.id;
    if (!isParticipant) throw new Error("Unauthorized to cancel this video date");

    // If already terminal, return success (idempotent)
    if (["cancelled", "completed", "no_show"].includes(videoDate.status)) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Video date already ${videoDate.status}`,
          credits_refunded: 0,
          reason,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // ---- Try to delete Daily room (non-fatal) ----
    if (videoDate.daily_room_url && dailyApiKey) {
      const roomName = getRoomNameFromDailyUrl(videoDate.daily_room_url);
      if (roomName) {
        try {
          const resp = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${dailyApiKey}` },
          });
          console.log("[cancel-video-date] Daily delete room", roomName, resp.status);
        } catch (e) {
          console.warn("[cancel-video-date] Failed to delete Daily room:", e);
        }
      }
    }

    // ---- Refund reservation (idempotent) ----
    // Note: this assumes ONE active reservation per video_date_id.
    const { data: reservation } = await supabase
      .from("credit_reservations")
      .select("*")
      .eq("video_date_id", videoDateId)
      .eq("status", "active")
      .maybeSingle();

    let creditsRefunded = 0;

    if (reservation) {
      creditsRefunded = reservation.credits_amount || 0;

      // Load wallet balance
      const { data: wallet, error: walletErr } = await supabase
        .from("wallets")
        .select("credit_balance")
        .eq("user_id", reservation.user_id)
        .maybeSingle();

      if (walletErr) {
        console.warn("[cancel-video-date] Wallet fetch error:", walletErr);
      }

      const currentBalance = wallet?.credit_balance ?? 0;

      // Update wallet (non-atomic - see RPC note below)
      const { error: walletUpdateErr } = await supabase
        .from("wallets")
        .update({
          credit_balance: currentBalance + creditsRefunded,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", reservation.user_id);

      if (walletUpdateErr) {
        console.warn("[cancel-video-date] Wallet update error:", walletUpdateErr);
        // If wallet fails, DO NOT mark reservation refunded or you’ll lose credits.
        throw new Error("Failed to refund credits (wallet update failed)");
      }

      // Mark reservation refunded
      const { error: reservationErr } = await supabase
        .from("credit_reservations")
        .update({ status: "refunded", released_at: new Date().toISOString() })
        .eq("id", reservation.id);

      if (reservationErr) {
        console.warn("[cancel-video-date] Reservation update error:", reservationErr);
        // At this point wallet is already credited. Keep going but log hard.
      }

      // Create transaction log
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: reservation.user_id,
        transaction_type: "video_date_refund",
        credits_amount: creditsRefunded,
        description: refundDescription(reason),
        status: "completed",
      });

      if (txErr) {
        console.warn("[cancel-video-date] Transaction insert error:", txErr);
      }

      console.log(`[cancel-video-date] Refunded ${creditsRefunded} credits to ${reservation.user_id}`);
    } else {
      console.log("[cancel-video-date] No active reservation found (nothing to refund)");
    }

    // ---- Update video date status ----
    const newStatus = nextVideoDateStatus(reason);

    const { error: updateError } = await supabase
      .from("video_dates")
      .update({
        status: newStatus,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", videoDateId);

    if (updateError) throw new Error("Failed to update video date status");

    // ---- Notify (non-fatal) ----
    if (reason === "no_show") {
      // Who didn’t show? The OTHER user.
      const noShowUserId = videoDate.seeker_id === user.id ? videoDate.earner_id : videoDate.seeker_id;
      const waitingUserName = (await getProfileName(supabase, user.id)) || "Your date";

      try {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            type: "video_date_no_show",
            recipientId: noShowUserId,
            senderName: waitingUserName,
            scheduledStart: videoDate.scheduled_start,
          },
        });
        console.log("[cancel-video-date] No-show email sent to:", noShowUserId);
      } catch (e) {
        console.warn("[cancel-video-date] Failed to send no-show email:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Video date cancelled successfully",
        credits_refunded: creditsRefunded,
        reason,
        status: newStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: unknown) {
    console.error("[cancel-video-date] Error:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
