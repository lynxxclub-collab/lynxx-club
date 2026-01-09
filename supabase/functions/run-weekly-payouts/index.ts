import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

// =============================================================================
// CONFIGURATION
// =============================================================================
const CONFIG = {
  payout: {
    minimumUsd: 25.00,      // Fixed minimum - NO EXCEPTIONS
    maxRetryCount: 3,       // Max retries per earner before skipping
    batchSize: 50,          // Process earners in batches
    retryDelayMs: 1000,     // Delay between retries
  },
  stripe: {
    apiVersion: "2025-04-30.basil" as const,
    transferTimeout: 30_000,
  },
} as const;

// =============================================================================
// TYPES
// =============================================================================
interface EarnerWallet {
  user_id: string;
  available_earnings: number;
}

interface EarnerProfile {
  id: string;
  stripe_account_id: string | null;
  stripe_payouts_enabled: boolean;
  name: string | null;
  email: string | null;
}

interface PayoutResult {
  odeedealerId: string;
  odeedealerName: string | null;
  success: boolean;
  amount?: number;
  transferId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

interface PayoutSummary {
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  totalSkipped: number;
  totalAmountUsd: number;
  results: PayoutResult[];
}

interface PayoutRecord {
  id: string;
  user_id: string;
  amount_usd: number;
  status: "pending" | "processing" | "completed" | "failed";
  stripe_transfer_id: string | null;
  error_message: string | null;
  idempotency_key: string;
  created_at: string;
}

// =============================================================================
// STRUCTURED LOGGING
// =============================================================================
interface LogContext {
  runId: string;
  batchIndex?: number;
  odeedealerId?: string;
  [key: string]: unknown;
}

const createLogger = (runId: string) => {
  const baseContext: LogContext = { runId };

  return {
    setContext: (ctx: Partial<LogContext>) => {
      Object.assign(baseContext, ctx);
    },
    clearEarner: () => {
      delete baseContext.odeedealerId;
    },
    info: (step: string, details?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: "INFO",
        service: "run-weekly-payouts",
        step,
        ...baseContext,
        ...details,
        timestamp: new Date().toISOString(),
      }));
    },
    warn: (step: string, details?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: "WARN",
        service: "run-weekly-payouts",
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
        service: "run-weekly-payouts",
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
const generateRunId = (): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `payout-${date}-${Math.random().toString(36).substring(2, 8)}`;
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

function generateIdempotencyKey(runId: string, odeedealerId: string): string {
  return `${runId}:${odeedealerId}`;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================
async function getEligibleEarners(
  supabase: SupabaseClient,
  logger: Logger
): Promise<Array<EarnerWallet & EarnerProfile>> {
  // Get all earners with available_earnings >= minimum
  const { data: wallets, error: walletError } = await supabase
    .from("wallets")
    .select("user_id, available_earnings")
    .gte("available_earnings", CONFIG.payout.minimumUsd);

  if (walletError) {
    logger.error("wallet_fetch_failed", walletError);
    throw new Error(`Failed to fetch wallets: ${walletError.message}`);
  }

  if (!wallets || wallets.length === 0) {
    logger.info("no_eligible_earners");
    return [];
  }

  const userIds = wallets.map((w) => (w as EarnerWallet).user_id);

  // Get profiles with Stripe Connect accounts
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, stripe_account_id, stripe_payouts_enabled, name, email")
    .in("id", userIds)
    .eq("user_type", "earner");

  if (profileError) {
    logger.error("profile_fetch_failed", profileError);
    throw new Error(`Failed to fetch profiles: ${profileError.message}`);
  }

  // Join wallets with profiles
  const profileMap = new Map((profiles || []).map((p) => [(p as EarnerProfile).id, p as EarnerProfile]));

  const eligible = wallets
    .map((w) => {
      const wallet = w as EarnerWallet;
      const profile = profileMap.get(wallet.user_id);
      if (!profile) return null;
      return { ...wallet, ...profile };
    })
    .filter((e): e is EarnerWallet & EarnerProfile => e !== null);

  logger.info("eligible_earners_found", { count: eligible.length });
  return eligible;
}

async function checkExistingPayout(
  supabase: SupabaseClient,
  idempotencyKey: string,
  logger: Logger
): Promise<PayoutRecord | null> {
  const { data, error } = await supabase
    .from("payout_records")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    logger.warn("payout_record_check_failed", { error: error.message, idempotencyKey });
    return null;
  }

  return data as PayoutRecord | null;
}

async function createPayoutRecord(
  supabase: SupabaseClient,
  params: {
    userId: string;
    amountUsd: number;
    idempotencyKey: string;
  },
  logger: Logger
): Promise<string | null> {
  const { data, error } = await supabase
    .from("payout_records")
    .insert({
      user_id: params.userId,
      amount_usd: params.amountUsd,
      status: "pending",
      idempotency_key: params.idempotencyKey,
    })
    .select("id")
    .single();

  if (error) {
    // Check for duplicate (idempotency)
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      logger.info("payout_record_already_exists", { idempotencyKey: params.idempotencyKey });
      return null;
    }
    logger.error("payout_record_create_failed", error, { userId: params.userId });
    throw new Error(`Failed to create payout record: ${error.message}`);
  }

  return (data as { id: string }).id;
}

