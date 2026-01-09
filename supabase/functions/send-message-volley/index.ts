import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse, createErrorResponse } from "../_shared/errors.ts";
import { MESSAGE_MAX_LENGTH, isValidUUID, sanitizeTextContent } from "../_shared/validation.ts";
import { calculateEarnings } from "../_shared/pricing.ts";
import { verifyAuth } from "../_shared/auth.ts";

// =============================================================================
// CONFIGURATION
// =============================================================================
const CONFIG = {
  credits: {
    text: 1,
    image: 2,
  },
  usdPerCredit: 0.10,
  platformFeePercent: 0.30,
  providerEarningPercent: 0.70,
  replyDeadlineHours: 24,
  maxRetries: 2,
  retryDelayMs: 50,
} as const;

// =============================================================================
// TYPES
// =============================================================================
interface WalletData {
  user_id: string;
  credit_balance: number;
  pending_earnings: number;
}

interface ConversationData {
  id: string;
  seeker_id: string;
  earner_id: string;
  payer_user_id: string | null;
}

interface BillingResult {
  charged: boolean;
  creditsSpent: number;
  newBalance: number;
  earnerAmount: number;
  platformFee: number;
}

interface MessageResult {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: string;
  credits_cost: number;
  earner_amount: number;
  platform_fee: number;
  is_billable_volley: boolean;
  reply_deadline: string | null;
  created_at: string;
}

interface RequestBody {
  recipientId?: string;
  content?: string;
  messageType?: string;
  conversationId?: string;
}

type MessageType = "text" | "image";

// =============================================================================
// STRUCTURED LOGGING
// =============================================================================
interface LogContext {
  requestId: string;
  userId?: string;
  conversationId?: string;
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
        service: "send-message-volley",
        step,
        ...baseContext,
        ...details,
        timestamp: new Date().toISOString(),
      }));
    },
    warn: (step: string, details?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: "WARN",
        service: "send-message-volley",
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
        service: "send-message-volley",
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
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function getCreditsForMessageType(messageType: MessageType): number {
  return messageType === "image" ? CONFIG.credits.image : CONFIG.credits.text;
}

function calculateBillingAmounts(credits: number): {
  usdAmount: number;
  platformFee: number;
  providerEarning: number;
} {
  const { grossUsd, creatorUsd, platformUsd } = calculateEarnings(credits);
  return { usdAmount: grossUsd, platformFee: platformUsd, providerEarning: creatorUsd };
}

function isValidMessageType(type: string): type is MessageType {
  return type === "text" || type === "image";
}

// =============================================================================
// WALLET OPERATIONS
// =============================================================================
async function getOrCreateWallet(
  supabase: SupabaseClient,
  userId: string,
  logger: Logger
): Promise<WalletData> {
  // Try to fetch existing wallet
  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("user_id, credit_balance, pending_earnings")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("wallet_fetch_failed", error, { userId });
    throw new Error(`Failed to fetch wallet: ${error.message}`);
  }

  if (wallet) {
    return wallet as WalletData;
  }

  // Create new wallet with initial balance
  const { data: newWallet, error: createError } = await supabase
    .from("wallets")
    .insert({ user_id: userId, credit_balance: 0, pending_earnings: 0 })
    .select("user_id, credit_balance, pending_earnings")
    .single();

  if (createError) {
    const errorCode = (createError as { code?: string }).code;
    const errorMsg = createError.message || "";

    // Handle race condition: another request created the wallet
    if (errorCode === "23505" || errorMsg.toLowerCase().includes("duplicate")) {
      logger.info("wallet_race_condition_handled", { userId });

      const { data: retryWallet, error: retryError } = await supabase
        .from("wallets")
        .select("user_id, credit_balance, pending_earnings")
        .eq("user_id", userId)
        .single();

      if (retryError || !retryWallet) {
        logger.error("wallet_retry_fetch_failed", retryError, { userId });
        throw new Error(`Failed to create wallet: ${createError.message}`);
      }

      return retryWallet as WalletData;
    }

    logger.error("wallet_create_failed", createError, { userId });
    throw new Error(`Failed to create wallet: ${createError.message}`);
  }

  logger.info("wallet_created", { userId });
  return newWallet as WalletData;
}

