// supabase/functions/charge-video-date/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

// =============================================================================
// VALIDATION
// =============================================================================
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
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new Error(`${fieldName} must be a valid ISO date`);

  // keep it tight (prevents weird client payloads)
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  if (date.getTime() < now - oneDay || date.getTime() > now + oneDay) {
    throw new Error(`${fieldName} must be within 24 hours of current time`);
  }

  return value;
}

function assertOk(error: any, label: string) {
  if (error) throw new Error(`${label}: ${error.message ?? String(error)}`);
}

// =============================================================================
// CONSTANTS
// =============================================================================
const CREDIT_TO_USD = 0.1;
const PLATFORM_FEE_PCT = 0.3;
const MIN_VIDEO_CREDITS = 200;
const MAX_VIDEO_CREDITS = 900;

// =============================================================================
// WALLET HELPERS (CRITICAL FIX: ensure wallet row exists, don’t silently skip)
// =============================================================================
async function ensureWalletRow(supabase: any, userId: string) {
  const { error } = await supabase
    .from("wallets")
    .upsert({ user_id: userId }, { onConflict: "user_id" });

  assertOk(error, `Failed to ensure wallet row for ${userId}`);
}

async function readWallet(supabase: any, userId: string, columns: string) {
  await ensureWalletRow(supabase, userId);

  const { data, error } = await supabase
    .from("wallets")
    .select(columns)
    .eq("user_id", userId)
    .single();

  assertOk(error, `Failed to read wallet (${columns}) for ${userId}`);
  return data as Record<string, any>;
}

