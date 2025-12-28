import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse, createErrorResponse } from "../_shared/errors.ts";
import { MESSAGE_MAX_LENGTH } from "../_shared/validation.ts";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  credits: {
    text: 5,
    image: 10,
  },
  usdPerCredit: 0.1,
  platformFeePercent: 0.3,
  providerEarningPercent: 0.7,
  volleyWindowHours: 12,
} as const;

// =============================================================================
// LOGGING
// =============================================================================

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-MESSAGE-VOLLEY] ${step}${detailsStr}`);
};

// =============================================================================
// TYPES
// =============================================================================

interface ConversationContext {
  conversationId: string;
  seekerId: string;
  earnerId: string;
  payerUserId: string;
  isNew: boolean;
}

interface BillingResult {
  charged: boolean;
  creditsSpent: number;
  newBalance: number | null;
  earnerAmount: number;
  platformFee: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get credits cost based on message type
 */
function getCreditsForMessageType(messageType: string): number {
  return messageType === "image" ? CONFIG.credits.image : CONFIG.credits.text;
}

/**
 * Calculate billing amounts from credits
 */
function calculateBillingAmounts(credits: number) {
  const usdAmount = credits * CONFIG.usdPerCredit;
  const platformFee = usdAmount * CONFIG.platformFeePercent;
  const providerEarning = usdAmount * CONFIG.providerEarningPercent;
  return { usdAmount, platformFee, providerEarning };
}

/**
 * Get or create a wallet for a user
 */
async function getOrCreateWallet(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ credit_balance: number; pending_earnings: number }> {
  const { data: wallet, error } = await supabaseAdmin
    .from("wallets")
    .select("credit_balance, pending_earnings")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Error fetching wallet: ${error.message}`);

  if (wallet) return wallet;

  // Create wallet if doesn't exist
  const { data: newWallet, error: createError } = await supabaseAdmin
    .from("wallets")
    .insert({ user_id: userId, credit_balance: 0, pending_earnings: 0 })
    .select("credit_balance, pending_earnings")
    .single();

  if (createError) throw new Error(`Error creating wallet: ${createError.message}`);
  return newWallet;
}

/**
 * Get or create conversation and return context
 */
async function getOrCreateConversation(
  supabaseAdmin: ReturnType<typeof createClient>,
  senderId: string,
  recipientId: string,
  existingConversationId: string | null,
): Promise<ConversationContext> {
  if (existingConversationId) {
    const { data: conv, error } = await supabaseAdmin
      .from("conversations")
      .select("id, seeker_id, earner_id, payer_user_id")
      .eq("id", existingConversationId)
      .maybeSingle();

    if (error) throw new Error(`Error fetching conversation: ${error.message}`);
    if (!conv) throw new Error("Conversation not found");

    // Set payer on first message if not set (seeker always pays)
    let payerUserId = conv.payer_user_id;
    if (!payerUserId) {
      payerUserId = conv.seeker_id;
      await supabaseAdmin.from("conversations").update({ payer_user_id: payerUserId }).eq("id", conv.id);
      logStep("Set payer_user_id", { payerUserId });
    }

    return {
      conversationId: conv.id,
      seekerId: conv.seeker_id,
      earnerId: conv.earner_id,
      payerUserId,
      isNew: false,
    };
  }

  // Create new conversation - sender initiates, so they are the seeker
  const { data: newConv, error } = await supabaseAdmin
    .from("conversations")
    .insert({
      seeker_id: senderId,
      earner_id: recipientId,
      payer_user_id: senderId,
    })
    .select("id, seeker_id, earner_id, payer_user_id")
    .single();

  if (error) throw new Error(`Error creating conversation: ${error.message}`);

  logStep("Created new conversation", { conversationId: newConv.id });

  return {
    conversationId: newConv.id,
    seekerId: newConv.seeker_id,
    earnerId: newConv.earner_id,
    payerUserId: newConv.payer_user_id!,
    isNew: true,
  };
}

/**
 * Process billing for a message
 * - Seeker sends: Charge immediately, earner gets paid when they reply
 * - Earner sends: Complete the volley, charge the seeker's pending message
 */
