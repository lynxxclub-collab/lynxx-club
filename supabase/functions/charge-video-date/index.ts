// deno-lint-ignore-file no-explicit-any
// @ts-ignore: Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

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

const CREDIT_TO_USD = 0.1;     // 1 credit = $0.10
const PLATFORM_FEE_PCT = 0.3;  // 30%
const MIN_VIDEO_CREDITS = 200;
const MAX_VIDEO_CREDITS = 900;

async function atomicAddWalletCredits(
  supabase: any,
  userId: string,
  field: "credit_balance" | "pending_earnings",
  delta: number
) {
  // Ensure wallet row exists
  await supabase.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id" });

  // Atomic increment
  const { error } = await supabase.rpc("wallet_atomic_increment", {
    p_user_id: userId,
    p_field: field,
    p_amount: delta,
  });

  if (error) throw new Error(`Wallet update failed: ${error.message}`);
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Deno global is available in Deno runtime
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

    const supabase = createClient(supabaseUrl, serviceKey);

    const cronSecret = req.headers.get("x-cron-secret");
    const isCron = !!cronSecret && cronSecret === CRON_SECRET;

    // If not cron, require user auth
    let callerUserId: string | null = null;
    if (!isCron) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Missing authorization header");

      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(jwt);
      if (error || !user) throw new Error("Unauthorized");
      callerUserId = user.id;
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
      if (videoDate.seeker_id !== callerUserId && videoDate.earner_id !== callerUserId) {
        throw new Error("Unauthorized to charge this video date");
      }
    }

    // Idempotency: already completed/charged
    if (videoDate.status === "completed" && videoDate.credits_charged) {
      return new Response(
        JSON.stringify({ success: true, message: "Already processed", credits_charged: videoDate.credits_charged }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Validate reserved credits
    if (videoDate.credits_reserved < MIN_VIDEO_CREDITS || videoDate.credits_reserved > MAX_VIDEO_CREDITS) {
      throw new Error(`Video date credits must be between ${MIN_VIDEO_CREDITS} and ${MAX_VIDEO_CREDITS}`);
    }

    const scheduledMinutes = Number(videoDate.scheduled_duration || 15);

    const actualStartMs = videoDate.actual_start
      ? new Date(videoDate.actual_start).getTime()
      : new Date(videoDate.scheduled_start).getTime();

    const actualEndMs = actualEnd ? new Date(actualEnd).getTime() : Date.now();

    const actualSeconds = Math.max(0, Math.floor((actualEndMs - actualStartMs) / 1000));
    const actualMinutes = Math.max(1, Math.ceil(actualSeconds / 60));

    const minutesToCharge = Math.min(actualMinutes, scheduledMinutes);

    const creditsPerMinute = videoDate.credits_per_minute
      ? Number(videoDate.credits_per_minute)
      : Number(videoDate.credits_reserved) / scheduledMinutes;

    const creditsToCharge = Math.ceil(minutesToCharge * creditsPerMinute);

    const callTypeLabel = videoDate.call_type === "audio" ? "Audio" : "Video";

    const usdAmount = creditsToCharge * CREDIT_TO_USD;
    const platformFee = usdAmount * PLATFORM_FEE_PCT;
    const earnerAmount = usdAmount - platformFee;

    const finalUsd = Number(usdAmount.toFixed(2));
    const finalPlatformFee = Number(platformFee.toFixed(2));
    const finalEarnerAmount = Number(earnerAmount.toFixed(2));

    // Update actual_end early
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
      .single();

    if (reservation) {
      const creditsToRefund = Number(reservation.credits_amount) - creditsToCharge;

      // refund unused credits
      if (creditsToRefund > 0) {
        await atomicAddWalletCredits(supabase, videoDate.seeker_id, "credit_balance", creditsToRefund);

        await supabase.from("transactions").insert({
          user_id: videoDate.seeker_id,
          transaction_type: "video_date_partial_refund",
          credits_amount: creditsToRefund,
          description: `Partial refund for shorter call (${minutesToCharge}/${scheduledMinutes} minutes)`,
          status: "completed",
        });
      }

      // pay earner
      await atomicAddWalletCredits(supabase, videoDate.earner_id, "pending_earnings", finalEarnerAmount);

      // mark reservation charged
      await supabase
        .from("credit_reservations")
        .update({ status: "charged", released_at: new Date().toISOString() })
        .eq("id", reservation.id);

      // finalize video date
      await supabase
        .from("video_dates")
        .update({
          status: "completed",
          credits_charged: creditsToCharge,
          earner_amount: finalEarnerAmount,
          platform_fee: finalPlatformFee,
          completed_at: new Date().toISOString(),
        })
        .eq("id", videoDateId);

      // ledger
      await supabase.from("transactions").insert([
        {
          user_id: videoDate.seeker_id,
          transaction_type: "video_date",
          credits_amount: -creditsToCharge,
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
          credits_charged: creditsToCharge,
          earner_amount: finalEarnerAmount,
          platform_fee: finalPlatformFee,
          minutes_charged: minutesToCharge,
          credits_refunded: Math.max(0, creditsToRefund),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Legacy fallback
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