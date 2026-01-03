// supabase/functions/create-daily-room/index.ts
// deno-lint-ignore-file
// @ts-nocheck
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

function validateISODate(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error(`${fieldName} must be a string`);
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new Error(`${fieldName} must be a valid ISO date`);

  // within 24h of now
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const t = date.getTime();
  if (t < now - oneDay || t > now + oneDay) {
    throw new Error(`${fieldName} must be within 24 hours of current time`);
  }
  return value;
}

const CREDIT_TO_USD = 0.1;
const PLATFORM_FEE_PCT = 0.3;
const MIN_VIDEO_CREDITS = 200;
const MAX_VIDEO_CREDITS = 900;

function round2(n: number) {
  return Number(n.toFixed(2));
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

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
    const actualEndIso = validateISODate(body.actualEnd, "actualEnd");

    console.log(`[charge-video-date] videoDateId=${videoDateId} user=${user.id}`);

    // ---- Fetch video date ----
    const { data: videoDate, error: fetchError } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .maybeSingle();

    if (fetchError || !videoDate) throw new Error("Video date not found");

    const isParticipant = videoDate.seeker_id === user.id || videoDate.earner_id === user.id;
    if (!isParticipant) throw new Error("Unauthorized to charge this video date");

    // Don’t charge terminal/bad states
    if (["cancelled", "declined", "no_show"].includes(videoDate.status)) {
      return new Response(
        JSON.stringify({ success: true, message: `Not chargeable (status=${videoDate.status})`, credits_charged: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Idempotency: already completed with credits_charged
    if (videoDate.status === "completed" && videoDate.credits_charged) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Already processed",
          credits_charged: videoDate.credits_charged,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Validate reserved credits
    if (
      typeof videoDate.credits_reserved !== "number" ||
      videoDate.credits_reserved < MIN_VIDEO_CREDITS ||
      videoDate.credits_reserved > MAX_VIDEO_CREDITS
    ) {
      throw new Error(`Video date credits must be between ${MIN_VIDEO_CREDITS} and ${MAX_VIDEO_CREDITS}`);
    }

    const scheduledMinutes = Number(videoDate.scheduled_duration || 0);
    if (!scheduledMinutes || scheduledMinutes <= 0) throw new Error("Invalid scheduled_duration");

    // ---- Compute time + credits ----
    const actualStartMs = videoDate.actual_start
      ? new Date(videoDate.actual_start).getTime()
      : new Date(videoDate.scheduled_start).getTime();

    const actualEndMs = actualEndIso ? new Date(actualEndIso).getTime() : Date.now();

    // clamp: end must be >= start (otherwise charge 1 minute)
    const diffSeconds = Math.max(0, Math.floor((actualEndMs - actualStartMs) / 1000));
    const actualMinutes = Math.max(1, Math.ceil(diffSeconds / 60));
    const minutesToCharge = Math.min(actualMinutes, scheduledMinutes);

    const creditsPerMinute =
      videoDate.credits_per_minute !== null && videoDate.credits_per_minute !== undefined
        ? Number(videoDate.credits_per_minute)
        : videoDate.credits_reserved / scheduledMinutes;

    const creditsToCharge = Math.ceil(minutesToCharge * creditsPerMinute);

    const callTypeLabel = videoDate.call_type === "audio" ? "Audio" : "Video";

    const usdAmount = creditsToCharge * CREDIT_TO_USD;
    const platformFee = usdAmount * PLATFORM_FEE_PCT;
    const earnerAmount = usdAmount - platformFee;

    const finalUsd = round2(usdAmount);
    const finalPlatformFee = round2(platformFee);
    const finalEarnerAmount = round2(earnerAmount);

    console.log(
      `[charge-video-date] ${minutesToCharge}/${scheduledMinutes} min, credits=${creditsToCharge}, usd=${finalUsd}`,
    );

    // Always set actual_end (idempotent)
    await supabase
      .from("video_dates")
      .update({ actual_end: new Date(actualEndMs).toISOString() })
      .eq("id", videoDateId);

    // ---- Reservation path (new system) ----
    const { data: reservation } = await supabase
      .from("credit_reservations")
      .select("*")
      .eq("video_date_id", videoDateId)
      .maybeSingle();

    // If reservation exists but already charged/refunded, treat as idempotent
    if (reservation?.status === "charged") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Already processed (reservation charged)",
          credits_charged: videoDate.credits_charged ?? creditsToCharge,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Only process refunds/charge when reservation is active
    if (reservation && reservation.status === "active") {
      const reserved = Number(reservation.credits_amount || 0);

      // clamp charge <= reserved (safety)
      const safeCreditsToCharge = Math.min(creditsToCharge, reserved);

      const creditsToRefund = Math.max(0, reserved - safeCreditsToCharge);

      // If partial refund is needed, refund unused credits to seeker wallet
      if (creditsToRefund > 0) {
        // NOTE: this is read->write (race possible). Prefer an RPC increment.
        const { data: seekerWallet } = await supabase
          .from("wallets")
          .select("credit_balance")
          .eq("user_id", videoDate.seeker_id)
          .maybeSingle();

        const cur = seekerWallet?.credit_balance ?? 0;

        const { error: walletErr } = await supabase
          .from("wallets")
          .update({ credit_balance: cur + creditsToRefund, updated_at: new Date().toISOString() })
          .eq("user_id", videoDate.seeker_id);

        if (walletErr) throw new Error("Failed to refund unused credits");

        await supabase.from("transactions").insert({
          user_id: videoDate.seeker_id,
          transaction_type: "video_date_partial_refund",
          credits_amount: creditsToRefund,
          description: `Partial refund for shorter call (${minutesToCharge}/${scheduledMinutes} minutes)`,
          status: "completed",
        });
      }

      // Add earnings to earner wallet (pending_earnings) - also read->write (race possible)
      const { data: earnerWallet } = await supabase
        .from("wallets")
        .select("pending_earnings")
        .eq("user_id", videoDate.earner_id)
        .maybeSingle();

      const curPending = earnerWallet?.pending_earnings ?? 0;

      const { error: earnErr } = await supabase
        .from("wallets")
        .update({ pending_earnings: curPending + finalEarnerAmount, updated_at: new Date().toISOString() })
        .eq("user_id", videoDate.earner_id);

      if (earnErr) throw new Error("Failed to credit earner pending earnings");

      // Mark reservation charged (idempotent guard: only if still active)
      await supabase
        .from("credit_reservations")
        .update({ status: "charged", released_at: new Date().toISOString() })
        .eq("id", reservation.id)
        .eq("status", "active");

      // Update video date completed
      await supabase
        .from("video_dates")
        .update({
          status: "completed",
          credits_charged: safeCreditsToCharge,
          earner_amount: finalEarnerAmount,
          platform_fee: finalPlatformFee,
          completed_at: new Date().toISOString(),
        })
        .eq("id", videoDateId);

      // Ledger entries:
      // - Reservation already deducted credits earlier, so don’t double “-credits”.
      await supabase.from("transactions").insert([
        {
          user_id: videoDate.seeker_id,
          transaction_type: "video_date",
          credits_amount: 0,
          usd_amount: -finalUsd,
          description: `${callTypeLabel} call completed (${minutesToCharge} minutes)`,
          status: "completed",
        },
        {
          user_id: videoDate.earner_id,
          transaction_type: "video_earning",
          credits_amount: 0,
          usd_amount: finalEarnerAmount,
          description: `${callTypeLabel} call earnings`,
          status: "completed",
        },
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          credits_charged: safeCreditsToCharge,
          earner_amount: finalEarnerAmount,
          minutes_charged: minutesToCharge,
          credits_refunded: creditsToRefund,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // ---- Legacy fallback (no reservation) ----
    // Here credits were NOT reserved earlier, so the RPC should handle debiting seeker, crediting earner, etc.
    console.log("[charge-video-date] No active reservation, using legacy RPC");

    const { data: result, error: rpcError } = await supabase.rpc("charge_video_date_transaction", {
      p_video_date_id: videoDateId,
      p_seeker_id: videoDate.seeker_id,
      p_earner_id: videoDate.earner_id,
      p_credits_charged: creditsToCharge,
      p_earner_amount: finalEarnerAmount,
      p_platform_fee: finalPlatformFee,
      p_usd_amount: finalUsd,
    });

    if (rpcError) {
      console.error("[charge-video-date] RPC error:", rpcError);
      throw new Error("Failed to process payment");
    }

    if (!result?.success) {
      throw new Error(result?.error || "Transaction failed");
    }

    return new Response(
      JSON.stringify({
        success: true,
        credits_charged: creditsToCharge,
        earner_amount: finalEarnerAmount,
        minutes_charged: minutesToCharge,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: unknown) {
    console.error("[charge-video-date] Error:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
