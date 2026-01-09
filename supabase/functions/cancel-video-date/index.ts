import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse, createErrorResponse } from "../_shared/errors.ts";
import { verifyAuth } from "../_shared/auth.ts";

// =============================================================================
// CONFIGURATION
// =============================================================================
const CONFIG = {
  daily: {
    apiUrl: "https://api.daily.co/v1",
    requestTimeoutMs: 5_000,
  },
  maxRetries: 2,
  retryDelayMs: 100,
  notificationTimeoutMs: 3_000,
} as const;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CANCELLATION_REASONS = ["user_cancelled", "no_show", "technical"] as const;
type CancellationReason = typeof CANCELLATION_REASONS[number];

const CANCELLED_STATUSES = ["cancelled", "cancelled_no_show", "no_show"] as const;
const NON_CANCELLABLE_STATUSES = ["completed"] as const;

// =============================================================================
// TYPES
// =============================================================================
interface VideoDate {
  id: string;
  seeker_id: string;
  earner_id: string;
  status: string;
  daily_room_url: string | null;
  credits_reserved: number | null;
}

interface CreditReservation {
  id: string;
  user_id: string;
  credits_amount: number;
  status: string;
}

interface WalletRecord {
  user_id: string;
  credit_balance: number;
}

interface RequestBody {
  videoDateId?: string;
  reason?: string;
}

interface CancelResult {
  creditsRefunded: number;
  reservationsReleased: number;
}

// =============================================================================
// STRUCTURED LOGGING
// =============================================================================
interface LogContext {
  requestId: string;
  userId?: string;
  videoDateId?: string;
  reason?: string;
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
        service: "cancel-video-date",
        step,
        ...baseContext,
        ...details,
        timestamp: new Date().toISOString(),
      }));
    },
    warn: (step: string, details?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: "WARN",
        service: "cancel-video-date",
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
        service: "cancel-video-date",
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
  return `cnl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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

function isValidCancellationReason(value: string): value is CancellationReason {
  return CANCELLATION_REASONS.includes(value as CancellationReason);
}

// =============================================================================
// VALIDATION
// =============================================================================
interface ValidationResult {
  valid: true;
  videoDateId: string;
  reason: CancellationReason;
}

interface ValidationError {
  valid: false;
  error: string;
  code: string;
}

function validateRequest(body: RequestBody): ValidationResult | ValidationError {
  const { videoDateId, reason } = body;

  if (!videoDateId || typeof videoDateId !== "string") {
    return { valid: false, error: "videoDateId is required", code: "missing_video_date_id" };
  }

  if (!isValidUUID(videoDateId)) {
    return { valid: false, error: "Invalid videoDateId format", code: "invalid_video_date_id" };
  }

  if (!reason || typeof reason !== "string") {
    return { valid: false, error: "reason is required", code: "missing_reason" };
  }

  if (!isValidCancellationReason(reason)) {
    return {
      valid: false,
      error: `reason must be one of: ${CANCELLATION_REASONS.join(", ")}`,
      code: "invalid_reason",
    };
  }

  return { valid: true, videoDateId, reason };
}

// =============================================================================
// DAILY.CO OPERATIONS
// =============================================================================
async function deleteDailyRoom(
  apiKey: string,
  roomUrl: string,
  logger: Logger
): Promise<void> {
  const roomName = roomUrl.split("/").pop();
  if (!roomName) {
    logger.warn("invalid_room_url", { roomUrl });
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.daily.requestTimeoutMs);

    const response = await fetch(`${CONFIG.daily.apiUrl}/rooms/${roomName}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 404) {
      logger.info("daily_room_deleted", { roomName });
    } else {
      logger.warn("daily_room_delete_failed", { roomName, status: response.status });
    }
  } catch (error) {
    // Non-critical: log but don't fail
    logger.warn("daily_room_delete_error", { roomName, error: (error as Error).message });
  }
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
    const code = (error as { code?: string }).code;
    if (code !== "23505") {
      logger.error("wallet_upsert_failed", error, { userId });
      throw new Error(`Failed to ensure wallet exists: ${error.message}`);
    }
  }
}