async function updatePayoutRecord(
  supabase: SupabaseClient,
  recordId: string,
  updates: Partial<Pick<PayoutRecord, "status" | "stripe_transfer_id" | "error_message">>,
  logger: Logger
): Promise<void> {
  const { error } = await supabase
    .from("payout_records")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", recordId);

  if (error) {
    logger.warn("payout_record_update_failed", { error: error.message, recordId });
  }
}

async function deductAvailableEarnings(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  expectedBalance: number,
  logger: Logger
): Promise<boolean> {
  // CAS-style deduction
  const newBalance = roundToTwoDecimals(expectedBalance - amount);

  const { data, error } = await supabase
    .from("wallets")
    .update({ available_earnings: newBalance, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .gte("available_earnings", amount) // Safety: ensure enough balance
    .select("available_earnings");

  if (error) {
    logger.error("earnings_deduction_failed", error, { userId, amount });
    return false;
  }

  if (!data || data.length !== 1) {
    logger.warn("earnings_deduction_cas_failed", { userId, amount, expectedBalance });
    return false;
  }

  logger.info("earnings_deducted", { userId, amount, newBalance });
  return true;
}

async function refundAvailableEarnings(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  logger: Logger
): Promise<void> {
  // Best-effort refund on failure
  const { error: rpcError } = await supabase.rpc("wallet_atomic_increment", {
    p_user_id: userId,
    p_field: "available_earnings",
    p_amount: amount,
  });

  if (rpcError) {
    logger.error("CRITICAL_refund_failed", rpcError, { userId, amount });
    // This requires manual intervention
  } else {
    logger.info("earnings_refunded", { userId, amount });
  }
}

// =============================================================================
// STRIPE OPERATIONS
// =============================================================================
async function createStripeTransfer(
  stripe: Stripe,
  params: {
    amountCents: number;
    stripeAccountId: string;
    idempotencyKey: string;
    metadata: Record<string, string>;
  },
  logger: Logger
): Promise<{ success: true; transferId: string } | { success: false; error: string }> {
  try {
    const transfer = await stripe.transfers.create(
      {
        amount: params.amountCents,
        currency: "usd",
        destination: params.stripeAccountId,
        metadata: params.metadata,
      },
      {
        idempotencyKey: params.idempotencyKey,
      }
    );

    logger.info("stripe_transfer_created", {
      transferId: transfer.id,
      amount: params.amountCents,
      destination: params.stripeAccountId,
    });

    return { success: true, transferId: transfer.id };
  } catch (error) {
    const stripeError = error as Stripe.errors.StripeError;
    const errorMessage = stripeError.message || String(error);

    logger.error("stripe_transfer_failed", error, {
      stripeAccountId: params.stripeAccountId,
      amount: params.amountCents,
      stripeErrorCode: stripeError.code,
      stripeErrorType: stripeError.type,
    });

    return { success: false, error: errorMessage };
  }
}

// =============================================================================
// PAYOUT PROCESSING
// =============================================================================
async function processEarnerPayout(
  supabase: SupabaseClient,
  stripe: Stripe,
  earner: EarnerWallet & EarnerProfile,
  runId: string,
  logger: Logger
): Promise<PayoutResult> {
  const odeedealerId = earner.user_id;
  const odeedealerName = earner.name;
  logger.setContext({ odeedealerId });

  // Validation checks
  if (!earner.stripe_account_id) {
    logger.info("skipped_no_stripe_account");
    return {
      odeedealerId,
      odeedealerName,
      success: false,
      skipped: true,
      skipReason: "No Stripe Connect account",
    };
  }

  if (!earner.stripe_payouts_enabled) {
    logger.info("skipped_payouts_not_enabled");
    return {
      odeedealerId,
      odeedealerName,
      success: false,
      skipped: true,
      skipReason: "Stripe payouts not enabled",
    };
  }

  const amount = roundToTwoDecimals(earner.available_earnings);

  if (amount < CONFIG.payout.minimumUsd) {
    logger.info("skipped_below_minimum", { amount, minimum: CONFIG.payout.minimumUsd });
    return {
      odeedealerId,
      odeedealerName,
      success: false,
      skipped: true,
      skipReason: `Below minimum ($${amount} < $${CONFIG.payout.minimumUsd})`,
    };
  }

  const idempotencyKey = generateIdempotencyKey(runId, odeedealerId);

  // Check for existing payout (idempotency)
  const existingPayout = await checkExistingPayout(supabase, idempotencyKey, logger);
  if (existingPayout) {
    if (existingPayout.status === "completed") {
      logger.info("skipped_already_completed", { payoutRecordId: existingPayout.id });
      return {
        odeedealerId,
        odeedealerName,
        success: true,
        amount: existingPayout.amount_usd,
        transferId: existingPayout.stripe_transfer_id || undefined,
        skipped: true,
        skipReason: "Already processed in this run",
      };
    }

    if (existingPayout.status === "processing") {
      logger.warn("skipped_in_progress", { payoutRecordId: existingPayout.id });
      return {
        odeedealerId,
        odeedealerName,
        success: false,
        skipped: true,
        skipReason: "Payout in progress",
      };
    }
  }

  // Create payout record
  const payoutRecordId = await createPayoutRecord(
    supabase,
    { userId: odeedealerId, amountUsd: amount, idempotencyKey },
    logger
  );

  if (!payoutRecordId) {
    // Record already exists (race condition)
    return {
      odeedealerId,
      odeedealerName,
      success: false,
      skipped: true,
      skipReason: "Duplicate payout attempt",
    };
  }

  // Mark as processing
  await updatePayoutRecord(supabase, payoutRecordId, { status: "processing" }, logger);

  // Deduct earnings first (fail-safe: deduct before transfer)
  const deducted = await deductAvailableEarnings(
    supabase,
    odeedealerId,
    amount,
    earner.available_earnings,
    logger
  );

  if (!deducted) {
    await updatePayoutRecord(supabase, payoutRecordId, {
      status: "failed",
      error_message: "Failed to deduct earnings",
    }, logger);

    return {
      odeedealerId,
      odeedealerName,
      success: false,
      error: "Failed to deduct earnings (balance may have changed)",
    };
  }

  // Create Stripe transfer
  const amountCents = Math.round(amount * 100);
  const transferResult = await createStripeTransfer(
    stripe,
    {
      amountCents,
      stripeAccountId: earner.stripe_account_id,
      idempotencyKey: `transfer:${idempotencyKey}`,
      metadata: {
        payout_record_id: payoutRecordId,
        earner_id: odeedealerId,
        run_id: runId,
      },
    },
    logger
  );

  if (!transferResult.success) {
    // Refund the deducted amount
    await refundAvailableEarnings(supabase, odeedealerId, amount, logger);

    await updatePayoutRecord(supabase, payoutRecordId, {
      status: "failed",
      error_message: transferResult.error,
    }, logger);

    return {
      odeedealerId,
      odeedealerName,
      success: false,
      amount,
      error: transferResult.error,
    };
  }

  // Mark as completed
  await updatePayoutRecord(supabase, payoutRecordId, {
    status: "completed",
    stripe_transfer_id: transferResult.transferId,
  }, logger);

  // Record transaction for audit trail
  await supabase.from("transactions").insert({
    user_id: odeedealerId,
    transaction_type: "payout",
    credits_amount: 0,
    usd_amount: -amount,
    description: `Weekly payout - Transfer ${transferResult.transferId}`,
    status: "completed",
  });

  logger.info("payout_completed", { amount, transferId: transferResult.transferId });

  return {
    odeedealerId,
    odeedealerName,
    success: true,
    amount,
    transferId: transferResult.transferId,
  };
}

async function processPayoutBatch(
  supabase: SupabaseClient,
  stripe: Stripe,
  earners: Array<EarnerWallet & EarnerProfile>,
  runId: string,
  batchIndex: number,
  logger: Logger
): Promise<PayoutResult[]> {
  logger.setContext({ batchIndex });
  logger.info("processing_batch", { earnerCount: earners.length });

  const results: PayoutResult[] = [];

  for (const earner of earners) {
    try {
      const result = await processEarnerPayout(supabase, stripe, earner, runId, logger);
      results.push(result);

      // Small delay between payouts to avoid rate limits
      await sleep(200);
    } catch (error) {
      logger.error("earner_payout_unexpected_error", error, { odeedealerId: earner.user_id });
      results.push({
        odeedealerId: earner.user_id,
        odeedealerName: earner.name,
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      });
    }

    logger.clearEarner();
  }

  return results;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
serve(async (req: Request): Promise<Response> => {
  const runId = generateRunId();
  const logger = createLogger(runId);
  const corsHeaders = getCorsHeaders(req);
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Method check
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Cron authentication - REQUIRED
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const requestCronSecret = req.headers.get("x-cron-secret");

  if (!cronSecret || cronSecret.length === 0) {
    logger.error("cron_secret_not_configured", new Error("CRON_SECRET not set"));
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (requestCronSecret !== cronSecret) {
    logger.warn("forbidden_invalid_cron_secret");
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  logger.info("payout_run_started");

  try {
    // Load environment
    const stripeKey = getRequiredEnv("STRIPE_SECRET_KEY", logger);
    const supabaseUrl = getRequiredEnv("SUPABASE_URL", logger);
    const supabaseServiceKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", logger);

    const stripe = new Stripe(stripeKey, { apiVersion: CONFIG.stripe.apiVersion });
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    // Get eligible earners
    const eligibleEarners = await getEligibleEarners(supabase, logger);

    if (eligibleEarners.length === 0) {
      const duration = Date.now() - startTime;
      logger.info("payout_run_completed_no_earners", { durationMs: duration });

      return new Response(
        JSON.stringify({
          success: true,
          runId,
          summary: {
            totalProcessed: 0,
            totalSuccessful: 0,
            totalFailed: 0,
            totalSkipped: 0,
            totalAmountUsd: 0,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process in batches
    const allResults: PayoutResult[] = [];

    for (let i = 0; i < eligibleEarners.length; i += CONFIG.payout.batchSize) {
      const batch = eligibleEarners.slice(i, i + CONFIG.payout.batchSize);
      const batchIndex = Math.floor(i / CONFIG.payout.batchSize);

      const batchResults = await processPayoutBatch(supabase, stripe, batch, runId, batchIndex, logger);
      allResults.push(...batchResults);

      // Delay between batches
      if (i + CONFIG.payout.batchSize < eligibleEarners.length) {
        await sleep(CONFIG.payout.retryDelayMs);
      }
    }

    // Calculate summary
    const summary: PayoutSummary = {
      totalProcessed: allResults.length,
      totalSuccessful: allResults.filter((r) => r.success && !r.skipped).length,
      totalFailed: allResults.filter((r) => !r.success && !r.skipped).length,
      totalSkipped: allResults.filter((r) => r.skipped).length,
      totalAmountUsd: allResults
        .filter((r) => r.success && r.amount)
        .reduce((sum, r) => sum + (r.amount || 0), 0),
      results: allResults,
    };

    const duration = Date.now() - startTime;
    logger.info("payout_run_completed", {
      durationMs: duration,
      ...summary,
      results: undefined, // Don't log all results
    });

    return new Response(
      JSON.stringify({
        success: true,
        runId,
        summary: {
          totalProcessed: summary.totalProcessed,
          totalSuccessful: summary.totalSuccessful,
          totalFailed: summary.totalFailed,
          totalSkipped: summary.totalSkipped,
          totalAmountUsd: roundToTwoDecimals(summary.totalAmountUsd),
        },
        // Include failed results for debugging
        failedPayouts: allResults.filter((r) => !r.success && !r.skipped),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    logger.error("payout_run_failed", error, { durationMs: duration });

    return new Response(
      JSON.stringify({
        success: false,
        runId,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
