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
  usdPerCredit: 0.10,
  platformFeePercent: 0.30,
  providerEarningPercent: 0.70,
  volleyWindowHours: 12,
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

async function getOrCreateWallet(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
): Promise<{ credit_balance: number; pending_earnings: number }> {
  const { data: wallet, error } = await supabaseAdmin
    .from("wallets")
    .select("credit_balance, pending_earnings")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Error fetching wallet: ${error.message}`);

  if (wallet) return wallet;

  const { data: newWallet, error: createError } = await supabaseAdmin
    .from("wallets")
    .insert({ user_id: userId, credit_balance: 0, pending_earnings: 0 })
    .select("credit_balance, pending_earnings")
    .single();

  if (createError) throw new Error(`Error creating wallet: ${createError.message}`);
  return newWallet;
}

async function getOrCreateConversation(
  supabaseAdmin: ReturnType<typeof createClient>,
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

    let payerUserId = conv.payer_user_id;
    if (!payerUserId) {
      payerUserId = conv.see
