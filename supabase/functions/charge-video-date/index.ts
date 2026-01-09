import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse, createErrorResponse } from "../_shared/errors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { calculateEarnings } from "../_shared/pricing.ts";

// =============================================================================
// CONFIGURATION
// =============================================================================
const CONFIG = {
  credits: {
    minVideo: 200,
    maxVideo: 900,
  },
  defaultDurationMinutes: 15,
  minChargeMinutes: 1,
  maxRetries: 2,
  retryDelayMs: 100,
} as const;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// =============================================================================
// TYPES
// =============================================================================
interface VideoDate {
  id: string;
  seeker_id: string;
  earner_id: string;
  status: string;
  call_type: "video" | "audio";
  scheduled_start: string;
  scheduled_duration: number;
  actual_start: string | null;
  actual_end: string | null;
  credits_reserved: number;
  credits_per_minute: number | null;
  credits_charged: number | null;
  earner_amount: number | null;
  platform_fee: number | null;
}

interface CreditReservation {
  id: string;
  video_date_id: string;
  user_id: string;
  credits_amount: number;
  status: "active" | "charged" | "released" | "expired";
}

interface WalletRecord {
  user_id: string;
  credit_balance: number;
  pending_earnings: number;
}

interface ChargeResult {
  creditsCharged: number;
  creditsRefunded: number;
  earnerAmount: number;
  platformFee: number;
  minutesCharged: number;
  grossUsd: number;
}

interface RequestBody {
  videoDateId?: string;
  actualEnd?: string;
}

// =============================================================================
// STRUCTURED LOGGING
// =============================================================================
interface LogContext {
  requestId: string;
  userId?: string;
  videoDateId?: string;
  isCron?: boolean;
  [key: string]: unknown;
}

const createLogger = (requestId: string) => {
  const baseContext: LogContext = { requestId };

  return {
    setContext: (ctx: Partial<LogContext>) => {
      Object.assign(baseContext, ctx);
    },
    info: (step: string, details?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: "INFO",
        service: "charge-video-date",
        step,
        ...baseContext,
        ...details,
        timestamp: new Date().toISOString(),
      }));
    },
    warn: (step: string, details?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: "WARN",
        service: "charge-video-date",
        step,
        ...baseContext,
        ...details,
        timestamp: new Date().toISOString(),
      }));
    },
    error: (step: string, error: unknown, details?: Record<string, unknown>) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(JSON.stringify({
        level: "ERROR",
        service: "charge-video-date",
        step,
        error: errorMessage,
        stack: errorStack,
        ...baseContext,
        ...details,
        timestamp: new Date().toISOString(),
      }));
    },
  };
};

