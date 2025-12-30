import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse, createErrorResponse } from "../_shared/errors.ts";
import { MESSAGE_MAX_LENGTH, isValidUUID, sanitizeTextContent } from "../_shared/validation.ts";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  credits: {
    text: 5,
    image: 10,
  },
  usdPerCredit: 0.10,
  platformFeePercent: 0.30,
  providerEarningPercent: 0.70,
  volleyWindowHours: 12,
  replyDeadlineHours: 12, // Time earner has to reply before refund
} as const;

// =============================================================================
// LOGGING
// =============================================================================

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
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

interface ProfileData {
  id: string;
  user_type: string;
}

interface MessageData {
  id: string;
  sender_id: string;
  is_billable_volley: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getCreditsForMessageType(messageType: string): number {
  return messageType === 'image' ? CONFIG.credits.image : CONFIG.credits.text;
}

function calculateBillingAmounts(credits: number) {
  const usdAmount = credits * CONFIG.usdPerCredit;
  const platformFee = usdAmount * CONFIG.platformFeePercent;
  const providerEarning = usdAmount * CONFIG.providerEarningPercent;
  return { usdAmount, platformFee, providerEarning };
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

  if (createError) throw new Error(`Error creating wallet: ${createError.message}`);
  return newWallet as WalletData;
}

// deno-lint-ignore no-explicit-any
async function getOrCreateConversation(
  supabaseAdmin: any,
  senderId: string,
  recipientId: string,
  existingConversationId: string | null
): Promise<ConversationContext> {
  if (existingConversationId) {
    const { data: conv, error } = await supabaseAdmin
      .from("conversations")
      .select("id, seeker_id, earner_id, payer_user_id")
      .eq("id", existingConversationId)
      .maybeSingle();

    if (error) throw new Error(`Error fetching conversation: ${error.message}`);
    if (!conv) throw new Error("Conversation not found");

    const convData = conv as ConversationData;
    const payerUserId = convData.payer_user_id || convData.seeker_id;

    return {
      conversationId: convData.id,
      seekerId: convData.seeker_id,
      earnerId: convData.earner_id,
      payerUserId: payerUserId,
      isNew: false,
    };
  }

  // Determine roles - sender and recipient profiles needed
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, user_type")
    .in("id", [senderId, recipientId]);

  if (profilesError) throw new Error(`Error fetching profiles: ${profilesError.message}`);
  if (!profiles || profiles.length !== 2) throw new Error("Could not find both user profiles");

  const profilesData = profiles as ProfileData[];
  const senderProfile = profilesData.find((p) => p.id === senderId);
  const recipientProfile = profilesData.find((p) => p.id === recipientId);

  if (!senderProfile || !recipientProfile) {
    throw new Error("Could not find both user profiles");
  }

  let seekerId: string;
  let earnerId: string;

  if (senderProfile.user_type === 'seeker') {
    seekerId = senderId;
    earnerId = recipientId;
  } else if (recipientProfile.user_type === 'seeker') {
    seekerId = recipientId;
    earnerId = senderId;
  } else {
    // Default: treat sender as seeker
    seekerId = senderId;
    earnerId = recipientId;
  }

  // Create the conversation
  const { data: newConv, error: createError } = await supabaseAdmin
    .from("conversations")
    .insert({
      seeker_id: seekerId,
      earner_id: earnerId,
      payer_user_id: seekerId,
    })
    .select("id")
    .single();

  if (createError) throw new Error(`Error creating conversation: ${createError.message}`);

  return {
    conversationId: (newConv as { id: string }).id,
    seekerId,
    earnerId,
    payerUserId: seekerId,
    isNew: true,
  };
}

// deno-lint-ignore no-explicit-any
async function checkVolleyWindow(
  supabaseAdmin: any,
  conversationId: string,
  senderId: string
): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - CONFIG.volleyWindowHours);

  const { data: recentMessages, error } = await supabaseAdmin
    .from("messages")
    .select("id, sender_id, is_billable_volley")
    .eq("conversation_id", conversationId)
    .gte("created_at", windowStart.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(`Error checking volley window: ${error.message}`);
  if (!recentMessages || recentMessages.length === 0) return true;

  const messagesData = recentMessages as MessageData[];

  // Check if sender's last message was a billable volley without response
  const lastBillableFromSender = messagesData.find(
    (m) => m.sender_id === senderId && m.is_billable_volley
  );
  
  if (lastBillableFromSender) {
    // Check if there's a response after it
    const lastBillableIndex = messagesData.indexOf(lastBillableFromSender);
    const hasResponse = messagesData.slice(0, lastBillableIndex).some(
      (m) => m.sender_id !== senderId
    );
    if (!hasResponse) return false;
  }

  return true;
}

