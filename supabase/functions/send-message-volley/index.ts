import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
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
};

// =============================================================================
// TYPES
// =============================================================================
interface WalletData {
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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-MESSAGE-VOLLEY] ${step}${detailsStr}`);
};

function getCreditsForMessageType(messageType: string): number {
  return messageType === 'image' ? CONFIG.credits.image : CONFIG.credits.text;
}

function calculateBillingAmounts(credits: number) {
  const { grossUsd, creatorUsd, platformUsd } = calculateEarnings(credits);
  return { usdAmount: grossUsd, platformFee: platformUsd, providerEarning: creatorUsd };
}

// deno-lint-ignore no-explicit-any
async function getOrCreateWallet(supabaseAdmin: any, userId: string): Promise<WalletData> {
  const { data: wallet, error } = await supabaseAdmin
    .from("wallets")
    .select("credit_balance, pending_earnings")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Error fetching wallet: ${error.message}`);

  if (wallet) return wallet as WalletData;

  const { data: newWallet, error: createError } = await supabaseAdmin
    .from("wallets")
    .insert({ user_id: userId, credit_balance: 0, pending_earnings: 0 })
    .select("credit_balance, pending_earnings")
    .single();

  if (createError) {
    const msg = createError.message || "";
    const code = (createError as { code?: string }).code;
    // tolerate concurrent wallet creation
    if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
      const { data: retryWallet, error: retryError } = await supabaseAdmin
        .from("wallets")
        .select("credit_balance, pending_earnings")
        .eq("user_id", userId)
        .maybeSingle();
      if (retryError || !retryWallet) throw new Error(`Error creating wallet: ${createError.message}`);
      return retryWallet as WalletData;
    }
    throw new Error(`Error creating wallet: ${createError.message}`);
  }
  return newWallet as WalletData;
}

// deno-lint-ignore no-explicit-any
async function getOrCreateConversation(
  supabaseAdmin: any,
  existingConversationId: string | null,
  senderId: string,
  recipientId: string
): Promise<{ conversationId: string; seekerId: string; earnerId: string; payerUserId: string }> {
  if (existingConversationId) {
    const { data: conv, error } = await supabaseAdmin
      .from("conversations")
      .select("id, seeker_id, earner_id, payer_user_id")
      .eq("id", existingConversationId)
      .maybeSingle();

    if (error) throw new Error(`Error fetching conversation: ${error.message}`);
    if (!conv) throw new Error("Conversation not found");

    const convData = conv as ConversationData;

    // P0: prevent cross-user access since we use service role
    if (senderId !== convData.seeker_id && senderId !== convData.earner_id) {
      logStep("FORBIDDEN: sender not part of conversation", { senderId, conversationId: existingConversationId });
      throw new Error("Forbidden");
    }

    const payerUserId = convData.payer_user_id || convData.seeker_id;

    return {
      conversationId: convData.id,
      seekerId: convData.seeker_id,
      earnerId: convData.earner_id,
      payerUserId,
    };
  }

  // Create new conversation
  const { data: senderProfile } = await supabaseAdmin
    .from("profiles")
    .select("user_type")
    .eq("id", senderId)
    .single();

  const { data: recipientProfile } = await supabaseAdmin
    .from("profiles")
    .select("user_type")
    .eq("id", recipientId)
    .single();

  const senderType = senderProfile?.user_type || "seeker";
  const recipientType = recipientProfile?.user_type || "earner";

  let seekerId: string, earnerId: string, payerUserId: string;

  if (senderType === "seeker") {
    seekerId = senderId;
    earnerId = recipientId;
    payerUserId = senderId;
  } else {
    seekerId = recipientId;
    earnerId = senderId;
    payerUserId = recipientId;
  }

  const { data: newConv, error: createError } = await supabaseAdmin
    .from("conversations")
    .insert({
      seeker_id: seekerId,
      earner_id: earnerId,
      payer_user_id: payerUserId,
    })
    .select("id")
    .single();

  if (createError) throw new Error(`Error creating conversation: ${createError.message}`);

  return {
    conversationId: newConv.id,
    seekerId,
    earnerId,
    payerUserId,
  };
}

