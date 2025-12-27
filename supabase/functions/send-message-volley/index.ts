import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse, createErrorResponse } from "../_shared/errors.ts";
import { MESSAGE_MAX_LENGTH } from "../_shared/validation.ts";

const TEXT_CREDITS_PER_VOLLEY = 5;
const IMAGE_CREDITS_PER_VOLLEY = 10;
const USD_PER_CREDIT = 0.10; // 5 credits = $0.50, 10 credits = $1.00
const PLATFORM_FEE_PERCENT = 0.30; // 30%
const PROVIDER_EARNING_PERCENT = 0.70; // 70%
const VOLLEY_WINDOW_HOURS = 12;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-MESSAGE-VOLLEY] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create clients
  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user with detailed logging
    const authHeader = req.headers.get("Authorization");
    logStep("Auth header check", { 
      hasAuthHeader: !!authHeader, 
      headerPrefix: authHeader?.substring(0, 30) + "..." 
    });
    
    if (!authHeader) {
      throw new Error("No authorization header provided. Please ensure you are logged in.");
    }

    const token = authHeader.replace("Bearer ", "");
    logStep("Token extracted", { tokenLength: token.length });
    
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    
    if (userError) {
      logStep("Auth error details", { error: userError.message, code: userError.status });
      throw new Error(`Authentication error: ${userError.message}`);
    }

    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    const senderId = user.id;
    logStep("User authenticated", { senderId });

    // Parse request body
    const { conversationId, recipientId, content, messageType = "text" } = await req.json();
    
    // Validate message content with length limits
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return createErrorResponse(
        new Error("Message content is required"),
        'invalid_input',
        corsHeaders
      );
    }
    
    if (content.length > MESSAGE_MAX_LENGTH) {
      return createErrorResponse(
        new Error(`Message exceeds maximum length of ${MESSAGE_MAX_LENGTH} characters`),
        'invalid_input',
        corsHeaders
      );
    }
    
    if (!recipientId) {
      return createErrorResponse(
        new Error("recipientId is required"),
        'invalid_input',
        corsHeaders
      );
    }
    if (!recipientId) {
      throw new Error("recipientId is required");
    }

    logStep("Request parsed", { conversationId, recipientId, messageType });

    let convId = conversationId;
    let payerUserId: string | null = null;

    // Get or create conversation
    if (convId) {
      // Fetch existing conversation
      const { data: conv, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("id, payer_user_id, seeker_id, earner_id")
        .eq("id", convId)
        .maybeSingle();

      if (convError) throw new Error(`Error fetching conversation: ${convError.message}`);
      if (!conv) throw new Error("Conversation not found");

      convId = conv.id;
      payerUserId = conv.payer_user_id;

      // Set payer on first message if not set (the seeker pays)
      if (!payerUserId) {
        payerUserId = conv.seeker_id;
        await supabaseAdmin
          .from("conversations")
          .update({ payer_user_id: payerUserId })
          .eq("id", convId);
        logStep("Set payer_user_id", { payerUserId });
      }
    } else {
      // Create new conversation - sender (seeker) is the payer
      const { data: newConv, error: newConvError } = await supabaseAdmin
        .from("conversations")
        .insert({
          seeker_id: senderId,
          earner_id: recipientId,
          payer_user_id: senderId, // Seeker pays
        })
        .select("id, payer_user_id")
        .single();

      if (newConvError) throw new Error(`Error creating conversation: ${newConvError.message}`);
      
      convId = newConv.id;
      payerUserId = newConv.payer_user_id;
      logStep("Created new conversation", { convId, payerUserId });
    }

    // Determine provider (the earner in the conversation)
    const { data: convDetails } = await supabaseAdmin
      .from("conversations")
      .select("seeker_id, earner_id")
      .eq("id", convId)
      .single();

    const providerId = convDetails?.earner_id;
    const isProviderReplying = senderId === providerId;

    logStep("Conversation context", { 
      convId, 
      payerUserId, 
      providerId, 
      senderId, 
      isProviderReplying 
    });

    // Insert the message
    const { data: newMessage, error: msgError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: convId,
        sender_id: senderId,
        recipient_id: recipientId,
        content: content.trim(),
        message_type: messageType,
        credits_cost: 0, // Will update if billable
        earner_amount: 0,
        platform_fee: 0,
        is_billable_volley: false,
      })
      .select("id, created_at")
      .single();

    if (msgError) throw new Error(`Error inserting message: ${msgError.message}`);
    logStep("Message inserted", { messageId: newMessage.id });

    let isBillableVolley = false;
    let newBalance: number | null = null;
    let creditsSpent = 0;

    // Check if this is a billable volley (provider reply within 12h of payer message)
    if (isProviderReplying && payerUserId) {
      const volleyWindowStart = new Date();
      volleyWindowStart.setHours(volleyWindowStart.getHours() - VOLLEY_WINDOW_HOURS);

      // Find the most recent unbilled payer message in the volley window
      const { data: payerMessages, error: payerMsgError } = await supabaseAdmin
        .from("messages")
        .select("id, created_at, message_type")
        .eq("conversation_id", convId)
        .eq("sender_id", payerUserId)
        .is("billed_at", null)
        .gte("created_at", volleyWindowStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (payerMsgError) {
        logStep("Error checking payer messages", { error: payerMsgError.message });
      } else if (payerMessages && payerMessages.length > 0) {
        // This is a billable volley!
        isBillableVolley = true;
        const payerMessageId = payerMessages[0].id;
        const payerMessageType = payerMessages[0].message_type || "text";
        logStep("Billable volley detected", { payerMessageId, payerMessageType });

        // Determine credits based on the PAYER's message type (what the seeker sent)
        const creditsForVolley = payerMessageType === "image" ? IMAGE_CREDITS_PER_VOLLEY : TEXT_CREDITS_PER_VOLLEY;

        // Get payer's wallet balance (create if doesn't exist)
        let { data: wallet, error: walletError } = await supabaseAdmin
          .from("wallets")
          .select("credit_balance")
          .eq("user_id", payerUserId)
          .maybeSingle();

        if (walletError) throw new Error(`Error fetching wallet: ${walletError.message}`);
        
        // Create wallet if it doesn't exist
        if (!wallet) {
          logStep("Creating wallet for payer", { payerUserId });
          const { data: newWallet, error: createWalletError } = await supabaseAdmin
            .from("wallets")
            .insert({ user_id: payerUserId, credit_balance: 0 })
            .select("credit_balance")
            .single();
          
          if (createWalletError) throw new Error(`Error creating wallet: ${createWalletError.message}`);
          wallet = newWallet;
        }

        const currentBalance = wallet.credit_balance;
        if (currentBalance < creditsForVolley) {
          throw new Error(`Insufficient credits. Required: ${creditsForVolley}, Available: ${currentBalance}`);
        }

        // Calculate amounts
        const usdAmount = creditsForVolley * USD_PER_CREDIT; // $0.50 for text, $1.00 for image
        const platformFee = usdAmount * PLATFORM_FEE_PERCENT; // 30%
        const providerEarning = usdAmount * PROVIDER_EARNING_PERCENT; // 70% ($0.35 for text, $0.70 for image)

        logStep("Billing amounts", { 
          credits: creditsForVolley, 
          usdAmount, 
          platformFee, 
          providerEarning,
          payerMessageType
        });

        // 1. Deduct credits from payer's wallet
        const { error: deductError } = await supabaseAdmin
          .from("wallets")
          .update({ 
            credit_balance: currentBalance - creditsForVolley,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", payerUserId);

        if (deductError) throw new Error(`Error deducting credits: ${deductError.message}`);
        newBalance = currentBalance - creditsForVolley;
        logStep("Credits deducted from payer", { newBalance });

        // 2. Add earnings to provider's wallet
        const { data: providerWallet } = await supabaseAdmin
          .from("wallets")
          .select("pending_earnings")
          .eq("user_id", providerId)
          .maybeSingle();

        if (providerWallet) {
          await supabaseAdmin
            .from("wallets")
            .update({ 
              pending_earnings: (providerWallet.pending_earnings || 0) + providerEarning,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", providerId);
        } else {
          // Create wallet for provider if doesn't exist
          await supabaseAdmin
            .from("wallets")
            .insert({ 
              user_id: providerId, 
              pending_earnings: providerEarning 
            });
        }
        logStep("Provider earnings updated", { providerId, providerEarning });

        // 3. Create 3 ledger entries
        const ledgerEntries = [
          {
            user_id: payerUserId,
            entry_type: "volley_spend",
            credits_delta: -creditsForVolley,
            usd_delta: -usdAmount,
            reference_id: newMessage.id,
            reference_type: "message",
            description: payerMessageType === "image" ? "Image message volley charge" : "Message volley charge",
          },
          {
            user_id: payerUserId, // Platform fee is tracked under payer for accounting
            entry_type: "platform_fee",
            credits_delta: 0,
            usd_delta: platformFee,
            reference_id: newMessage.id,
            reference_type: "message",
            description: "Platform fee (30%)",
          },
          {
            user_id: providerId,
            entry_type: "provider_earning",
            credits_delta: 0,
            usd_delta: providerEarning,
            reference_id: newMessage.id,
            reference_type: "message",
            description: "Message earning (70%)",
          },
        ];

        const { error: ledgerError } = await supabaseAdmin
          .from("ledger_entries")
          .insert(ledgerEntries);

        if (ledgerError) {
          logStep("Error creating ledger entries", { error: ledgerError.message });
        } else {
          logStep("Ledger entries created", { count: 3 });
        }

        // 4. Mark the payer message as billed
        await supabaseAdmin
          .from("messages")
          .update({ billed_at: new Date().toISOString() })
          .eq("id", payerMessageId);

        // 5. Update the provider's reply message with billing info
        await supabaseAdmin
          .from("messages")
          .update({
            is_billable_volley: true,
            credits_cost: creditsForVolley,
            earner_amount: providerEarning,
            platform_fee: platformFee,
          })
          .eq("id", newMessage.id);

        creditsSpent = creditsForVolley;
        logStep("Volley billing complete");
      } else {
        logStep("No unbilled payer messages in window - free message");
      }
    }

    // Update conversation last_message_at
    await supabaseAdmin
      .from("conversations")
      .update({ 
        last_message_at: new Date().toISOString(),
        total_messages: convDetails ? 1 : 1, // Will use SQL increment ideally
      })
      .eq("id", convId);

    // Send email notification to recipient (async, don't block)
    try {
      // Get sender's name for the email
      const { data: senderProfile } = await supabaseAdmin
        .from("profiles")
        .select("name")
        .eq("id", senderId)
        .single();

      const senderName = senderProfile?.name || "Someone";

      // Call the notification email function
      const notificationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`;
      
      fetch(notificationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          type: "new_message",
          recipientId: recipientId,
          senderName: senderName,
        }),
      }).then(res => {
        if (res.ok) {
          logStep("Email notification sent to recipient");
        } else {
          logStep("Email notification failed", { status: res.status });
        }
      }).catch(err => {
        logStep("Email notification error", { error: err.message });
      });
    } catch (emailError: any) {
      // Don't fail the message if email fails
      logStep("Email notification setup error", { error: emailError.message });
    }

    logStep("Function completed successfully");

    return new Response(JSON.stringify({
      success: true,
      message_id: newMessage.id,
      conversation_id: convId,
      is_billable_volley: isBillableVolley,
      credits_spent: creditsSpent,
      new_balance: newBalance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
