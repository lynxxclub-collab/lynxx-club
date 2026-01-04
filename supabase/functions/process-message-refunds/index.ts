import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-MESSAGE-REFUNDS] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication - only allow service role or admin access
  const authHeader = req.headers.get("Authorization");
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!authHeader || !expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    logStep("Unauthorized access attempt blocked");
    return new Response(
      JSON.stringify({ error: "Unauthorized - admin access required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    logStep("Starting process-message-refunds");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find all billable messages past their deadline without a reply
    const { data: expiredMessages, error: fetchError } = await supabaseAdmin
      .from("messages")
      .select("id, conversation_id, sender_id, recipient_id, credits_cost, earner_amount")
      .eq("is_billable_volley", true)
      .not("reply_deadline", "is", null)
      .lt("reply_deadline", new Date().toISOString())
      .is("refund_status", null)
      .gt("credits_cost", 0);

    if (fetchError) {
      throw new Error(`Error fetching expired messages: ${fetchError.message}`);
    }

    if (!expiredMessages || expiredMessages.length === 0) {
      logStep("No expired messages to process");
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found expired messages", { count: expiredMessages.length });

    let processedCount = 0;

    for (const message of expiredMessages) {
      // Check if there's a reply from recipient after this message
      // Need to get the message's created_at first for proper comparison
      const { data: originalMessage } = await supabaseAdmin
        .from("messages")
        .select("created_at")
        .eq("id", message.id)
        .single();

      if (!originalMessage) {
        logStep("Could not find original message", { messageId: message.id });
        continue;
      }

      const { data: replies, error: replyError } = await supabaseAdmin
        .from("messages")
        .select("id")
        .eq("conversation_id", message.conversation_id)
        .eq("sender_id", message.recipient_id)
        .gt("created_at", originalMessage.created_at)
        .limit(1);

      if (replyError) {
        logStep("Error checking replies", { messageId: message.id, error: replyError.message });
        continue;
      }

      // If there's a reply, skip refund (earner replied in time)
      if (replies && replies.length > 0) {
        // Mark as replied since earner did reply
        await supabaseAdmin
          .from("messages")
          .update({ refund_status: 'replied' })
          .eq("id", message.id);
        continue;
      }

      // No reply found - process refund
      logStep("Processing refund", { messageId: message.id, credits: message.credits_cost });

      // 1. Refund credits to sender's wallet - fetch current balance first
      const { data: senderWallet, error: senderFetchError } = await supabaseAdmin
        .from("wallets")
        .select("credit_balance")
        .eq("user_id", message.sender_id)
        .single();

      if (senderFetchError || !senderWallet) {
        logStep("Error fetching sender wallet", { messageId: message.id, error: senderFetchError?.message });
        continue;
      }

      const { error: senderUpdateError } = await supabaseAdmin
        .from("wallets")
        .update({ 
          credit_balance: senderWallet.credit_balance + message.credits_cost,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", message.sender_id);

      if (senderUpdateError) {
        logStep("Error updating sender wallet", { messageId: message.id, error: senderUpdateError.message });
        continue;
      }

      // 2. Remove pending earnings from earner's wallet
      const { data: earnerWallet } = await supabaseAdmin
        .from("wallets")
        .select("pending_earnings")
        .eq("user_id", message.recipient_id)
        .single();

      if (earnerWallet) {
        await supabaseAdmin
          .from("wallets")
          .update({ 
            pending_earnings: Math.max(earnerWallet.pending_earnings - message.earner_amount, 0),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", message.recipient_id);
      }

      // 3. Mark message as refunded
      await supabaseAdmin
        .from("messages")
        .update({
          refund_status: 'refunded',
          refunded_at: new Date().toISOString(),
          credits_cost: 0,
          earner_amount: 0,
          platform_fee: 0
        })
        .eq("id", message.id);

      // 4. Create refund transaction record
      await supabaseAdmin
        .from("transactions")
        .insert({
          user_id: message.sender_id,
          transaction_type: 'message_refund',
          credits_amount: message.credits_cost,
          description: 'Refund: no reply within 12 hours'
        });

      processedCount++;
    }

    logStep("Completed processing refunds", { processed: processedCount });

    return new Response(
      JSON.stringify({ success: true, processed: processedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error processing refunds", { error: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});