// deno-lint-ignore no-explicit-any
async function processMessage(
  supabaseAdmin: any,
  senderId: string,
  recipientId: string,
  content: string,
  messageType: string,
  conversationId: string,
  seekerId: string,
  earnerId: string,
  payerUserId: string
): Promise<{ message: Record<string, unknown>; billing: BillingResult }> {
  // Determine if this is a billable volley
  // A volley is billable when the seeker sends a message AND earner hasn't replied yet
  const isSenderSeeker = senderId === seekerId;

  // Check last message to determine if this starts a new billing cycle
  const { data: lastMessages } = await supabaseAdmin
    .from("messages")
    .select("sender_id, is_billable_volley")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Billable if seeker is sending and the last billable message was from earner (or none exists)
  let isBillableVolley = false;
  if (isSenderSeeker) {
    const lastBillable = lastMessages?.find((m: { is_billable_volley: boolean }) => m.is_billable_volley);
    if (!lastBillable || lastBillable.sender_id === earnerId) {
      isBillableVolley = true;
    }
  }

  const creditsForMessage = getCreditsForMessageType(messageType);
  const { platformFee, providerEarning } = calculateBillingAmounts(creditsForMessage);

  let billing: BillingResult = {
    charged: false,
    creditsSpent: 0,
    newBalance: 0,
    earnerAmount: 0,
    platformFee: 0,
  };

  if (isBillableVolley) {
    // Get payer wallet and check balance
    const payerWallet = await getOrCreateWallet(supabaseAdmin, payerUserId);
    
    if (payerWallet.credit_balance < creditsForMessage) {
      throw new Error(`Insufficient credits. Need ${creditsForMessage}, have ${payerWallet.credit_balance}`);
    }

    // Deduct credits from payer (CAS-style to reduce race conditions)
    const newBalance = payerWallet.credit_balance - creditsForMessage;
    const { data: updatedWalletRows, error: deductError } = await supabaseAdmin
      .from("wallets")
      .update({ credit_balance: newBalance })
      .eq("user_id", payerUserId)
      .eq("credit_balance", payerWallet.credit_balance)
      .select("credit_balance");

    if (deductError) throw new Error(`Error deducting credits: ${deductError.message}`);

    if (!updatedWalletRows || updatedWalletRows.length !== 1) {
      // Balance changed between read and update; fail closed.
      const latest = await getOrCreateWallet(supabaseAdmin, payerUserId);
      if (latest.credit_balance < creditsForMessage) {
        throw new Error(`Insufficient credits. Need ${creditsForMessage}, have ${latest.credit_balance}`);
      }
      throw new Error("Credit balance changed. Please retry.");
    }

    const updatedBalance = (updatedWalletRows[0] as { credit_balance: number }).credit_balance;

    // Add earnings to earner (CAS-style). If this fails after debit, rollback debit best-effort.
    const earnerWallet = await getOrCreateWallet(supabaseAdmin, earnerId);
    const newPending = Number((earnerWallet.pending_earnings + providerEarning).toFixed(2));

    let earnApplied = false;
    {
      const { data: earnRows, error: earnError } = await supabaseAdmin
        .from("wallets")
        .update({ pending_earnings: newPending })
        .eq("user_id", earnerId)
        .eq("pending_earnings", earnerWallet.pending_earnings)
        .select("pending_earnings");

      if (earnError) {
        logStep("ERROR: earnings update failed after debit", { error: earnError.message, earnerId });
      } else if (earnRows && earnRows.length === 1) {
        earnApplied = true;
      } else {
        // one retry on contention
        const latestEarner = await getOrCreateWallet(supabaseAdmin, earnerId);
        const retryPending = Number((latestEarner.pending_earnings + providerEarning).toFixed(2));
        const { data: retryRows, error: retryError } = await supabaseAdmin
          .from("wallets")
          .update({ pending_earnings: retryPending })
          .eq("user_id", earnerId)
          .eq("pending_earnings", latestEarner.pending_earnings)
          .select("pending_earnings");
        if (retryError) {
          logStep("ERROR: earnings retry failed after debit", { error: retryError.message, earnerId });
        } else if (retryRows && retryRows.length === 1) {
          earnApplied = true;
        }
      }
    }

    if (!earnApplied) {
      // Best-effort rollback of debit
      const rollbackTarget = updatedBalance;
      const { data: rollbackRows, error: rollbackError } = await supabaseAdmin
        .from("wallets")
        .update({ credit_balance: rollbackTarget + creditsForMessage })
        .eq("user_id", payerUserId)
        .eq("credit_balance", rollbackTarget)
        .select("credit_balance");

      if (rollbackError || !rollbackRows || rollbackRows.length !== 1) {
        logStep("CRITICAL: Failed to rollback debit after earnings failure", {
          payerUserId,
          rollbackError: rollbackError?.message,
        });
      } else {
        logStep("Rolled back debit after earnings failure", { payerUserId });
      }

      throw new Error("Billing failed. No credits were charged.");
    }

    billing = {
      charged: true,
      creditsSpent: creditsForMessage,
      newBalance: updatedBalance,
      earnerAmount: providerEarning,
      platformFee: platformFee,
    };
  }

  // Calculate reply deadline (24 hours from now)
  const replyDeadline = new Date(Date.now() + CONFIG.replyDeadlineHours * 60 * 60 * 1000).toISOString();

  // Insert message
  const { data: message, error: messageError } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_id: recipientId,
      content,
      message_type: messageType,
      credits_cost: billing.charged ? creditsForMessage : 0,
      earner_amount: billing.earnerAmount,
      platform_fee: billing.platformFee,
      is_billable_volley: isBillableVolley,
      reply_deadline: isBillableVolley ? replyDeadline : null,
      billed_at: billing.charged ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (messageError) throw new Error(`Error inserting message: ${messageError.message}`);

  // Update conversation stats
  await supabaseAdmin
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  return { message: message as Record<string, unknown>, billing };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep("Request received");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Centralized auth verification
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) return createErrorResponse("Unauthorized", "unauthorized", corsHeaders, 401);

    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const body = await req.json();
    const { recipientId, content, messageType = "text", conversationId: existingConversationId } = body;

    // Validate inputs
    if (!recipientId || !isValidUUID(recipientId)) {
      return createErrorResponse("Invalid recipientId", "invalid_input", corsHeaders, 400);
    }

    if (recipientId === user.id) {
      return createErrorResponse("Cannot send message to yourself", "invalid_input", corsHeaders, 400);
    }

    const sanitizedContent = sanitizeTextContent(content || "");
    if (sanitizedContent.length === 0) {
      return createErrorResponse("Message content cannot be empty", "invalid_input", corsHeaders, 400);
    }

    if (sanitizedContent.length > MESSAGE_MAX_LENGTH) {
      return createErrorResponse(`Message too long (max ${MESSAGE_MAX_LENGTH} chars)`, "invalid_input", corsHeaders, 400);
    }

    if (!["text", "image"].includes(messageType)) {
      return createErrorResponse("Invalid message type", "invalid_input", corsHeaders, 400);
    }

    logStep("Input validated", { recipientId, messageType, contentLength: sanitizedContent.length });

    // Get or create conversation
    const { conversationId, seekerId, earnerId, payerUserId } = await getOrCreateConversation(
      supabaseAdmin,
      existingConversationId,
      user.id,
      recipientId
    );

    logStep("Conversation resolved", { conversationId, seekerId, earnerId, payerUserId });

    // Process and send message
    const { message, billing } = await processMessage(
      supabaseAdmin,
      user.id,
      recipientId,
      sanitizedContent,
      messageType,
      conversationId,
      seekerId,
      earnerId,
      payerUserId
    );

    logStep("Message sent successfully", {
      messageId: message.id,
      charged: billing.charged,
      creditsSpent: billing.creditsSpent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message,
        billing: {
          charged: billing.charged,
          creditsSpent: billing.creditsSpent,
          newBalance: billing.newBalance,
        },
        conversationId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[SEND-MESSAGE-VOLLEY] Error:", error);
    return createAutoErrorResponse(error, corsHeaders);
  }
});
