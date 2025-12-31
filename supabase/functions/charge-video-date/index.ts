import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

// Input validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

function validateISODate(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO date`);
  }
  // Check for reasonable date range (not more than 1 day in past/future from now)
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  if (date.getTime() < now - oneDay || date.getTime() > now + oneDay) {
    throw new Error(`${fieldName} must be within 24 hours of current time`);
  }
  return value;
}

const CREDIT_TO_USD = 0.1;
const PLATFORM_FEE_PCT = 0.3;
const MIN_VIDEO_CREDITS = 200;
const MAX_VIDEO_CREDITS = 900;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Verify the user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse and validate input
    const body = await req.json();
    const videoDateId = validateUUID(body.videoDateId, "videoDateId");
    const actualEnd = validateISODate(body.actualEnd, "actualEnd");

    console.log(`Processing charge for video date: ${videoDateId}`);

    // Get video date details
    const { data: videoDate, error: fetchError } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .single();

    if (fetchError || !videoDate) {
      throw new Error("Video date not found");
    }

    // Verify user is part of this video date
    if (videoDate.seeker_id !== user.id && videoDate.earner_id !== user.id) {
      throw new Error("Unauthorized to charge this video date");
    }

    // Check if already processed
    if (videoDate.status === "completed" && videoDate.credits_charged) {
      console.log("Video date already charged, skipping");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Already processed",
          credits_charged: videoDate.credits_charged,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Validate reserved credits are within allowed range
    if (videoDate.credits_reserved < MIN_VIDEO_CREDITS || videoDate.credits_reserved > MAX_VIDEO_CREDITS) {
      console.error(
        `Invalid credits_reserved: ${videoDate.credits_reserved}, must be ${MIN_VIDEO_CREDITS}-${MAX_VIDEO_CREDITS}`,
      );
      throw new Error(`Video date credits must be between ${MIN_VIDEO_CREDITS} and ${MAX_VIDEO_CREDITS}`);
    }

    // Get actual times
    const actualStartTime = videoDate.actual_start
      ? new Date(videoDate.actual_start).getTime()
      : new Date(videoDate.scheduled_start).getTime();

    const actualEndTime = actualEnd ? new Date(actualEnd).getTime() : Date.now();

    // Calculate actual duration in seconds
    const actualSeconds = Math.floor((actualEndTime - actualStartTime) / 1000);

    // Convert to minutes (round up, minimum 1 minute)
    const actualMinutes = Math.max(1, Math.ceil(actualSeconds / 60));

    console.log(`Actual duration: ${actualMinutes} minutes (${actualSeconds} seconds)`);

    // Calculate credits to charge
    const scheduledMinutes = videoDate.scheduled_duration;
    const creditsPerMinute = videoDate.credits_reserved / scheduledMinutes;

    // Charge for actual time, up to scheduled maximum
    const minutesToCharge = Math.min(actualMinutes, scheduledMinutes);
    const creditsToCharge = Math.ceil(minutesToCharge * creditsPerMinute);

    console.log(`Charging ${creditsToCharge} credits for ${minutesToCharge} minutes`);

    // Calculate USD amounts with 70/30 split
    const usdAmount = creditsToCharge * CREDIT_TO_USD;
    const platformFee = usdAmount * PLATFORM_FEE_PCT;
    const earnerAmount = usdAmount - platformFee;

    // Round to 2 decimals
    const finalUsd = Number(usdAmount.toFixed(2));
    const finalPlatformFee = Number(platformFee.toFixed(2));
    const finalEarnerAmount = Number(earnerAmount.toFixed(2));

    console.log(`USD: $${finalUsd}, Platform fee: $${finalPlatformFee}, Earner: $${finalEarnerAmount}`);

    // Update actual_end
    await supabase
      .from("video_dates")
      .update({ actual_end: new Date(actualEndTime).toISOString() })
      .eq("id", videoDateId);

    // Check if there's an active reservation (new system)
    const { data: reservation } = await supabase
      .from("credit_reservations")
      .select("*")
      .eq("video_date_id", videoDateId)
      .eq("status", "active")
      .single();

    if (reservation) {
      console.log("Using credit reservation system");

      // Credits were already deducted during reservation
      // Calculate any partial refund if call was shorter than booked
      const creditsToRefund = reservation.credits_amount - creditsToCharge;

      if (creditsToRefund > 0) {
        console.log(`Refunding ${creditsToRefund} unused credits`);

        // Refund unused portion to wallet (source of truth)
        const { data: seekerWallet } = await supabase
          .from("wallets")
          .select("credit_balance")
          .eq("user_id", videoDate.seeker_id)
          .single();

        if (seekerWallet) {
          await supabase
            .from("wallets")
            .update({
              credit_balance: (seekerWallet.credit_balance || 0) + creditsToRefund,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", videoDate.seeker_id);
        }

        // Record partial refund transaction
        await supabase.from("transactions").insert({
          user_id: videoDate.seeker_id,
          transaction_type: "video_date_partial_refund",
          credits_amount: creditsToRefund,
          description: `Partial refund for shorter call (${minutesToCharge}/${scheduledMinutes} minutes)`,
          status: "completed",
        });
      }

      // Add earnings to earner's wallet (pending_earnings)
      const { data: earnerWallet } = await supabase
        .from("wallets")
        .select("pending_earnings")
        .eq("user_id", videoDate.earner_id)
        .single();

      if (earnerWallet) {
        await supabase
          .from("wallets")
          .update({
            pending_earnings: (earnerWallet.pending_earnings || 0) + finalEarnerAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", videoDate.earner_id);
      }

      // Mark reservation as charged
      await supabase
        .from("credit_reservations")
        .update({ status: "charged", released_at: new Date().toISOString() })
        .eq("id", reservation.id);

      // Update video date
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

      // Create transaction for seeker
      await supabase.from("transactions").insert({
        user_id: videoDate.seeker_id,
        transaction_type: "video_date",
        credits_amount: -creditsToCharge,
        usd_amount: -finalUsd,
        description: `Video date completed (${minutesToCharge} minutes)`,
        status: "completed",
      });

      // Create transaction for earner
      await supabase.from("transactions").insert({
        user_id: videoDate.earner_id,
        transaction_type: "video_earning",
        credits_amount: 0,
        usd_amount: finalEarnerAmount,
        description: "Video date earnings",
        status: "completed",
      });

      console.log("Charge completed via reservation system");

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

    // Fallback: No reservation found, use the old RPC method
    console.log("No reservation found, using legacy charge method");

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
      console.error("RPC error:", rpcError);
      throw new Error("Failed to process payment");
    }

    console.log("Charge result:", result);

    if (!result.success) {
      throw new Error(result.error || "Transaction failed");
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
    console.error("Error charging video date:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