async function atomicAddCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  logger: Logger
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) {
    logger.warn("invalid_refund_amount", { userId, amount });
    return;
  }

  // Ensure wallet exists
  await ensureWalletExists(supabase, userId, logger);

  // Try RPC first
  const { error: rpcError } = await supabase.rpc("wallet_atomic_increment", {
    p_user_id: userId,
    p_field: "credit_balance",
    p_amount: amount,
  });

  if (!rpcError) {
    logger.info("credits_refunded_rpc", { userId, amount });
    return;
  }

  logger.info("rpc_unavailable_using_cas", { error: rpcError.message });

  // CAS fallback with retries
  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    const { data: wallet, error: readError } = await supabase
      .from("wallets")
      .select("credit_balance")
      .eq("user_id", userId)
      .single();

    if (readError || !wallet) {
      logger.error("wallet_read_failed", readError, { userId, attempt });
      throw new Error(`Failed to read wallet: ${readError?.message || "Not found"}`);
    }

    const currentBalance = Number((wallet as WalletRecord).credit_balance ?? 0);
    const newBalance = currentBalance + amount;

    const { data: updated, error: updateError } = await supabase
      .from("wallets")
      .update({ credit_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("credit_balance", currentBalance)
      .select("credit_balance");

    if (updateError) {
      logger.error("wallet_update_failed", updateError, { userId, attempt });
      throw new Error(`Failed to update wallet: ${updateError.message}`);
    }

    if (updated && updated.length === 1) {
      logger.info("credits_refunded_cas", { userId, amount, newBalance });
      return;
    }

    // CAS failed, retry
    if (attempt < CONFIG.maxRetries) {
      await sleep(CONFIG.retryDelayMs * (attempt + 1));
      logger.info("wallet_cas_retry", { userId, attempt: attempt + 1 });
    }
  }

  throw new Error("Failed to refund credits due to contention. Please retry.");
}

// =============================================================================
// REFUND OPERATIONS
// =============================================================================
async function processRefundViaRpc(
  supabase: SupabaseClient,
  videoDateId: string,
  reason: CancellationReason,
  logger: Logger
): Promise<{ success: boolean; creditsRefunded: number }> {
  const { data, error } = await supabase.rpc("refund_video_date_reservation", {
    p_video_date_id: videoDateId,
    p_reason: reason,
  });

  if (error) {
    logger.info("refund_rpc_failed", { error: error.message });
    return { success: false, creditsRefunded: 0 };
  }

  const result = data as { success: boolean; credits_refunded?: number } | null;

  if (!result?.success) {
    logger.info("refund_rpc_unsuccessful", { result });
    return { success: false, creditsRefunded: 0 };
  }

  const creditsRefunded = Number(result.credits_refunded || 0);
  logger.info("refund_rpc_success", { creditsRefunded });

  return { success: true, creditsRefunded };
}

async function processRefundFallback(
  supabase: SupabaseClient,
  videoDateId: string,
  reason: CancellationReason,
  logger: Logger
): Promise<CancelResult> {
  logger.info("using_refund_fallback");

  const releasedAt = new Date().toISOString();

  // Atomically claim and release active reservations
  const { data: claimed, error: claimError } = await supabase
    .from("credit_reservations")
    .update({ status: "released", released_at: releasedAt })
    .eq("video_date_id", videoDateId)
    .eq("status", "active")
    .select("id, user_id, credits_amount");

  if (claimError) {
    logger.error("reservation_release_failed", claimError, { videoDateId });
    throw new Error(`Failed to release reservations: ${claimError.message}`);
  }

  const reservations = (claimed || []) as CreditReservation[];
  let totalRefunded = 0;

  for (const reservation of reservations) {
    const amount = Number(reservation.credits_amount || 0);
    const userId = reservation.user_id;

    if (!userId || amount <= 0) {
      logger.warn("skipping_invalid_reservation", { reservationId: reservation.id, userId, amount });
      continue;
    }

    try {
      // Refund credits to user
      await atomicAddCredits(supabase, userId, amount, logger);
      totalRefunded += amount;

      // Record transaction (non-critical)
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: userId,
        transaction_type: "video_date_refund",
        credits_amount: amount,
        description: `Credits refunded (${reason}), video_date_id=${videoDateId}`,
        status: "completed",
      });

      if (txError) {
        logger.warn("refund_transaction_insert_failed", { error: txError.message, userId });
      }
    } catch (error) {
      logger.error("reservation_refund_failed", error, { reservationId: reservation.id, userId });
      // Continue processing other reservations
    }
  }

  logger.info("fallback_refund_complete", {
    reservationsReleased: reservations.length,
    totalRefunded,
  });

  return {
    creditsRefunded: totalRefunded,
    reservationsReleased: reservations.length,
  };
}