/**
 * Atomically deduct credits using optimistic locking (CAS pattern)
 * Returns the new balance on success, throws on failure
 */
async function deductCreditsAtomic(
  supabase: SupabaseClient,
  userId: string,
  expectedBalance: number,
  amount: number,
  logger: Logger
): Promise<number> {
  const newBalance = expectedBalance - amount;

  const { data: rows, error } = await supabase
    .from("wallets")
    .update({ credit_balance: newBalance, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("credit_balance", expectedBalance)
    .select("credit_balance");

  if (error) {
    logger.error("credit_deduct_failed", error, { userId, amount });
    throw new Error(`Failed to deduct credits: ${error.message}`);
  }

  if (!rows || rows.length !== 1) {
    // CAS failed - balance changed
    return -1;
  }

  return (rows[0] as { credit_balance: number }).credit_balance;
}

/**
 * Atomically add earnings using optimistic locking (CAS pattern)
 * Returns true on success, false on CAS failure
 */
async function addEarningsAtomic(
  supabase: SupabaseClient,
  userId: string,
  expectedPending: number,
  amount: number,
  logger: Logger
): Promise<boolean> {
  const newPending = Number((expectedPending + amount).toFixed(2));

  const { data: rows, error } = await supabase
    .from("wallets")
    .update({ pending_earnings: newPending, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("pending_earnings", expectedPending)
    .select("pending_earnings");

  if (error) {
    logger.error("earnings_add_failed", error, { userId, amount });
    return false;
  }

  return rows !== null && rows.length === 1;
}

/**
 * Attempt to rollback a credit deduction (best-effort)
 */
async function rollbackDebit(
  supabase: SupabaseClient,
  userId: string,
  currentBalance: number,
  amount: number,
  logger: Logger
): Promise<boolean> {
  const { data: rows, error } = await supabase
    .from("wallets")
    .update({ credit_balance: currentBalance + amount, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("credit_balance", currentBalance)
    .select("credit_balance");

  if (error || !rows || rows.length !== 1) {
    logger.error("rollback_debit_failed", error, { userId, currentBalance, amount });
    return false;
  }

  logger.info("rollback_debit_success", { userId, amount });
  return true;
}

// =============================================================================
// CONVERSATION OPERATIONS
// =============================================================================
async function getOrCreateConversation(
  supabase: SupabaseClient,
  existingConversationId: string | null,
  senderId: string,
  recipientId: string,
  logger: Logger
): Promise<{
  conversationId: string;
  seekerId: string;
  earnerId: string;
  payerUserId: string;
}> {
  if (existingConversationId) {
    if (!isValidUUID(existingConversationId)) {
      throw new Error("Invalid conversation ID format");
    }

    const { data: conv, error } = await supabase
      .from("conversations")
      .select("id, seeker_id, earner_id, payer_user_id")
      .eq("id", existingConversationId)
      .maybeSingle();

    if (error) {
      logger.error("conversation_fetch_failed", error, { conversationId: existingConversationId });
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }

    if (!conv) {
      throw new Error("Conversation not found");
    }

    const convData = conv as ConversationData;

    // Security: Verify sender is a participant
    if (senderId !== convData.seeker_id && senderId !== convData.earner_id) {
      logger.warn("unauthorized_conversation_access", {
        senderId,
        conversationId: existingConversationId,
        seekerId: convData.seeker_id,
        earnerId: convData.earner_id,
      });
      throw new Error("Forbidden: You are not a participant in this conversation");
    }

    return {
      conversationId: convData.id,
      seekerId: convData.seeker_id,
      earnerId: convData.earner_id,
      payerUserId: convData.payer_user_id || convData.seeker_id,
    };
  }

  // Create new conversation - determine roles based on user types
  const [senderProfileResult, recipientProfileResult] = await Promise.all([
    supabase.from("profiles").select("user_type").eq("id", senderId).single(),
    supabase.from("profiles").select("user_type").eq("id", recipientId).single(),
  ]);

  if (senderProfileResult.error) {
    logger.error("sender_profile_fetch_failed", senderProfileResult.error, { senderId });
    throw new Error("Failed to fetch sender profile");
  }

  if (recipientProfileResult.error) {
    logger.error("recipient_profile_fetch_failed", recipientProfileResult.error, { recipientId });
    throw new Error("Failed to fetch recipient profile");
  }

  const senderType = senderProfileResult.data?.user_type || "seeker";
  const recipientType = recipientProfileResult.data?.user_type || "earner";

  let seekerId: string;
  let earnerId: string;
  let payerUserId: string;

  if (senderType === "seeker") {
    seekerId = senderId;
    earnerId = recipientId;
    payerUserId = senderId;
  } else {
    seekerId = recipientId;
    earnerId = senderId;
    payerUserId = recipientId;
  }

  // Check for existing conversation between these users to prevent duplicates
  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id, seeker_id, earner_id, payer_user_id")
    .eq("seeker_id", seekerId)
    .eq("earner_id", earnerId)
    .maybeSingle();

  if (existingConv) {
    logger.info("existing_conversation_found", { conversationId: existingConv.id });
    const convData = existingConv as ConversationData;
    return {
      conversationId: convData.id,
      seekerId: convData.seeker_id,
      earnerId: convData.earner_id,
      payerUserId: convData.payer_user_id || convData.seeker_id,
    };
  }

  const { data: newConv, error: createError } = await supabase
    .from("conversations")
    .insert({
      seeker_id: seekerId,
      earner_id: earnerId,
      payer_user_id: payerUserId,
    })
    .select("id")
    .single();

  if (createError) {
    // Handle race condition
    const errorCode = (createError as { code?: string }).code;
    if (errorCode === "23505") {
      const { data: raceConv } = await supabase
        .from("conversations")
        .select("id, seeker_id, earner_id, payer_user_id")
        .eq("seeker_id", seekerId)
        .eq("earner_id", earnerId)
        .single();

      if (raceConv) {
        logger.info("conversation_race_condition_handled", { conversationId: raceConv.id });
        const convData = raceConv as ConversationData;
        return {
          conversationId: convData.id,
          seekerId: convData.seeker_id,
          earnerId: convData.earner_id,
          payerUserId: convData.payer_user_id || convData.seeker_id,
        };
      }
    }
    logger.error("conversation_create_failed", createError, { seekerId, earnerId });
    throw new Error(`Failed to create conversation: ${createError.message}`);
  }

  logger.info("conversation_created", { conversationId: newConv.id, seekerId, earnerId });

  return {
    conversationId: newConv.id,
    seekerId,
    earnerId,
    payerUserId,
  };
}

// =============================================================================
// BILLING LOGIC
// =============================================================================
async function determineBillableVolley(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  seekerId: string,
  earnerId: string,
  logger: Logger
): Promise<boolean> {
  const isSenderSeeker = senderId === seekerId;

  if (!isSenderSeeker) {
    // Earners don't pay for messages
    return false;
  }

  // Check the last billable message to determine if a new volley should be billed
  const { data: lastMessages, error } = await supabase
    .from("messages")
    .select("sender_id, is_billable_volley")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    logger.warn("last_messages_fetch_failed", { error: error.message, conversationId });
    // Fail open: charge to be safe
    return true;
  }

  const lastBillable = lastMessages?.find((m) => m.is_billable_volley);

  // Bill if no previous billable message, or the last billable was from earner
  return !lastBillable || lastBillable.sender_id === earnerId;
}

async function processBilling(
  supabase: SupabaseClient,
  payerUserId: string,
  earnerId: string,
  creditsRequired: number,
  logger: Logger
): Promise<BillingResult> {
  const { platformFee, providerEarning } = calculateBillingAmounts(creditsRequired);

  // Get payer wallet
  const payerWallet = await getOrCreateWallet(supabase, payerUserId, logger);

  if (payerWallet.credit_balance < creditsRequired) {
    throw new Error(
      `Insufficient credits. Required: ${creditsRequired}, Available: ${payerWallet.credit_balance}`
    );
  }

  // Attempt debit with retry
  let debitResult = -1;
  let currentBalance = payerWallet.credit_balance;

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    debitResult = await deductCreditsAtomic(
      supabase,
      payerUserId,
      currentBalance,
      creditsRequired,
      logger
    );

    if (debitResult >= 0) {
      break;
    }

    if (attempt < CONFIG.maxRetries) {
      await sleep(CONFIG.retryDelayMs * (attempt + 1));

      // Refresh balance for next attempt
      const refreshedWallet = await getOrCreateWallet(supabase, payerUserId, logger);
      currentBalance = refreshedWallet.credit_balance;

      if (currentBalance < creditsRequired) {
        throw new Error(
          `Insufficient credits. Required: ${creditsRequired}, Available: ${currentBalance}`
        );
      }

      logger.info("debit_retry", { attempt: attempt + 1, currentBalance });
    }
  }

  if (debitResult < 0) {
    throw new Error("Failed to process payment. Please try again.");
  }

  const newBalance = debitResult;
  logger.info("credits_debited", { payerUserId, amount: creditsRequired, newBalance });

  // Attempt to credit earner
  const earnerWallet = await getOrCreateWallet(supabase, earnerId, logger);
  let earnApplied = false;
  let earnerPending = earnerWallet.pending_earnings;

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    earnApplied = await addEarningsAtomic(supabase, earnerId, earnerPending, providerEarning, logger);

    if (earnApplied) {
      break;
    }

    if (attempt < CONFIG.maxRetries) {
      await sleep(CONFIG.retryDelayMs * (attempt + 1));
      const refreshedEarner = await getOrCreateWallet(supabase, earnerId, logger);
      earnerPending = refreshedEarner.pending_earnings;
      logger.info("earnings_retry", { attempt: attempt + 1, earnerPending });
    }
  }

  if (!earnApplied) {
    // Rollback debit
    logger.error("earnings_credit_failed_rollback", null, { earnerId, providerEarning });
    const rolledBack = await rollbackDebit(supabase, payerUserId, newBalance, creditsRequired, logger);

    if (!rolledBack) {
      // Critical: Manual intervention needed
      logger.error("CRITICAL_billing_inconsistency", null, {
        payerUserId,
        earnerId,
        creditsRequired,
        providerEarning,
        debitedBalance: newBalance,
      });
    }

    throw new Error("Billing failed. No credits were charged. Please try again.");
  }

  logger.info("earnings_credited", { earnerId, amount: providerEarning });

  return {
    charged: true,
    creditsSpent: creditsRequired,
    newBalance,
    earnerAmount: providerEarning,
    platformFee,
  };
}

// =============================================================================
// MESSAGE PROCESSING
// =============================================================================
async function insertMessage(
  supabase: SupabaseClient,
  params: {
    conversationId: string;
    senderId: string;
    recipientId: string;
    content: string;
    messageType: MessageType;
    billing: BillingResult;
    isBillableVolley: boolean;
  },
  logger: Logger
): Promise<MessageResult> {
  const replyDeadline = params.isBillableVolley
    ? new Date(Date.now() + CONFIG.replyDeadlineHours * 60 * 60 * 1000).toISOString()
    : null;

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      recipient_id: params.recipientId,
      content: params.content,
      message_type: params.messageType,
      credits_cost: params.billing.charged ? params.billing.creditsSpent : 0,
      earner_amount: params.billing.earnerAmount,
      platform_fee: params.billing.platformFee,
      is_billable_volley: params.isBillableVolley,
      reply_deadline: replyDeadline,
      billed_at: params.billing.charged ? new Date().toISOString() : null,
    })
    .select("id, conversation_id, sender_id, recipient_id, content, message_type, credits_cost, earner_amount, platform_fee, is_billable_volley, reply_deadline, created_at")
    .single();

  if (error) {
    logger.error("message_insert_failed", error, { conversationId: params.conversationId });
    throw new Error(`Failed to send message: ${error.message}`);
  }

  return message as MessageResult;
}

async function updateConversationTimestamp(
  supabase: SupabaseClient,
  conversationId: string,
  logger: Logger
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) {
    // Non-critical: log but don't fail
    logger.warn("conversation_timestamp_update_failed", { error: error.message, conversationId });
  }
}