async function processBilling(
  supabaseAdmin: ReturnType<typeof createClient>,
  context: ConversationContext,
  senderId: string,
  messageId: string,
  messageType: string,
): Promise<BillingResult> {
  const { conversationId, seekerId, earnerId, payerUserId } = context;
  const isEarnerSending = senderId === earnerId;
  const isSeekerSending = senderId === seekerId;

  const result: BillingResult = {
    charged: false,
    creditsSpent: 0,
    newBalance: null,
    earnerAmount: 0,
    platformFee: 0,
  };

  if (isSeekerSending) {
    // =======================================================================
    // SEEKER SENDING: Check balance, mark message as pending billing
    // The actual charge happens when earner replies (volley complete)
    // =======================================================================
    const credits = getCreditsForMessageType(messageType);
    const wallet = await getOrCreateWallet(supabaseAdmin, seekerId);

    if (wallet.credit_balance < credits) {
      throw new Error(`Insufficient credits. Required: ${credits}, Available: ${wallet.credit_balance}`);
    }

    // Mark message as awaiting billing (billed_at = null means pending)
    // The message will be billed when earner replies
    logStep("Seeker message pending billing", { credits, messageType });
  } else if (isEarnerSending) {
    // =======================================================================
    // EARNER SENDING: Complete the volley, charge the seeker
    // =======================================================================
    const volleyWindowStart = new Date();
    volleyWindowStart.setHours(volleyWindowStart.getHours() - CONFIG.volleyWindowHours);

    // Find unbilled seeker messages in the volley window
    const { data: seekerMessages, error: msgError } = await supabaseAdmin
      .from("messages")
      .select("id, created_at, message_type")
      .eq("conversation_id", conversationId)
      .eq("sender_id", seekerId)
      .is("billed_at", null)
      .gte("created_at", volleyWindowStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (msgError) {
      logStep("Error checking seeker messages", { error: msgError.message });
      return result;
    }

    if (!seekerMessages || seekerMessages.length === 0) {
      logStep("No unbilled seeker messages - free reply");
      return result;
    }

    // Billable volley detected!
    const seekerMessage = seekerMessages[0];
    const seekerMessageType = seekerMessage.message_type || "text";
    const credits = getCreditsForMessageType(seekerMessageType);
    const { usdAmount, platformFee, providerEarning } = calculateBillingAmounts(credits);

    logStep("Billable volley detected", {
      seekerMessageId: seekerMessage.id,
      seekerMessageType,
      credits,
    });

    // Get seeker's wallet
    const seekerWallet = await getOrCreateWallet(supabaseAdmin, seekerId);

    if (seekerWallet.credit_balance < credits) {
      throw new Error(`Insufficient credits. Required: ${credits}, Available: ${seekerWallet.credit_balance}`);
    }

    // 1. Deduct credits from seeker
    const newBalance = seekerWallet.credit_balance - credits;
    const { error: deductError } = await supabaseAdmin
      .from("wallets")
      .update({
        credit_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", seekerId);

    if (deductError) throw new Error(`Error deducting credits: ${deductError.message}`);
    logStep("Credits deducted from seeker", { newBalance });

    // 2. Add earnings to earner's pending balance
    const earnerWallet = await getOrCreateWallet(supabaseAdmin, earnerId);
    const { error: earningsError } = await supabaseAdmin
      .from("wallets")
      .update({
        pending_earnings: (earnerWallet.pending_earnings || 0) + providerEarning,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", earnerId);

    if (earningsError) {
      logStep("Error updating earner earnings", { error: earningsError.message });
    } else {
      logStep("Earner earnings updated", { earnerId, providerEarning });
    }

    // 3. Create ledger entries
    const ledgerEntries = [
      {
        user_id: seekerId,
        entry_type: "volley_spend",
        credits_delta: -credits,
        usd_delta: -usdAmount,
        reference_id: messageId,
        reference_type: "message",
        description: seekerMessageType === "image" ? "Image message volley charge" : "Message volley charge",
      },
      {
        user_id: seekerId,
        entry_type: "platform_fee",
        credits_delta: 0,
        usd_delta: platformFee,
        reference_id: messageId,
        reference_type: "message",
        description: "Platform fee (30%)",
      },
      {
        user_id: earnerId,
        entry_type: "provider_earning",
        credits_delta: 0,
        usd_delta: providerEarning,
        reference_id: messageId,
        reference_type: "message",
        description: "Message earning (70%)",
      },
    ];

    const { error: ledgerError } = await supabaseAdmin.from("ledger_entries").insert(ledgerEntries);

    if (ledgerError) {
      logStep("Error creating ledger entries", { error: ledgerError.message });
    } else {
      logStep("Ledger entries created", { count: 3 });
    }

    // 4. Mark seeker's message as billed
    await supabaseAdmin.from("messages").update({ billed_at: new Date().toISOString() }).eq("id", seekerMessage.id);

    // 5. Update earner's reply with billing info
    await supabaseAdmin
      .from("messages")
      .update({
        is_billable_volley: true,
        credits_cost: credits,
        earner_amount: providerEarning,
        platform_fee: platformFee,
      })
      .eq("id", messageId);

    result.charged = true;
    result.creditsSpent = credits;
    result.newBalance = newBalance;
    result.earnerAmount = providerEarning;
    result.platformFee = platformFee;

    logStep("Volley billing complete", result);
  }

  return result;
}

/**
 * Send email notification (fire and forget)
 */
async function sendEmailNotification(
  supabaseAdmin: ReturnType<typeof createClient>,
  senderId: string,
  recipientId: string,
): Promise<void> {
  try {
    const { data: senderProfile } = await supabaseAdmin.from("profiles").select("name").eq("id", senderId).single();

    const senderName = senderProfile?.name || "Someone";
    const notificationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`;

    fetch(notificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        type: "new_message",
        recipientId,
        senderName,
      }),
    })
      .then((res) => {
        logStep(res.ok ? "Email notification sent" : "Email notification failed", {
          status: res.status,
        });
      })
      .catch((err) => {
        logStep("Email notification error", { error: err.message });
      });
  } catch (error) {
    logStep("Email notification setup error", { error: String(error) });
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAnon = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    logStep("Function started");

    // =========================================================================
    // AUTHENTICATION
    // =========================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided. Please ensure you are logged in.");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);

    if (userError) {
      logStep("Auth error", { error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }

    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const senderId = user.id;
    logStep("User authenticated", { senderId });

    // =========================================================================
    // PARSE & VALIDATE REQUEST
    // =========================================================================
    const { conversationId, recipientId, content, messageType = "text" } = await req.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return createErrorResponse(new Error("Message content is required"), "invalid_input", corsHeaders);
    }

    if (content.length > MESSAGE_MAX_LENGTH) {
      return createErrorResponse(
        new Error(`Message exceeds maximum length of ${MESSAGE_MAX_LENGTH} characters`),
        "invalid_input",
        corsHeaders,
      );
    }

    if (!recipientId) {
      return createErrorResponse(new Error("recipientId is required"), "invalid_input", corsHeaders);
    }

    logStep("Request parsed", { conversationId, recipientId, messageType });

    // =========================================================================
    // GET OR CREATE CONVERSATION
    // =========================================================================
    const context = await getOrCreateConversation(supabaseAdmin, senderId, recipientId, conversationId);

    logStep("Conversation context", {
      conversationId: context.conversationId,
      seekerId: context.seekerId,
      earnerId: context.earnerId,
      payerUserId: context.payerUserId,
      isNew: context.isNew,
    });

    // =========================================================================
    // INSERT MESSAGE
    // =========================================================================
    const { data: newMessage, error: msgError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: context.conversationId,
        sender_id: senderId,
        recipient_id: recipientId,
        content: content.trim(),
        message_type: messageType,
        credits_cost: 0,
        earner_amount: 0,
        platform_fee: 0,
        is_billable_volley: false,
      })
      .select("id, created_at")
      .single();

    if (msgError) throw new Error(`Error inserting message: ${msgError.message}`);
    logStep("Message inserted", { messageId: newMessage.id });

    // =========================================================================
    // PROCESS BILLING
    // =========================================================================
    const billingResult = await processBilling(supabaseAdmin, context, senderId, newMessage.id, messageType);

    // =========================================================================
    // UPDATE CONVERSATION
    // =========================================================================
    const { error: updateError } = await supabaseAdmin
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
      })
      .eq("id", context.conversationId);

    if (updateError) {
      logStep("Error updating conversation", { error: updateError.message });
    }

    // Increment total_messages using RPC or direct SQL would be better,
    // but for now we'll do a separate query
    const { data: convData } = await supabaseAdmin
      .from("conversations")
      .select("total_messages")
      .eq("id", context.conversationId)
      .single();

    if (convData) {
      await supabaseAdmin
        .from("conversations")
        .update({ total_messages: (convData.total_messages || 0) + 1 })
        .eq("id", context.conversationId);
    }

    // =========================================================================
    // SEND EMAIL NOTIFICATION (async)
    // =========================================================================
    sendEmailNotification(supabaseAdmin, senderId, recipientId);

    // =========================================================================
    // RETURN RESPONSE
    // =========================================================================
    logStep("Function completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message_id: newMessage.id,
        conversation_id: context.conversationId,
        is_billable_volley: billingResult.charged,
        credits_spent: billingResult.creditsSpent,
        new_balance: billingResult.newBalance,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
