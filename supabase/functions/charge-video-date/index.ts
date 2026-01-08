import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { calculateEarnings } from "../_shared/pricing.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

function validateISODate(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error(`${fieldName} must be a string`);
  const d = new Date(value);
  if (isNaN(d.getTime())) throw new Error(`${fieldName} must be a valid ISO date`);
  return value;
}

const MIN_VIDEO_CREDITS = 200;
const MAX_VIDEO_CREDITS = 900;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHARGE-VIDEO-DATE] ${step}${detailsStr}`);
};

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) logStep("Missing env var", { name });
  return v;
}

async function atomicAddWalletCredits(
  supabase: any,
  userId: string,
  field: "credit_balance" | "pending_earnings",
  delta: number
) {
  // Ensure wallet row exists (match other code: wallet has at least these two numeric fields)
  const { error: upsertError } = await supabase
    .from("wallets")
    .upsert({ user_id: userId, credit_balance: 0, pending_earnings: 0 }, { onConflict: "user_id" });

  if (upsertError) throw new Error(`Wallet upsert failed: ${upsertError.message}`);

  // Preferred: DB RPC atomic increment
  const { error: rpcError } = await supabase.rpc("wallet_atomic_increment", {
    p_user_id: userId,
    p_field: field,
    p_amount: delta,
  });

  if (!rpcError) return;

  // Fallback: CAS-style update (no migration, best effort)
  logStep("wallet_atomic_increment RPC failed; using fallback update", {
    userId,
    field,
    error: rpcError.message,
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: w, error: readError } = await supabase
      .from("wallets")
      .select(`${field}`)
      .eq("user_id", userId)
      .maybeSingle();

    if (readError || !w) throw new Error(`Wallet read failed: ${readError?.message || "not found"}`);

    const current = Number((w as any)[field] ?? 0);
    const next =
      field === "pending_earnings"
        ? Number((current + delta).toFixed(2))
        : current + delta;

    const { data: updated, error: updateError } = await supabase
      .from("wallets")
      .update({ [field]: next, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq(field, current)
      .select(`${field}`);

    if (updateError) throw new Error(`Wallet update failed: ${updateError.message}`);
    if (updated && updated.length === 1) return;
  }

  throw new Error("Wallet update failed due to contention. Please retry.");
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

    if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase environment variables");

    // Service role is required here to perform billing updates.
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const cronSecret = req.headers.get("x-cron-secret");
    const isCron = !!cronSecret && cronSecret === CRON_SECRET;

    // If not cron, require user auth
    let callerUserId: string | null = null;
    if (!isCron) {
      const { user, error: authError } = await verifyAuth(req);

      if (!user) {
        // Fallback only if server auth is misconfigured (prevents sudden outage if ANON key missing).
        if (authError === "Server auth misconfigured") {
          const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
          if (!authHeader) throw new Error("Missing authorization header");
          const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
          const { data: { user: fallbackUser }, error: fallbackError } = await supabase.auth.getUser(jwt);
          if (fallbackError || !fallbackUser) throw new Error("Unauthorized");
          callerUserId = fallbackUser.id;
          logStep("Auth fallback used (server auth misconfigured)", { callerUserId });
        } else {
          throw new Error(authError || "Unauthorized");
        }
      } else {
        callerUserId = user.id;
      }
    }

    const body = await req.json();
    const videoDateId = validateUUID(body.videoDateId, "videoDateId");
    const actualEnd = validateISODate(body.actualEnd, "actualEnd");

    // Load video date
    const { data: videoDate, error: fetchError } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .single();

    if (fetchError || !videoDate) throw new Error("Video date not found");

    // If user call, verify participation
    if (!isCron) {
      if (!callerUserId) throw new Error("Unauthorized");
      if (videoDate.seeker_id !== callerUserId && videoDate.earner_id !== callerUserId) {
        throw new Error("Unauthorized to charge this video date");
      }
    }

    // Stronger idempotency: already completed/charged
    if (videoDate.status === "completed" && videoDate.credits_charged) {
      return new Response(
        JSON.stringify({ success: true, message: "Already processed", credits_charged: videoDate.credits_charged }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Extra idempotency: reservation already charged (covers partial/inconsistent video_dates state)
    const { data: chargedReservation } = await supabase
      .from("credit_reservations")
      .select("id,status,credits_amount")
      .eq("video_date_id", videoDateId)
      .eq("status", "charged")
      .maybeSingle();

    if (chargedReservation) {
      logStep("Reservation already charged; skipping", { videoDateId, reservationId: chargedReservation.id });
      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Validate reserved credits
    const reserved = Number(videoDate.credits_reserved);
    if (!Number.isFinite(reserved) || reserved < MIN_VIDEO_CREDITS || reserved > MAX_VIDEO_CREDITS) {
      throw new Error(`Video date credits must be between ${MIN_VIDEO_CREDITS} and ${MAX_VIDEO_CREDITS}`);
    }

    const scheduledMinutesRaw = Number(videoDate.scheduled_duration || 15);
    const scheduledMinutes = Number.isFinite(scheduledMinutesRaw) && scheduledMinutesRaw > 0 ? scheduledMinutesRaw : 15;

    const actualStartMs = videoDate.actual_start
      ? new Date(videoDate.actual_start).getTime()
      : new Date(videoDate.scheduled_start).getTime();

    const actualEndMs = actualEnd ? new Date(actualEnd).getTime() : Date.now();

    const actualSeconds = Math.max(0, Math.floor((actualEndMs - actualStartMs) / 1000));
    const actualMinutes = Math.max(1, Math.ceil(actualSeconds / 60));

    const minutesToCharge = Math.min(actualMinutes, scheduledMinutes);

    const creditsPerMinute = videoDate.credits_per_minute
      ? Number(videoDate.credits_per_minute)
      : reserved / scheduledMinutes;

    if (!Number.isFinite(creditsPerMinute) || creditsPerMinute <= 0) {
      throw new Error("Invalid credits_per_minute calculation");
    }

    // Cap to reserved credits to prevent rounding overcharge.
    const creditsToCharge = Math.min(Math.ceil(minutesToCharge * creditsPerMinute), reserved);

    if (!Number.isFinite(creditsToCharge) || creditsToCharge <= 0) {
      throw new Error("Invalid credits to charge");
    }

    const callTypeLabel = videoDate.call_type === "audio" ? "Audio" : "Video";

    // Single source of truth for money split + rounding
    const { grossUsd: finalUsd, creatorUsd: finalEarnerAmount, platformUsd: finalPlatformFee } =
      calculateEarnings(creditsToCharge);

    // Update actual_end early (non-financial)
    await supabase
      .from("video_dates")
      .update({ actual_end: new Date(actualEndMs).toISOString() })
      .eq("id", videoDateId);

    // Reservation flow (preferred)
    const { data: reservation } = await supabase
      .from("credit_reservations")
      .select("*")
      .eq("video_date_id", videoDateId)
      .eq("status", "active")
      .maybeSingle();

    if (reservation) {
      const reservedCredits = Number(reservation.credits_amount);
      const creditsToRefund = reservedCredits - creditsToCharge;

      // Refund unused credits
      if (creditsToRefund > 0) {
        await atomicAddWalletCredits(supabase, videoDate.seeker_id, "credit_balance", creditsToRefund);

        const { error: refundTxError } = await supabase.from("transactions").insert({
          user_id: videoDate.seeker_id,
          transaction_type: "video_date_partial_refund",
          credits_amount: creditsToRefund,
          description: `Partial refund for shorter call (${minutesToCharge}/${scheduledMinutes} minutes) video_date_id=${videoDateId}`,
          status: "completed",
        });

        if (refundTxError) logStep("WARN: failed to insert refund transaction", { error: refundTxError.message });
      }

      // Pay earner (USD)
      await atomicAddWalletCredits(supabase, videoDate.earner_id, "pending_earnings", finalEarnerAmount);

      // Mark reservation charged
      const { error: resUpdateError } = await supabase
        .from("credit_reservations")
        .update({ status: "charged", released_at: new Date().toISOString() })
        .eq("id", reservation.id);

      if (resUpdateError) throw new Error(`Failed to mark reservation charged: ${resUpdateError.message}`);

      // Finalize video date
      const { error: vdUpdateError } = await supabase
        .from("video_dates")
        .update({
          status: "completed",
          credits_charged: creditsToCharge,
          earner_amount: finalEarnerAmount,
          platform_fee: finalPlatformFee,
          completed_at: new Date().toISOString(),
        })
        .eq("id", videoDateId);

      if (vdUpdateError) throw new Error(`Failed to finalize video date: ${vdUpdateError.message}`);

      // Best-effort audit trail
      const { error: txError } = await supabase.from("transactions").insert([
        {
          user_id: videoDate.seeker_id,
          transaction_type: "video_date",
          credits_amount: -creditsToCharge,
          usd_amount: -finalUsd,
          description: `${callTypeLabel} call completed (${minutesToCharge} minutes) video_date_id=${videoDateId}`,
          status: "completed",
        },
        {
          user_id: videoDate.earner_id,
          transaction_type: "video_earning",
          credits_amount: 0,
          usd_amount: finalEarnerAmount,
          description: `${callTypeLabel} call earnings video_date_id=${videoDateId}`,
          status: "completed",
        },
      ]);

      if (txError) logStep("WARN: failed to insert audit transactions", { error: txError.message });

      return new Response(
        JSON.stringify({
          success: true,
          credits_charged: creditsToCharge,
          earner_amount: finalEarnerAmount,
          platform_fee: finalPlatformFee,
          minutes_charged: minutesToCharge,
          credits_refunded: Math.max(0, creditsToRefund),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Legacy fallback (DB transaction RPC)
    const { data: result, error: rpcError } = await supabase.rpc("charge_video_date_transaction", {
      p_video_date_id: videoDateId,
      p_seeker_id: videoDate.seeker_id,
      p_earner_id: videoDate.earner_id,
      p_credits_charged: creditsToCharge,
      p_earner_amount: finalEarnerAmount,
      p_platform_fee: finalPlatformFee,
      p_usd_amount: finalUsd,
    });

    if (rpcError) throw new Error(`Failed to process payment: ${rpcError.message}`);
    if (!result?.success) throw new Error(result?.error || "Transaction failed");

    return new Response(
      JSON.stringify({
        success: true,
        credits_charged: creditsToCharge,
        earner_amount: finalEarnerAmount,
        platform_fee: finalPlatformFee,
        minutes_charged: minutesToCharge,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error charging video date:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
