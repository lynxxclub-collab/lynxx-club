// supabase/functions/create-daily-room/index.ts
// deno-lint-ignore-file
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

// Input validation - Stripe payment intent IDs start with "pi_"
function validatePaymentIntentId(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error("Payment intent ID must be a string");
  }
  if (!value.startsWith('pi_') || value.length < 10 || value.length > 100) {
    throw new Error("Invalid payment intent ID format");
  }
  // Only allow alphanumeric and underscore
  if (!/^pi_[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error("Invalid payment intent ID characters");
  }
  return value;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Payment system not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid user session");
    }

    // Parse and validate input
    const body = await req.json();
    const paymentIntentId = validatePaymentIntentId(body.paymentIntentId);

    console.log(`Confirming payment for user ${user.id}, intent: ${paymentIntentId}`);

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Retrieve the payment intent to verify it succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
    }

    // Verify the user matches
    if (paymentIntent.metadata.user_id !== user.id) {
      throw new Error("Payment user mismatch");
    }

    const credits = parseInt(paymentIntent.metadata.credits);
    const usdAmount = paymentIntent.amount / 100;

    // Check if this payment was already processed
    const { data: existingTx } = await supabaseClient
      .from("transactions")
      .select("id")
      .eq("stripe_payment_id", paymentIntentId)
      .maybeSingle();

    if (existingTx) {
      console.log("Payment already processed");
      return new Response(
        JSON.stringify({ success: true, message: "Payment already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update user's credit balance in wallets table (source of truth)
    const { data: wallet, error: walletError } = await supabaseClient
      .from("wallets")
      .select("credit_balance")
      .eq("user_id", user.id)
      .single();

    if (walletError && walletError.code !== 'PGRST116') {
      throw new Error("Failed to fetch user wallet");
    }

    const currentBalance = wallet?.credit_balance || 0;
    const newBalance = currentBalance + credits;

    // Upsert wallet - create if not exists, update if exists
    const { error: updateError } = await supabaseClient
      .from("wallets")
      .upsert({ 
        user_id: user.id, 
        credit_balance: newBalance,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (updateError) {
      throw new Error("Failed to update credit balance");
    }

    // Create transaction record
    const { error: txError } = await supabaseClient
      .from("transactions")
      .insert({
        user_id: user.id,
        transaction_type: "credit_purchase",
        credits_amount: credits,
        usd_amount: usdAmount,
        stripe_payment_id: paymentIntentId,
        status: "completed",
        description: `Purchased ${credits} credits for $${usdAmount}`,
      });

    if (txError) {
      console.error("Failed to create transaction record:", txError);
    }

    console.log(`Credits added: ${credits}, new balance: ${newBalance}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newBalance,
        creditsAdded: credits,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error confirming payment:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