async function addCredits(supabase: any, userId: string, deltaCredits: number) {
  const w = await readWallet(supabase, userId, "credit_balance");
  const next = (w.credit_balance ?? 0) + deltaCredits;

  const { error } = await supabase
    .from("wallets")
    .update({ credit_balance: next, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  assertOk(error, `Failed to update credit_balance for ${userId}`);
}

async function addPendingEarningsUSD(supabase: any, userId: string, deltaUsd: number) {
  const w = await readWallet(supabase, userId, "pending_earnings");
  const next = Number(((w.pending_earnings ?? 0) + deltaUsd).toFixed(2));

  const { error } = await supabase
    .from("wallets")
    .update({ pending_earnings: next, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  assertOk(error, `Failed to update pending_earnings for ${userId}`);
}

// =============================================================================
// MAIN
// =============================================================================
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Service role client (needed to update wallets/transactions reliably)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller JWT (still required for access)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const jwt = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !user) throw new Error("Unauthorized");

    // Input
    const body = await req.json();
    const videoDateId = validateUUID(body.videoDateId, "videoDateId");
    const actualEnd = validateISODate(body.actualEnd, "actualEnd");

    console.log(`[charge-video-date] videoDateId=${videoDateId}`);

    // Load video date
    const { data: videoDate, error: fetchError } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .single();

    assertOk(fetchError, "Video date not found");

    // Must be participant
    if (videoDate.seeker_id !== user.id && videoDate.earner_id !== user.id) {
      throw new Error("Unauthorized to charge this video date");
    }

    // Already processed
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

    // Validate reserved credits sanity
    const creditsReserved = Number(videoDate.credits_reserved ?? 0);
    if (creditsReserved < MIN_VIDEO_CREDITS || creditsReserved > MAX_VIDEO_CREDITS) {
      throw new Error(`Video date credits must be between ${MIN_VIDEO_CREDITS} and ${MAX_VIDEO_CREDITS}`);
    }

    const scheduledMinutes = Number(videoDate.scheduled_duration ?? 0);
    if (!scheduledMinutes || scheduledMinutes <= 0) throw new Error("Invalid scheduled_duration");

    // Times
    const actualStartTime = videoDate.actual_start
      ? new Date(videoDate.actual_start).getTime()
      : new Date(videoDate.scheduled_start).getTime();

    const actualEndTime = actualEnd ? new Date(actualEnd).getTime() : Date.now();

    if (actualEndTime <= actualStartTime) {
      throw new Error("actualEnd must be after actual_start");
    }

    const actualSeconds = Math.floor((actualEndTime - actualStartTime) / 1000);
    const actualMinutes = Math.max(1, Math.ceil(actualSeconds / 60));

    const minutesToCharge = Math.min(actualMinutes, scheduledMinutes);

    // Use snapshot per-minute if present
    const creditsPerMinute = videoDate.credits_per_minute
      ? Number(videoDate.credits_per_minute)
      : creditsReserved / scheduledMinutes;

    const creditsToCharge = Math.ceil(minutesToCharge * creditsPerMinute);

    const callTypeLabel = videoDate.call_type === "audio" ? "Audio" : "Video";

    // USD split (70/30)
    const usdAmount = creditsToCharge * CREDIT_TO_USD;
    const platformFee = usdAmount * PLATFORM_FEE_PCT;
    const earnerAmount = usdAmount - platformFee;

    const finalUsd = Number(usdAmount.toFixed(2));
    const finalPlatformFee = Number(platformFee.toFixed(2));
    const finalEarnerAmount = Number(earnerAmount.toFixed(2));

    console.log(
      `[charge-video-date] ${callTypeLabel} minutesToCharge=${minutesToCharge} creditsToCharge=${creditsToCharge} USD=${finalUsd} earner=${finalEarnerAmount} fee=${finalPlatformFee}`,
    );

    // Always persist actual_end
    {
      const { error } = await supabase
        .from("video_dates")
        .update({ actual_end: new Date(actualEndTime).toISOString() })
        .eq("id", videoDateId);

      assertOk(error, "Failed to update actual_end");
    }

    // =============================================================================
    // NEW SYSTEM: credit_reservations (preferred)
    // =============================================================================
    const { data: reservation, error: reservationErr } = await supabase
      .from("credit_reservations")
      .select("*")
      .eq("video_date_id", videoDateId)
      .eq("status", "active")
      .single();

    // If table exists but no active row, Supabase returns error for .single().
    // We only treat it as fatal if it's NOT "no rows".
    if (reservationErr && !String(reservationErr.message ?? "").toLowerCase().includes("0 rows")) {
      throw new Error(`Failed to fetch reservation: ${reservationErr.message}`);
    }

    if (reservation) {
      console.log("[charge-video-date] Using reservation system");

      // Credits were already deducted at reservation time.
      const reservedCredits = Number(reservation.credits_amount ?? 0);
      const creditsToRefund = Math.max(0, reservedCredits - creditsToCharge);

      // Refund unused credits if any
      if (creditsToRefund > 0) {
        await addCredits(supabase, videoDate.seeker_id, creditsToRefund);

        const { error } = await supabase.from("transactions").insert({
          user_id: videoDate.seeker_id,
          transaction_type: "video_date_partial_refund",
          credits_amount: creditsToRefund,
          description: `Partial refund for shorter call (${minutesToCharge}/${scheduledMinutes} minutes)`,
          status: "completed",
        });
        assertOk(error, "Failed to insert partial refund transaction");
      }

      // Pay earner (THIS WAS YOUR BUG: wallet row missing → skipped)
      await addPendingEarningsUSD(supabase, videoDate.earner_id, finalEarnerAmount);

      // Mark reservation as charged
      {
        const { error } = await supabase
          .from("credit_reservations")
          .update({ status: "charged", released_at: new Date().toISOString() })
          .eq("id", reservation.id);

        assertOk(error, "Failed to mark reservation charged");
      }

      // Update video date finalization
      {
        const { error } = await supabase
          .from("video_dates")
          .update({
            status: "completed",
            credits_charged: creditsToCharge,
            earner_amount: finalEarnerAmount,
            platform_fee: finalPlatformFee,
            completed_at: new Date().toISOString(),
          })
          .eq("id", videoDateId);

        assertOk(error, "Failed to update video_dates completion");
      }

      // Transactions ledger (optional but recommended)
      {
        const { error: seekerTxErr } = await supabase.from("transactions").insert({
          user_id: videoDate.seeker_id,
          transaction_type: "video_date",
          credits_amount: -creditsToCharge,
          usd_amount: -finalUsd,
          description: `${callTypeLabel} call completed (${minutesToCharge} minutes)`,
          status: "completed",
        });
        assertOk(seekerTxErr, "Failed to insert seeker transaction");

        const { error: earnerTxErr } = await supabase.from("transactions").insert({
          user_id: videoDate.earner_id,
          transaction_type: "video_earning",
          credits_amount: 0,
          usd_amount: finalEarnerAmount,
          description: `${callTypeLabel} call earnings`,
          status: "completed",
        });
        assertOk(earnerTxErr, "Failed to insert earner transaction");
      }

      return new Response(
        JSON.stringify({
          success: true,
          credits_charged: creditsToCharge,
          earner_amount: finalEarnerAmount,
          minutes_charged: minutesToCharge,
          credits_refunded: creditsToRefund,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // =============================================================================
    // LEGACY SYSTEM: RPC
    // =============================================================================
    console.log("[charge-video-date] No reservation found — using legacy RPC charge_video_date_transaction");

    const { data: rpcResult, error: rpcError } = await supabase.rpc("charge_video_date_transaction", {
      p_video_date_id: videoDateId,
      p_seeker_id: videoDate.seeker_id,
      p_earner_id: videoDate.earner_id,
      p_credits_charged: creditsToCharge,
      p_earner_amount: finalEarnerAmount,
      p_platform_fee: finalPlatformFee,
      p_usd_amount: finalUsd,
    });

    assertOk(rpcError, "Failed to process payment (RPC)");

    if (!rpcResult?.success) {
      throw new Error(rpcResult?.error || "Transaction failed (RPC)");
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