// deno-lint-ignore no-explicit-any
async function processMessage(
  supabaseAdmin: any,
  conversationContext: ConversationContext,
  senderId: string,
  content: string,
  messageType: string
): Promise<{ message: Record<string, unknown>; billing: BillingResult }> {
  const { conversationId, earnerId, payerUserId } = conversationContext;
  const recipientId = senderId === earnerId ? conversationContext.seekerId : earnerId;

  // Determine if this is a billable volley
  // Image messages are ALWAYS billable for seekers (bypass volley window)
  const isImageMessage = messageType === 'image';
  const isBillableVolley = senderId === payerUserId && (
    isImageMessage || await checkVolleyWindow(supabaseAdmin, conversationId, senderId)
  );
  
  const creditsForMessage = getCreditsForMessageType(messageType);
  const { platformFee, providerEarning } = calculateBillingAmounts(creditsForMessage);

  let billing: BillingResult = {
    charged: false,
    creditsSpent: 0,
    newBalance: null,
    earnerAmount: 0,
    platformFee: 0,
  };

  if (isBillableVolley) {
    // Get payer wallet and check balance
    const payerWallet = await getOrCreateWallet(supabaseAdmin, payerUserId);
    
    if (payerWallet.credit_balance < creditsForMessage) {
      throw new Error(`Insufficient credits. Need ${creditsForMessage}, have ${payerWallet.credit_balance}`);
    }

    // Deduct credits from payer
    const { data: updatedWallet, error: deductError } = await supabaseAdmin
      .from("wallets")
      .update({ credit_balance: payerWallet.credit_balance - creditsForMessage })
      .eq("user_id", payerUserId)
      .select("credit_balance")
      .single();

    if (deductError) throw new Error(`Error deducting credits: ${deductError.message}`);

    // Add earnings to earner
    const earnerWallet = await getOrCreateWallet(supabaseAdmin, earnerId);
    const { error: earnError } = await supabaseAdmin
      .from("wallets")
      .update({ pending_earnings: earnerWallet.pending_earnings + providerEarning })
      .eq("user_id", earnerId);

    if (earnError) throw new Error(`Error adding earnings: ${earnError.message}`);

    billing = {
      charged: true,
      creditsSpent: creditsForMessage,
      newBalance: (updatedWallet as { credit_balance: number }).credit_balance,
      earnerAmount: providerEarning,
      platformFee: platformFee,
    };
  }

  // Calculate reply deadline for billable messages
  const replyDeadline = billing.charged 
    ? new Date(Date.now() + CONFIG.replyDeadlineHours * 60 * 60 * 1000).toISOString()
    : null;

  // Insert the message
  const { data: message, error: messageError } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_id: recipientId,
      content: content,
      message_type: messageType,
      credits_cost: billing.charged ? creditsForMessage : 0,
      earner_amount: billing.earnerAmount,
      platform_fee: billing.platformFee,
      is_billable_volley: isBillableVolley,
      billed_at: billing.charged ? new Date().toISOString() : null,
      reply_deadline: replyDeadline,
    })
    .select()
    .single();

  if (messageError) throw new Error(`Error creating message: ${messageError.message}`);

  // If earner is replying, mark any pending billable messages as replied (prevents refunds)
  if (senderId === earnerId) {
    await supabaseAdmin
      .from("messages")
      .update({ refund_status: 'replied' })
      .eq("conversation_id", conversationId)
      .eq("recipient_id", earnerId)
      .eq("is_billable_volley", true)
      .is("refund_status", null)
      .not("reply_deadline", "is", null);
  }

  // Update conversation stats
  await supabaseAdmin
    .from("conversations")
    .update({
      total_credits_spent: billing.charged ? creditsForMessage : 0,
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

  try {
    logStep("Starting send-message-volley");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse("Missing authorization header", "unauthorized", corsHeaders, 401);
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return createErrorResponse("Unauthorized", "unauthorized", corsHeaders, 401);
    }

    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const body = await req.json();
    const { recipientId, content, messageType = "text", conversationId } = body;

    // Validate recipientId as UUID
    if (!recipientId || !isValidUUID(recipientId)) {
      return createErrorResponse("Missing or invalid recipientId", "invalid_input", corsHeaders, 400);
    }

    if (!content || typeof content !== "string") {
      return createErrorResponse("Missing or invalid content", "invalid_input", corsHeaders, 400);
    }

    if (content.length > MESSAGE_MAX_LENGTH) {
      return createErrorResponse(`Message exceeds maximum length`, "invalid_input", corsHeaders, 400);
    }

    if (messageType !== "text" && messageType !== "image") {
      return createErrorResponse("Invalid message type", "invalid_input", corsHeaders, 400);
    }

    // Validate conversationId if provided
    if (conversationId && !isValidUUID(conversationId)) {
      return createErrorResponse("Invalid conversationId", "invalid_input", corsHeaders, 400);
    }

    // Sanitize message content
    const sanitizedContent = sanitizeTextContent(content);
    if (sanitizedContent.length === 0) {
      return createErrorResponse("Message content cannot be empty after sanitization", "invalid_input", corsHeaders, 400);
    }

    logStep("Request validated", { recipientId, messageType, contentLength: sanitizedContent.length });

    // Get or create conversation
    const conversationContext = await getOrCreateConversation(
      supabaseAdmin,
      user.id,
      recipientId,
      conversationId || null
    );

    logStep("Conversation context", { 
      conversationId: conversationContext.conversationId, 
      isNew: conversationContext.isNew 
    });

    // Process the message with sanitized content
    const { message, billing } = await processMessage(
      supabaseAdmin,
      conversationContext,
      user.id,
      sanitizedContent,
      messageType
    );

    logStep("Message sent successfully", { 
      messageId: message.id, 
      charged: billing.charged,
      creditsSpent: billing.creditsSpent 
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
        conversationId: conversationContext.conversationId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error in send-message-volley", { error: errorMessage });
    return createAutoErrorResponse(error, corsHeaders);
  }
});