// =============================================================================
// REQUEST VALIDATION
// =============================================================================
interface ValidationResult {
  valid: true;
  recipientId: string;
  content: string;
  messageType: MessageType;
  conversationId: string | null;
}

interface ValidationError {
  valid: false;
  error: string;
  code: string;
}

function validateRequest(body: RequestBody): ValidationResult | ValidationError {
  const { recipientId, content, messageType = "text", conversationId } = body;

  if (!recipientId) {
    return { valid: false, error: "recipientId is required", code: "missing_recipient" };
  }

  if (!isValidUUID(recipientId)) {
    return { valid: false, error: "Invalid recipientId format", code: "invalid_recipient" };
  }

  if (conversationId !== undefined && conversationId !== null && !isValidUUID(conversationId)) {
    return { valid: false, error: "Invalid conversationId format", code: "invalid_conversation_id" };
  }

  if (!isValidMessageType(messageType)) {
    return { valid: false, error: "messageType must be 'text' or 'image'", code: "invalid_message_type" };
  }

  const sanitizedContent = sanitizeTextContent(content || "");

  if (sanitizedContent.length === 0) {
    return { valid: false, error: "Message content cannot be empty", code: "empty_content" };
  }

  if (sanitizedContent.length > MESSAGE_MAX_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds maximum length of ${MESSAGE_MAX_LENGTH} characters`,
      code: "content_too_long",
    };
  }

  return {
    valid: true,
    recipientId,
    content: sanitizedContent,
    messageType,
    conversationId: conversationId || null,
  };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
serve(async (req: Request): Promise<Response> => {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  const corsHeaders = getCorsHeaders(req);

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Method check
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", code: "method_not_allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.now();
  logger.info("request_started");

  try {
    // Environment validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error("missing_config", new Error("Missing Supabase configuration"));
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      logger.info("validation_failed", { error: validation.error, code: validation.code });
      return createErrorResponse(validation.error, validation.code, corsHeaders, 400);
    }

    const { recipientId, content, messageType, conversationId: existingConversationId } = validation;

    // Self-message check
    if (recipientId === user.id) {
      return createErrorResponse("Cannot send message to yourself", "self_message", corsHeaders, 400);
    }

    logger.info("input_validated", {
      recipientId,
      messageType,
      contentLength: content.length,
      hasExistingConversation: !!existingConversationId,
    });

    // Resolve conversation
    const { conversationId, seekerId, earnerId, payerUserId } = await getOrCreateConversation(
      supabase,
      existingConversationId,
      user.id,
      recipientId,
      logger
    );

    logger.setContext({ conversationId });
    logger.info("conversation_resolved", { seekerId, earnerId, payerUserId });

    // Determine billing
    const isBillableVolley = await determineBillableVolley(
      supabase,
      conversationId,
      user.id,
      seekerId,
      earnerId,
      logger
    );

    const creditsRequired = getCreditsForMessageType(messageType);

    // Process billing if needed
    let billing: BillingResult = {
      charged: false,
      creditsSpent: 0,
      newBalance: 0,
      earnerAmount: 0,
      platformFee: 0,
    };

    if (isBillableVolley) {
      logger.info("billing_required", { creditsRequired });
      billing = await processBilling(supabase, payerUserId, earnerId, creditsRequired, logger);
    }

    // Insert message
    const message = await insertMessage(
      supabase,
      {
        conversationId,
        senderId: user.id,
        recipientId,
        content,
        messageType,
        billing,
        isBillableVolley,
      },
      logger
    );

    // Update conversation (fire-and-forget, non-blocking)
    updateConversationTimestamp(supabase, conversationId, logger);

    const duration = Date.now() - startTime;
    logger.info("request_completed", {
      messageId: message.id,
      charged: billing.charged,
      creditsSpent: billing.creditsSpent,
      durationMs: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: {
          id: message.id,
          conversationId: message.conversation_id,
          senderId: message.sender_id,
          recipientId: message.recipient_id,
          content: message.content,
          messageType: message.message_type,
          createdAt: message.created_at,
          replyDeadline: message.reply_deadline,
        },
        billing: {
          charged: billing.charged,
          creditsSpent: billing.creditsSpent,
          newBalance: billing.newBalance,
        },
        conversationId,
        requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    logger.error("request_failed", error, { durationMs: duration });

    // Map known errors to appropriate responses
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("Insufficient credits")) {
      return createErrorResponse(errorMessage, "insufficient_credits", corsHeaders, 402);
    }

    if (errorMessage.includes("Forbidden")) {
      return createErrorResponse("You do not have access to this conversation", "forbidden", corsHeaders, 403);
    }

    if (errorMessage.includes("not found")) {
      return createErrorResponse(errorMessage, "not_found", corsHeaders, 404);
    }

    return createAutoErrorResponse(error, corsHeaders);
  }
});