type Logger = ReturnType<typeof createLogger>;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
const generateRequestId = (): string => {
  return `cvd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function getRequiredEnv(name: string, logger: Logger): string {
  const value = Deno.env.get(name);
  if (!value) {
    logger.error("missing_env_var", new Error(`Missing: ${name}`), { envVar: name });
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

function isValidISODate(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

// =============================================================================
// VALIDATION
// =============================================================================
interface ValidationResult {
  valid: true;
  videoDateId: string;
  actualEnd: string | null;
}

interface ValidationError {
  valid: false;
  error: string;
  code: string;
}

function validateRequest(body: RequestBody): ValidationResult | ValidationError {
  const { videoDateId, actualEnd } = body;

  if (!videoDateId || typeof videoDateId !== "string") {
    return { valid: false, error: "videoDateId is required", code: "missing_video_date_id" };
  }

  if (!isValidUUID(videoDateId)) {
    return { valid: false, error: "Invalid videoDateId format", code: "invalid_video_date_id" };
  }

  let parsedActualEnd: string | null = null;

  if (actualEnd !== undefined && actualEnd !== null) {
    if (typeof actualEnd !== "string") {
      return { valid: false, error: "actualEnd must be a string", code: "invalid_actual_end" };
    }

    if (!isValidISODate(actualEnd)) {
      return { valid: false, error: "actualEnd must be a valid ISO date", code: "invalid_actual_end" };
    }

    parsedActualEnd = actualEnd;
  }

  return { valid: true, videoDateId, actualEnd: parsedActualEnd };
}

// =============================================================================
// BILLING CALCULATIONS
// =============================================================================
function calculateChargeDetails(
  videoDate: VideoDate,
  actualEndOverride: string | null,
  logger: Logger
): { creditsToCharge: number; minutesToCharge: number; creditsPerMinute: number } {
  const reserved = Number(videoDate.credits_reserved);

  if (!Number.isFinite(reserved) || reserved < CONFIG.credits.minVideo || reserved > CONFIG.credits.maxVideo) {
    logger.error("invalid_reserved_credits", new Error("Invalid reserved credits"), {
      reserved,
      min: CONFIG.credits.minVideo,
      max: CONFIG.credits.maxVideo,
    });
    throw new Error(`Video date credits must be between ${CONFIG.credits.minVideo} and ${CONFIG.credits.maxVideo}`);
  }

  // Scheduled duration
  const scheduledMinutesRaw = Number(videoDate.scheduled_duration || CONFIG.defaultDurationMinutes);
  const scheduledMinutes = Number.isFinite(scheduledMinutesRaw) && scheduledMinutesRaw > 0
    ? scheduledMinutesRaw
    : CONFIG.defaultDurationMinutes;

  // Actual duration calculation
  const actualStartMs = videoDate.actual_start
    ? new Date(videoDate.actual_start).getTime()
    : new Date(videoDate.scheduled_start).getTime();

  const actualEndMs = actualEndOverride
    ? new Date(actualEndOverride).getTime()
    : Date.now();

  const actualSeconds = Math.max(0, Math.floor((actualEndMs - actualStartMs) / 1000));
  const actualMinutes = Math.max(CONFIG.minChargeMinutes, Math.ceil(actualSeconds / 60));

  // Charge for actual usage, capped at scheduled
  const minutesToCharge = Math.min(actualMinutes, scheduledMinutes);

  // Calculate per-minute rate
  const creditsPerMinute = videoDate.credits_per_minute
    ? Number(videoDate.credits_per_minute)
    : reserved / scheduledMinutes;

  if (!Number.isFinite(creditsPerMinute) || creditsPerMinute <= 0) {
    logger.error("invalid_credits_per_minute", new Error("Invalid rate"), { creditsPerMinute, reserved, scheduledMinutes });
    throw new Error("Invalid credits per minute calculation");
  }

  // Calculate credits, capped to reserved amount
  const creditsToCharge = Math.min(Math.ceil(minutesToCharge * creditsPerMinute), reserved);

  if (!Number.isFinite(creditsToCharge) || creditsToCharge <= 0) {
    logger.error("invalid_credits_to_charge", new Error("Invalid charge amount"), { creditsToCharge, minutesToCharge, creditsPerMinute });
    throw new Error("Invalid credits to charge");
  }

  logger.info("charge_calculated", {
    reserved,
    scheduledMinutes,
    actualMinutes,
    minutesToCharge,
    creditsPerMinute,
    creditsToCharge,
  });

  return { creditsToCharge, minutesToCharge, creditsPerMinute };
}

// =============================================================================
// WALLET OPERATIONS
// =============================================================================
async function ensureWalletExists(
  supabase: SupabaseClient,
  userId: string,
  logger: Logger
): Promise<void> {
  const { error } = await supabase
    .from("wallets")
    .upsert(
      { user_id: userId, credit_balance: 0, pending_earnings: 0 },
      { onConflict: "user_id" }
    );

  if (error) {
    // Ignore duplicate key errors
    const code = (error as { code?: string }).code;
    if (code !== "23505") {
      logger.error("wallet_upsert_failed", error, { userId });
      throw new Error(`Failed to ensure wallet exists: ${error.message}`);
    }
  }
}

async function atomicWalletIncrement(
  supabase: SupabaseClient,
  userId: string,
  field: "credit_balance" | "pending_earnings",
  delta: number,
  logger: Logger
): Promise<void> {
  // Ensure wallet exists first
  await ensureWalletExists(supabase, userId, logger);

  // Try RPC first (most reliable)
  const { error: rpcError } = await supabase.rpc("wallet_atomic_increment", {
    p_user_id: userId,
    p_field: field,
    p_amount: delta,
  });

  if (!rpcError) {
    logger.info("wallet_updated_rpc", { userId, field, delta });
    return;
  }

  logger.info("rpc_unavailable_using_cas", { error: rpcError.message });

  // Fallback: CAS-style update with retries
  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    const { data: wallet, error: readError } = await supabase
      .from("wallets")
      .select("credit_balance, pending_earnings")
      .eq("user_id", userId)
      .single();

    if (readError || !wallet) {
      logger.error("wallet_read_failed", readError, { userId, attempt });
      throw new Error(`Failed to read wallet: ${readError?.message || "Not found"}`);
    }

    const currentValue = Number((wallet as WalletRecord)[field] ?? 0);
    const newValue = field === "pending_earnings"
      ? Number((currentValue + delta).toFixed(2))
      : currentValue + delta;

    const { data: updated, error: updateError } = await supabase
      .from("wallets")
      .update({ [field]: newValue, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq(field, currentValue)
      .select(field);

    if (updateError) {
      logger.error("wallet_update_failed", updateError, { userId, field, attempt });
      throw new Error(`Failed to update wallet: ${updateError.message}`);
    }

    if (updated && updated.length === 1) {
      logger.info("wallet_updated_cas", { userId, field, delta, newValue });
      return;
    }

    // CAS failed, retry
    if (attempt < CONFIG.maxRetries) {
      await sleep(CONFIG.retryDelayMs * (attempt + 1));
      logger.info("wallet_cas_retry", { userId, field, attempt: attempt + 1 });
    }
  }

  throw new Error("Wallet update failed due to contention. Please retry.");
}

// =============================================================================
// RESERVATION OPERATIONS
// =============================================================================
async function findActiveReservation(
  supabase: SupabaseClient,
  videoDateId: string,
  logger: Logger
): Promise<CreditReservation | null> {
  const { data, error } = await supabase
    .from("credit_reservations")
    .select("id, video_date_id, user_id, credits_amount, status")
    .eq("video_date_id", videoDateId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    logger.warn("reservation_fetch_failed", { error: error.message, videoDateId });
    return null;
  }

  return data as CreditReservation | null;
}

async function findChargedReservation(
  supabase: SupabaseClient,
  videoDateId: string,
  logger: Logger
): Promise<CreditReservation | null> {
  const { data, error } = await supabase
    .from("credit_reservations")
    .select("id, video_date_id, user_id, credits_amount, status")
    .eq("video_date_id", videoDateId)
    .eq("status", "charged")
    .maybeSingle();

  if (error) {
    logger.warn("charged_reservation_check_failed", { error: error.message, videoDateId });
    return null;
  }

  return data as CreditReservation | null;
}

async function markReservationCharged(
  supabase: SupabaseClient,
  reservationId: string,
  logger: Logger
): Promise<void> {
  const { error } = await supabase
    .from("credit_reservations")
    .update({ status: "charged", released_at: new Date().toISOString() })
    .eq("id", reservationId)
    .eq("status", "active");

  if (error) {
    logger.error("reservation_charge_failed", error, { reservationId });
    throw new Error(`Failed to mark reservation charged: ${error.message}`);
  }

  logger.info("reservation_marked_charged", { reservationId });
}

// =============================================================================
// CHARGE PROCESSING
// =============================================================================
async function processReservationCharge(
  supabase: SupabaseClient,
  videoDate: VideoDate,
  reservation: CreditReservation,
  chargeDetails: { creditsToCharge: number; minutesToCharge: number },
  logger: Logger
): Promise<ChargeResult> {
  const { creditsToCharge, minutesToCharge } = chargeDetails;
  const reservedCredits = Number(reservation.credits_amount);
  const creditsToRefund = Math.max(0, reservedCredits - creditsToCharge);

  // Calculate earnings split
  const { grossUsd, creatorUsd: earnerAmount, platformUsd: platformFee } = calculateEarnings(creditsToCharge);

  logger.info("processing_reservation_charge", {
    reservationId: reservation.id,
    reservedCredits,
    creditsToCharge,
    creditsToRefund,
    earnerAmount,
    platformFee,
  });

  // Step 1: Refund unused credits to seeker
  if (creditsToRefund > 0) {
    await atomicWalletIncrement(supabase, videoDate.seeker_id, "credit_balance", creditsToRefund, logger);

    // Record refund transaction (non-critical)
    const { error: refundTxError } = await supabase
      .from("transactions")
      .insert({
        user_id: videoDate.seeker_id,
        transaction_type: "video_date_partial_refund",
        credits_amount: creditsToRefund,
        description: `Partial refund: ${minutesToCharge}/${videoDate.scheduled_duration} minutes used, video_date_id=${videoDate.id}`,
        status: "completed",
      });

    if (refundTxError) {
      logger.warn("refund_transaction_insert_failed", { error: refundTxError.message });
    }
  }

  // Step 2: Credit earner's pending earnings
  await atomicWalletIncrement(supabase, videoDate.earner_id, "pending_earnings", earnerAmount, logger);

  // Step 3: Mark reservation as charged
  await markReservationCharged(supabase, reservation.id, logger);

  // Step 4: Finalize video date
  const { error: vdUpdateError } = await supabase
    .from("video_dates")
    .update({
      status: "completed",
      credits_charged: creditsToCharge,
      earner_amount: earnerAmount,
      platform_fee: platformFee,
      completed_at: new Date().toISOString(),
    })
    .eq("id", videoDate.id);

  if (vdUpdateError) {
    logger.error("video_date_finalize_failed", vdUpdateError, { videoDateId: videoDate.id });
    throw new Error(`Failed to finalize video date: ${vdUpdateError.message}`);
  }

  // Step 5: Record audit transactions (non-critical)
  const callTypeLabel = videoDate.call_type === "audio" ? "Audio" : "Video";

  const { error: txError } = await supabase.from("transactions").insert([
    {
      user_id: videoDate.seeker_id,
      transaction_type: "video_date",
      credits_amount: -creditsToCharge,
      usd_amount: -grossUsd,
      description: `${callTypeLabel} call completed (${minutesToCharge} min), video_date_id=${videoDate.id}`,
      status: "completed",
    },
    {
      user_id: videoDate.earner_id,
      transaction_type: "video_earning",
      credits_amount: 0,
      usd_amount: earnerAmount,
      description: `${callTypeLabel} call earnings, video_date_id=${videoDate.id}`,
      status: "completed",
    },
  ]);

  if (txError) {
    logger.warn("audit_transactions_failed", { error: txError.message });
  }

  return {
    creditsCharged: creditsToCharge,
    creditsRefunded: creditsToRefund,
    earnerAmount,
    platformFee,
    minutesCharged: minutesToCharge,
    grossUsd,
  };
}

async function processLegacyCharge(
  supabase: SupabaseClient,
  videoDate: VideoDate,
  chargeDetails: { creditsToCharge: number; minutesToCharge: number },
  logger: Logger
): Promise<ChargeResult> {
  const { creditsToCharge, minutesToCharge } = chargeDetails;
  const { grossUsd, creatorUsd: earnerAmount, platformUsd: platformFee } = calculateEarnings(creditsToCharge);

  logger.info("processing_legacy_charge", { videoDateId: videoDate.id, creditsToCharge });

  // Use database transaction RPC for atomicity
  const { data: result, error: rpcError } = await supabase.rpc("charge_video_date_transaction", {
    p_video_date_id: videoDate.id,
    p_seeker_id: videoDate.seeker_id,
    p_earner_id: videoDate.earner_id,
    p_credits_charged: creditsToCharge,
    p_earner_amount: earnerAmount,
    p_platform_fee: platformFee,
    p_usd_amount: grossUsd,
  });

  if (rpcError) {
    logger.error("legacy_charge_rpc_failed", rpcError, { videoDateId: videoDate.id });
    throw new Error(`Failed to process payment: ${rpcError.message}`);
  }

  const rpcResult = result as { success: boolean; error?: string } | null;

  if (!rpcResult?.success) {
    throw new Error(rpcResult?.error || "Transaction failed");
  }

  return {
    creditsCharged: creditsToCharge,
    creditsRefunded: 0,
    earnerAmount,
    platformFee,
    minutesCharged: minutesToCharge,
    grossUsd,
  };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
serve(async (req: Request): Promise<Response> => {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  const corsHeaders = getCorsHeaders(req);
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  logger.info("request_started");

  try {
    // Load environment
    let supabaseUrl: string;
    let supabaseServiceKey: string;

    try {
      supabaseUrl = getRequiredEnv("SUPABASE_URL", logger);
      supabaseServiceKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", logger);
    } catch {
      return createErrorResponse("Server configuration error", "config_error", corsHeaders, 500);
    }

    const cronSecret = Deno.env.get("CRON_SECRET") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    // Determine caller (cron or user)
    const requestCronSecret = req.headers.get("x-cron-secret");
    const isCron = !!requestCronSecret && requestCronSecret === cronSecret && cronSecret.length > 0;

    logger.setContext({ isCron });

    let callerUserId: string | null = null;

    if (!isCron) {
      const { user, error: authError } = await verifyAuth(req);

      if (authError || !user) {
        // Fallback for misconfigured auth
        if (authError === "Server auth misconfigured") {
          const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
          if (!authHeader) {
            return createErrorResponse("Missing authorization header", "unauthorized", corsHeaders, 401);
          }

          const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
          const { data: { user: fallbackUser }, error: fallbackError } = await supabase.auth.getUser(jwt);

          if (fallbackError || !fallbackUser) {
            return createErrorResponse("Unauthorized", "unauthorized", corsHeaders, 401);
          }

          callerUserId = fallbackUser.id;
          logger.warn("auth_fallback_used", { callerUserId });
        } else {
          return createErrorResponse("Unauthorized", "unauthorized", corsHeaders, 401);
        }
      } else {
        callerUserId = user.id;
      }

      logger.setContext({ userId: callerUserId });
    }

    logger.info("caller_authenticated", { isCron, callerUserId });

    // Parse and validate request
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", "invalid_json", corsHeaders, 400);
    }

    const validation = validateRequest(body);
    if (!validation.valid) {
      return createErrorResponse(validation.error, validation.code, corsHeaders, 400);
    }

    const { videoDateId, actualEnd } = validation;
    logger.setContext({ videoDateId });
    logger.info("input_validated");

    // Fetch video date
    const { data: videoDate, error: fetchError } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .single();

    if (fetchError || !videoDate) {
      logger.error("video_date_not_found", fetchError, { videoDateId });
      return createErrorResponse("Video date not found", "not_found", corsHeaders, 404);
    }

    const vd = videoDate as VideoDate;
    logger.info("video_date_fetched", { status: vd.status, seekerId: vd.seeker_id, earnerId: vd.earner_id });

    // Authorization (if not cron)
    if (!isCron) {
      if (!callerUserId || (vd.seeker_id !== callerUserId && vd.earner_id !== callerUserId)) {
        logger.warn("forbidden_access", { callerUserId, seekerId: vd.seeker_id, earnerId: vd.earner_id });
        return createErrorResponse("Unauthorized to charge this video date", "forbidden", corsHeaders, 403);
      }
    }

    // Idempotency: Already completed and charged
    if (vd.status === "completed" && vd.credits_charged) {
      logger.info("already_completed", { creditsCharged: vd.credits_charged });
      return new Response(
        JSON.stringify({
          success: true,
          message: "Already processed",
          creditsCharged: vd.credits_charged,
          earnerAmount: vd.earner_amount,
          platformFee: vd.platform_fee,
          requestId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Idempotency: Reservation already charged
    const chargedReservation = await findChargedReservation(supabase, videoDateId, logger);
    if (chargedReservation) {
      logger.info("reservation_already_charged", { reservationId: chargedReservation.id });
      return new Response(
        JSON.stringify({
          success: true,
          message: "Already processed",
          requestId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Calculate charge details
    const chargeDetails = calculateChargeDetails(vd, actualEnd, logger);

    // Update actual_end early (non-financial, best effort)
    const actualEndMs = actualEnd ? new Date(actualEnd).getTime() : Date.now();
    await supabase
      .from("video_dates")
      .update({ actual_end: new Date(actualEndMs).toISOString() })
      .eq("id", videoDateId);

    // Process charge
    let result: ChargeResult;

    const activeReservation = await findActiveReservation(supabase, videoDateId, logger);

    if (activeReservation) {
      logger.info("using_reservation_flow", { reservationId: activeReservation.id });
      result = await processReservationCharge(supabase, vd, activeReservation, chargeDetails, logger);
    } else {
      logger.info("using_legacy_flow");
      result = await processLegacyCharge(supabase, vd, chargeDetails, logger);
    }

    const duration = Date.now() - startTime;
    logger.info("request_completed", {
      durationMs: duration,
      creditsCharged: result.creditsCharged,
      earnerAmount: result.earnerAmount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        creditsCharged: result.creditsCharged,
        creditsRefunded: result.creditsRefunded,
        earnerAmount: result.earnerAmount,
        platformFee: result.platformFee,
        minutesCharged: result.minutesCharged,
        requestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    logger.error("request_failed", error, { durationMs: duration });
    return createAutoErrorResponse(error, corsHeaders);
  }
});
