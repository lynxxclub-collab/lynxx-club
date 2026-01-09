import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// =============================================================================
// CONFIGURATION
// =============================================================================
const CONFIG = {
  maxRetries: 3,
  retryDelayMs: 100,
  maxCreditsPerPurchase: 100_000, // Safety cap
  minCreditsPerPurchase: 1,
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// =============================================================================
// TYPES
// =============================================================================
interface WebhookMetadata {
  userId: string;
  packId: string;
  credits: number;
}

interface TransactionRecord {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
}

interface WalletRecord {
  user_id: string;
  credit_balance: number;
}

type ProcessingResult =
  | { success: true; creditsAdded: number; newBalance: number }
  | { success: false; error: string; shouldRetry: boolean };

// =============================================================================
// STRUCTURED LOGGING
// =============================================================================
interface LogContext {
  requestId: string;
  eventId?: string;
  eventType?: string;
  userId?: string;
  sessionId?: string;
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
        service: "stripe-credit-webhook",
        step,
        ...baseContext,
        ...details,
        timestamp: new Date().toISOString(),
      }));
    },
    warn: (step: string, details?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: "WARN",
        service: "stripe-credit-webhook",
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
        service: "stripe-credit-webhook",
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
  return `wh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function getRequiredEnv(name: string, logger: Logger): string {
  const value = Deno.env.get(name);
  if (!value) {
    logger.error("missing_env_var", new Error(`Missing required environment variable: ${name}`), { envVar: name });
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

// =============================================================================
// METADATA VALIDATION
// =============================================================================
function validateAndExtractMetadata(
  session: Stripe.Checkout.Session,
  logger: Logger
): WebhookMetadata | null {
  const userId = session.metadata?.user_id;
  const packId = session.metadata?.pack_id;
  const creditsStr = session.metadata?.credits;

  // Validate user_id
  if (!userId || typeof userId !== "string") {
    logger.error("invalid_metadata", new Error("Missing user_id in metadata"), { metadata: session.metadata });
    return null;
  }

  if (!isValidUUID(userId)) {
    logger.error("invalid_metadata", new Error("Invalid user_id format"), { userId });
    return null;
  }

  // Validate pack_id
  if (!packId || typeof packId !== "string" || packId.length === 0) {
    logger.error("invalid_metadata", new Error("Missing or invalid pack_id"), { packId });
    return null;
  }

  // Validate credits
  const credits = parseInt(creditsStr || "0", 10);

  if (!Number.isFinite(credits) || credits < CONFIG.minCreditsPerPurchase) {
    logger.error("invalid_metadata", new Error("Invalid credits amount"), { creditsStr, credits });
    return null;
  }

  if (credits > CONFIG.maxCreditsPerPurchase) {
    logger.error("invalid_metadata", new Error("Credits exceed maximum allowed"), {
      credits,
      maxAllowed: CONFIG.maxCreditsPerPurchase,
    });
    return null;
  }

  return { userId, packId, credits };
}

// =============================================================================
// IDEMPOTENCY CHECKS
// =============================================================================
async function checkIdempotency(
  supabase: SupabaseClient,
  paymentIntent: string,
  logger: Logger
): Promise<{ shouldProcess: boolean; existingStatus?: string }> {
  const { data: existingTx, error } = await supabase
    .from("transactions")
    .select("id, status")
    .eq("transaction_type", "credit_purchase")
    .eq("stripe_payment_id", paymentIntent)
    .limit(1);

  if (error) {
    logger.warn("idempotency_check_failed", { error: error.message, paymentIntent });
    // Fail open: allow processing but log warning
    return { shouldProcess: true };
  }

  if (existingTx && existingTx.length > 0) {
    const record = existingTx[0] as TransactionRecord;
    if (record.status === "completed" || record.status === "processing") {
      logger.info("idempotency_skip", { paymentIntent, existingStatus: record.status });
      return { shouldProcess: false, existingStatus: record.status };
    }
  }

  return { shouldProcess: true };
}

async function createProcessingMarker(
  supabase: SupabaseClient,
  params: {
    userId: string;
    credits: number;
    usdAmount: number;
    paymentIntent: string;
    description: string;
  },
  logger: Logger
): Promise<{ created: boolean; duplicate: boolean }> {
  const { error } = await supabase
    .from("transactions")
    .insert({
      user_id: params.userId,
      transaction_type: "credit_purchase",
      credits_amount: params.credits,
      usd_amount: params.usdAmount,
      status: "processing",
      stripe_payment_id: params.paymentIntent,
      description: params.description,
    });

  if (error) {
    const code = (error as { code?: string }).code;
    const msg = error.message || "";

    if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
      logger.info("idempotency_duplicate_marker", { paymentIntent: params.paymentIntent });
      return { created: false, duplicate: true };
    }

    logger.warn("processing_marker_failed", { error: error.message });
    return { created: false, duplicate: false };
  }

  return { created: true, duplicate: false };
}

// =============================================================================
// WALLET OPERATIONS
// =============================================================================
async function ensureWalletExists(
  supabase: SupabaseClient,
  userId: string,
  logger: Logger
): Promise<boolean> {
  const { data: existingWallet } = await supabase
    .from("wallets")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingWallet) {
    return true;
  }

  logger.info("creating_wallet", { userId });

  const { error } = await supabase
    .from("wallets")
    .insert({
      user_id: userId,
      credit_balance: 0,
      pending_earnings: 0,
      available_earnings: 0,
    });

  if (error) {
    const code = (error as { code?: string }).code;
    // 23505 = unique violation (wallet already exists from race condition)
    if (code === "23505") {
      logger.info("wallet_race_condition_handled", { userId });
      return true;
    }

    logger.error("wallet_creation_failed", error, { userId });
    return false;
  }

  logger.info("wallet_created", { userId });
  return true;
}

/**
 * Atomically increment wallet credits using CAS pattern
 * Returns the new balance on success, -1 on CAS failure
 */
async function incrementCreditsAtomic(
  supabase: SupabaseClient,
  userId: string,
  expectedBalance: number,
  creditsToAdd: number,
  logger: Logger
): Promise<number> {
  const newBalance = expectedBalance + creditsToAdd;

  const { data: rows, error } = await supabase
    .from("wallets")
    .update({
      credit_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("credit_balance", expectedBalance)
    .select("credit_balance");

  if (error) {
    logger.error("credit_increment_failed", error, { userId, expectedBalance, creditsToAdd });
    throw new Error(`Failed to increment credits: ${error.message}`);
  }

  if (!rows || rows.length !== 1) {
    // CAS failed - balance changed between read and write
    return -1;
  }

  return (rows[0] as WalletRecord).credit_balance;
}

async function addCreditsToWallet(
  supabase: SupabaseClient,
  userId: string,
  credits: number,
  logger: Logger
): Promise<ProcessingResult> {
  // First, try using RPC if available (most reliable)
  const { error: rpcError } = await supabase.rpc("increment_wallet_credits", {
    p_user_id: userId,
    p_credits: credits,
  });

  if (!rpcError) {
    // RPC succeeded, fetch new balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("credit_balance")
      .eq("user_id", userId)
      .single();

    const newBalance = (wallet as WalletRecord | null)?.credit_balance ?? 0;
    logger.info("credits_added_via_rpc", { userId, credits, newBalance });
    return { success: true, creditsAdded: credits, newBalance };
  }

  logger.info("rpc_unavailable_using_cas", { error: rpcError.message });

  // Fallback: CAS-based update with retries
  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    const { data: currentWallet, error: fetchError } = await supabase
      .from("wallets")
      .select("credit_balance")
      .eq("user_id", userId)
      .single();

    if (fetchError || !currentWallet) {
      logger.error("wallet_fetch_failed", fetchError, { userId, attempt });
      return {
        success: false,
        error: `Failed to fetch wallet: ${fetchError?.message || "Not found"}`,
        shouldRetry: true,
      };
    }

    const currentBalance = (currentWallet as WalletRecord).credit_balance;
    const newBalance = await incrementCreditsAtomic(supabase, userId, currentBalance, credits, logger);

    if (newBalance >= 0) {
      logger.info("credits_added_via_cas", { userId, credits, newBalance, attempt });
      return { success: true, creditsAdded: credits, newBalance };
    }

    // CAS failed, retry with backoff
    if (attempt < CONFIG.maxRetries) {
      const delay = CONFIG.retryDelayMs * Math.pow(2, attempt);
      logger.info("cas_retry", { attempt: attempt + 1, delayMs: delay });
      await sleep(delay);
    }
  }

  logger.error("credits_add_exhausted_retries", new Error("Max retries exceeded"), { userId, credits });
  return {
    success: false,
    error: "Failed to update wallet after multiple retries",
    shouldRetry: true,
  };
}

// =============================================================================
// LEDGER & TRANSACTION FINALIZATION
// =============================================================================
async function createLedgerEntry(
  supabase: SupabaseClient,
  params: {
    userId: string;
    credits: number;
    usdAmount: number;
    packId: string;
    description: string;
  },
  logger: Logger
): Promise<void> {
  const { error } = await supabase
    .from("ledger_entries")
    .insert({
      user_id: params.userId,
      entry_type: "credit_purchase",
      credits_delta: params.credits,
      usd_delta: params.usdAmount,
      reference_id: params.packId,
      reference_type: "credit_pack",
      description: params.description,
    });

  if (error) {
    // Ledger is critical for audit trail but not blocking
    logger.error("ledger_entry_failed", error, { userId: params.userId });
  } else {
    logger.info("ledger_entry_created", { userId: params.userId, credits: params.credits });
  }
}

async function updateTransactionStatus(
  supabase: SupabaseClient,
  paymentIntent: string,
  status: "completed" | "failed",
  logger: Logger
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("transaction_type", "credit_purchase")
    .eq("stripe_payment_id", paymentIntent);

  if (error) {
    logger.warn("transaction_status_update_failed", { error: error.message, paymentIntent, status });
  } else {
    logger.info("transaction_status_updated", { paymentIntent, status });
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================
async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
  logger: Logger
): Promise<Response> {
  logger.setContext({ sessionId: session.id });
  logger.info("processing_checkout_completed");

  // Validate metadata
  const metadata = validateAndExtractMetadata(session, logger);
  if (!metadata) {
    return new Response(
      JSON.stringify({ error: "Invalid or missing metadata" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { userId, packId, credits } = metadata;
  logger.setContext({ userId });

  // Determine payment reference for idempotency
  const paymentIntent =
    typeof session.payment_intent === "string" && session.payment_intent.length > 0
      ? session.payment_intent
      : session.id;

  logger.info("metadata_validated", { userId, packId, credits, paymentIntent });

  // Idempotency check
  const { shouldProcess, existingStatus } = await checkIdempotency(supabase, paymentIntent, logger);
  if (!shouldProcess) {
    return new Response(
      JSON.stringify({ received: true, skipped: true, reason: `Already ${existingStatus}` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Calculate USD amount
  const usdAmount = (session.amount_total || 0) / 100;
  const description = `Credit pack purchase: ${credits} credits, pack_id=${packId}, session=${session.id}, event=${event.id}`;

  // Create processing marker (idempotency guard)
  const markerResult = await createProcessingMarker(
    supabase,
    { userId, credits, usdAmount, paymentIntent, description },
    logger
  );

  if (markerResult.duplicate) {
    return new Response(
      JSON.stringify({ received: true, skipped: true, reason: "Duplicate transaction" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Ensure wallet exists
  const walletExists = await ensureWalletExists(supabase, userId, logger);
  if (!walletExists) {
    await updateTransactionStatus(supabase, paymentIntent, "failed", logger);
    return new Response(
      JSON.stringify({ error: "Failed to create wallet" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Add credits to wallet
  const creditResult = await addCreditsToWallet(supabase, userId, credits, logger);

  if (!creditResult.success) {
    logger.error("credit_addition_failed", new Error(creditResult.error), { userId, credits });
    await updateTransactionStatus(supabase, paymentIntent, "failed", logger);

    const statusCode = creditResult.shouldRetry ? 500 : 400;
    return new Response(
      JSON.stringify({ error: creditResult.error }),
      { status: statusCode, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create audit trail
  await createLedgerEntry(supabase, { userId, credits, usdAmount, packId, description }, logger);

  // Mark transaction complete
  await updateTransactionStatus(supabase, paymentIntent, "completed", logger);

  logger.info("checkout_completed_successfully", {
    userId,
    credits,
    newBalance: creditResult.newBalance,
    usdAmount,
  });

  return new Response(
    JSON.stringify({
      received: true,
      processed: true,
      creditsAdded: credits,
      newBalance: creditResult.newBalance,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

function handleDisabledEvent(eventType: string, eventId: string, logger: Logger): Response {
  logger.info("event_handling_disabled", { eventType, reason: "Disabled for launch" });
  return new Response(
    JSON.stringify({ received: true, ignored: true, reason: "Event type temporarily disabled" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
serve(async (req: Request): Promise<Response> => {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  const startTime = Date.now();

  logger.info("webhook_received");

  try {
    // Load environment variables
    let stripeKey: string;
    let webhookSecret: string;
    let supabaseUrl: string;
    let supabaseServiceKey: string;

    try {
      stripeKey = getRequiredEnv("STRIPE_SECRET_KEY", logger);
      webhookSecret = getRequiredEnv("STRIPE_CREDIT_WEBHOOK_SECRET", logger);
      supabaseUrl = getRequiredEnv("SUPABASE_URL", logger);
      supabaseServiceKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", logger);
    } catch {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify Stripe signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logger.error("missing_signature", new Error("Missing stripe-signature header"));
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logger.error("signature_verification_failed", err);
      return new Response(
        JSON.stringify({ error: "Signature verification failed" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    logger.setContext({ eventId: event.id, eventType: event.type });
    logger.info("event_verified");

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Route event to appropriate handler
    let response: Response;

    switch (event.type) {
      case "checkout.session.completed":
        response = await handleCheckoutCompleted(
          supabase,
          event.data.object as Stripe.Checkout.Session,
          event,
          logger
        );
        break;

      case "charge.refunded":
      case "charge.dispute.created":
        // TODO: Implement clawback logic post-launch
        response = handleDisabledEvent(event.type, event.id, logger);
        break;

      default:
        logger.info("unhandled_event_type", { eventType: event.type });
        response = new Response(
          JSON.stringify({ received: true, unhandled: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
    }

    const duration = Date.now() - startTime;
    logger.info("webhook_completed", { durationMs: duration, statusCode: response.status });

    return response;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    logger.error("webhook_failed", error, { durationMs: duration });

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        requestId,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