// =============================================================================
// NOTIFICATION OPERATIONS
// =============================================================================
async function sendNoShowNotification(
  supabase: SupabaseClient,
  recipientId: string,
  senderName: string,
  logger: Logger
): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.notificationTimeoutMs);

    await supabase.functions.invoke("send-notification-email", {
      body: {
        type: "video_date_no_show",
        recipientId,
        senderName,
      },
    });

    clearTimeout(timeoutId);
    logger.info("no_show_notification_sent", { recipientId });
  } catch (error) {
    // Non-critical: log but don't fail
    logger.warn("no_show_notification_failed", { recipientId, error: (error as Error).message });
  }
}

async function getProfileName(
  supabase: SupabaseClient,
  userId: string,
  logger: Logger
): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .single();

  if (error || !data) {
    logger.warn("profile_name_fetch_failed", { userId, error: error?.message });
    return "Your date";
  }

  return (data as { name?: string }).name || "Your date";
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

  // Method check
  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", "method_not_allowed", corsHeaders, 405);
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

    const dailyApiKey = Deno.env.get("DAILY_API_KEY") || null;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    // Authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      logger.warn("auth_failed", { error: authError });
      return createErrorResponse("Unauthorized", "unauthorized", corsHeaders, 401);
    }

    logger.setContext({ userId: user.id });
    logger.info("user_authenticated");

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

    const { videoDateId, reason } = validation;
    logger.setContext({ videoDateId, reason });
    logger.info("input_validated");

    // Fetch video date
    const { data: videoDate, error: fetchError } = await supabase
      .from("video_dates")
      .select("id, seeker_id, earner_id, status, daily_room_url, credits_reserved")
      .eq("id", videoDateId)
      .single();

    if (fetchError || !videoDate) {
      logger.error("video_date_not_found", fetchError, { videoDateId });
      return createErrorResponse("Video date not found", "not_found", corsHeaders, 404);
    }

    const vd = videoDate as VideoDate;
    logger.info("video_date_fetched", { status: vd.status, seekerId: vd.seeker_id, earnerId: vd.earner_id });

    // Authorization: only participants can cancel
    const isSeeker = user.id === vd.seeker_id;
    const isEarner = user.id === vd.earner_id;

    if (!isSeeker && !isEarner) {
      logger.warn("forbidden_access", { userId: user.id, seekerId: vd.seeker_id, earnerId: vd.earner_id });
      return createErrorResponse("Only participants can cancel video dates", "forbidden", corsHeaders, 403);
    }

    // Idempotency: already cancelled
    if (CANCELLED_STATUSES.includes(vd.status as typeof CANCELLED_STATUSES[number])) {
      logger.info("already_cancelled", { status: vd.status });
      return new Response(
        JSON.stringify({
          success: true,
          message: "Already cancelled",
          status: vd.status,
          requestId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Cannot cancel completed video dates
    if (NON_CANCELLABLE_STATUSES.includes(vd.status as typeof NON_CANCELLABLE_STATUSES[number])) {
      logger.info("cannot_cancel_completed", { status: vd.status });
      return createErrorResponse("Cannot cancel completed video date", "invalid_status", corsHeaders, 400);
    }

    // Delete Daily room (non-blocking)
    if (dailyApiKey && vd.daily_room_url) {
      await deleteDailyRoom(dailyApiKey, vd.daily_room_url, logger);
    }

    // Process refund
    let refundResult: CancelResult;

    const rpcResult = await processRefundViaRpc(supabase, videoDateId, reason, logger);

    if (rpcResult.success) {
      refundResult = { creditsRefunded: rpcResult.creditsRefunded, reservationsReleased: 1 };
    } else {
      refundResult = await processRefundFallback(supabase, videoDateId, reason, logger);
    }

    // Mark video date as cancelled
    const cancelledStatus = reason === "no_show" ? "cancelled_no_show" : "cancelled";
    const { error: updateError } = await supabase
      .from("video_dates")
      .update({
        status: cancelledStatus,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        cancelled_by: user.id,
      })
      .eq("id", videoDateId);

    if (updateError) {
      logger.error("video_date_cancel_update_failed", updateError, { videoDateId });
      throw new Error(`Failed to mark video date as cancelled: ${updateError.message}`);
    }

    logger.info("video_date_cancelled", { cancelledStatus });

    // Send no-show notification (non-blocking)
    if (reason === "no_show") {
      const noShowUserId = isSeeker ? vd.earner_id : vd.seeker_id;
      const senderName = await getProfileName(supabase, user.id, logger);
      await sendNoShowNotification(supabase, noShowUserId, senderName, logger);
    }

    const duration = Date.now() - startTime;
    logger.info("request_completed", {
      durationMs: duration,
      creditsRefunded: refundResult.creditsRefunded,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Video date cancelled",
        status: cancelledStatus,
        creditsRefunded: refundResult.creditsRefunded,
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
