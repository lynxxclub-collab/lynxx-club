import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

// =============================================================================
// CONFIGURATION
// =============================================================================
const CONFIG = {
  holdPeriodHours: 48,
  batchSize: 100,
  maxRetries: 2,
  retryDelayMs: 500,
} as const;

// =============================================================================
// TYPES
// =============================================================================
interface ProcessingResult {
  success: boolean;
  processedCount: number;
  totalAmountMoved: number;
  errors: string[];
}

interface PendingTransaction {
  id: string;
  user_id: string;
  usd_amount: number;
  created_at: string;
}

interface WalletRecord {
  user_id: string;
  pending_earnings: number;
  available_earnings: number;
}

// =============================================================================
// STRUCTURED LOGGING
// =============================================================================
interface LogContext {
  runId: string;
  [key: string]: unknown;
}

const createLogger = (runId: string) => {
  const baseContext: LogContext = { runId };

  return {
    setContext: (ctx: Partial<LogContext>) => {
      Object.assign(baseContext, ctx);
    },
    info: (step: string, details?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: "INFO",
        service: "process-pending-earnings",
        step,
        ...baseContext,
        ...details,
        timestamp: new Date().toISOString(),
      }));
    },
    warn: (step: string, details?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: "WARN",
        service: "process-pending-earnings",
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
        service: "process-pending-earnings",
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
  return `ppe-${date}-${Math.random().toString(36).substring(2, 8)}`;
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

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Process pending earnings using the database RPC function.
 * This is the preferred method as it handles atomicity at the database level.
 */
async function processViaRpc(
  supabase: SupabaseClient,
  logger: Logger
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const { data, error } = await supabase.rpc("process_pending_earnings");

  if (error) {
    logger.error("rpc_failed", error);
    return { success: false, error: error.message };
  }

  const count = Number(data || 0);
  logger.info("rpc_success", { processedCount: count });

  return { success: true, count };
}

/**
 * Fallback: Process pending earnings manually with CAS-style updates.
 * Used when the RPC function is not available.
 */
async function processManualFallback(
  supabase: SupabaseClient,
  logger: Logger
): Promise<ProcessingResult> {
  logger.info("using_manual_fallback");

  const result: ProcessingResult = {
    success: true,
    processedCount: 0,
    totalAmountMoved: 0,
    errors: [],
  };

  // Calculate the cutoff time (48 hours ago)
  const cutoffTime = new Date(Date.now() - CONFIG.holdPeriodHours * 60 * 60 * 1000).toISOString();

  // Find transactions that have completed the hold period
  // These are video_earning transactions that are older than 48 hours
  // and haven't been processed yet (earnings_cleared = false)
  const { data: pendingTxs, error: fetchError } = await supabase
    .from("transactions")
    .select("id, user_id, usd_amount, created_at")
    .eq("transaction_type", "video_earning")
    .eq("status", "completed")
    .eq("earnings_cleared", false)
    .lt("created_at", cutoffTime)
    .order("created_at", { ascending: true })
    .limit(CONFIG.batchSize);

  if (fetchError) {
    logger.error("fetch_pending_failed", fetchError);
    return { ...result, success: false, errors: [fetchError.message] };
  }

  if (!pendingTxs || pendingTxs.length === 0) {
    logger.info("no_pending_transactions");
    return result;
  }

  logger.info("found_pending_transactions", { count: pendingTxs.length });

  // Group transactions by user
  const userTransactions = new Map<string, PendingTransaction[]>();

  for (const tx of pendingTxs as PendingTransaction[]) {
    if (!tx.user_id || !tx.usd_amount || tx.usd_amount <= 0) continue;

    const existing = userTransactions.get(tx.user_id) || [];
    existing.push(tx);
    userTransactions.set(tx.user_id, existing);
  }

  // Process each user's transactions
  for (const [userId, transactions] of userTransactions) {
    try {
      const totalAmount = roundToTwoDecimals(
        transactions.reduce((sum, tx) => sum + tx.usd_amount, 0)
      );

      if (totalAmount <= 0) continue;

      logger.info("processing_user", { userId, transactionCount: transactions.length, totalAmount });

      // Get current wallet state
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("pending_earnings, available_earnings")
        .eq("user_id", userId)
        .single();

      if (walletError || !wallet) {
        logger.warn("wallet_fetch_failed", { userId, error: walletError?.message });
        result.errors.push(`User ${userId}: wallet not found`);
        continue;
      }

      const walletData = wallet as WalletRecord;
      const currentPending = walletData.pending_earnings || 0;
      const currentAvailable = walletData.available_earnings || 0;

      // Ensure we don't move more than available in pending
      const amountToMove = Math.min(totalAmount, currentPending);

      if (amountToMove <= 0) {
        logger.warn("insufficient_pending", { userId, totalAmount, currentPending });
        result.errors.push(`User ${userId}: insufficient pending balance`);
        continue;
      }

      const newPending = roundToTwoDecimals(currentPending - amountToMove);
      const newAvailable = roundToTwoDecimals(currentAvailable + amountToMove);

      // CAS-style update: only update if pending_earnings matches expected value
      const { data: updated, error: updateError } = await supabase
        .from("wallets")
        .update({
          pending_earnings: newPending,
          available_earnings: newAvailable,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("pending_earnings", currentPending)
        .select("user_id");

      if (updateError) {
        logger.error("wallet_update_failed", updateError, { userId });
        result.errors.push(`User ${userId}: ${updateError.message}`);
        continue;
      }

      if (!updated || updated.length !== 1) {
        // CAS failed - wallet was modified concurrently
        logger.warn("wallet_cas_failed", { userId, currentPending });
        result.errors.push(`User ${userId}: concurrent modification`);
        continue;
      }

      // Mark transactions as cleared
      const txIds = transactions.map((tx) => tx.id);
      const { error: markError } = await supabase
        .from("transactions")
        .update({ earnings_cleared: true, cleared_at: new Date().toISOString() })
        .in("id", txIds);

      if (markError) {
        // Non-critical but log for investigation
        logger.warn("mark_cleared_failed", { userId, txIds, error: markError.message });
      }

      result.processedCount += transactions.length;
      result.totalAmountMoved += amountToMove;

      logger.info("user_processed", {
        userId,
        transactionsCleared: transactions.length,
        amountMoved: amountToMove,
        newAvailable,
      });
    } catch (error) {
      logger.error("user_processing_failed", error, { userId });
      result.errors.push(`User ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return result;
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

  logger.info("run_started", { holdPeriodHours: CONFIG.holdPeriodHours });

  try {
    // Load environment
    const supabaseUrl = getRequiredEnv("SUPABASE_URL", logger);
    const supabaseServiceKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", logger);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Try RPC first (preferred)
    const rpcResult = await processViaRpc(supabase, logger);

    if (rpcResult.success) {
      const duration = Date.now() - startTime;
      logger.info("run_completed", {
        durationMs: duration,
        processedCount: rpcResult.count,
        method: "rpc",
      });

      return new Response(
        JSON.stringify({
          success: true,
          runId,
          processed: rpcResult.count,
          message: `Moved earnings from ${rpcResult.count} users to available balance`,
          method: "rpc",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback to manual processing
    logger.info("rpc_failed_using_fallback", { rpcError: rpcResult.error });

    const fallbackResult = await processManualFallback(supabase, logger);

    const duration = Date.now() - startTime;
    logger.info("run_completed", {
      durationMs: duration,
      processedCount: fallbackResult.processedCount,
      totalAmountMoved: fallbackResult.totalAmountMoved,
      errorCount: fallbackResult.errors.length,
      method: "manual",
    });

    return new Response(
      JSON.stringify({
        success: fallbackResult.success,
        runId,
        processed: fallbackResult.processedCount,
        totalAmountMoved: fallbackResult.totalAmountMoved,
        message: `Moved $${fallbackResult.totalAmountMoved.toFixed(2)} from ${fallbackResult.processedCount} transactions to available balance`,
        method: "manual",
        errors: fallbackResult.errors.length > 0 ? fallbackResult.errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    logger.error("run_failed", error, { durationMs: duration });

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
