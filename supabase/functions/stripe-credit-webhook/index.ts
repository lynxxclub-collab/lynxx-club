import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CREDIT-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("ERROR: No stripe-signature header");
      return new Response("No signature", { status: 400 });
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("ERROR: Signature verification failed", { error: err instanceof Error ? err.message : String(err) });
      return new Response("Invalid signature", { status: 400 });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout.session.completed", { sessionId: session.id });

      // Extract metadata
      const userId = session.metadata?.user_id;
      const packId = session.metadata?.pack_id;
      const credits = parseInt(session.metadata?.credits || "0", 10);

      if (!userId || !packId || credits <= 0) {
        logStep("ERROR: Missing or invalid metadata", { userId, packId, credits });
        return new Response("Missing metadata", { status: 400 });
      }

      logStep("Metadata extracted", { userId, packId, credits });

      // Check if wallet exists, create if not
      const { data: existingWallet } = await supabaseAdmin
        .from("wallets")
        .select("user_id, credit_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingWallet) {
        // Create wallet for user
        const { error: createWalletError } = await supabaseAdmin
          .from("wallets")
          .insert({ user_id: userId, credit_balance: 0 });

        if (createWalletError) {
          logStep("ERROR: Failed to create wallet", { error: createWalletError.message });
          return new Response("Failed to create wallet", { status: 500 });
        }
        logStep("Created new wallet for user");
      }

      // Update wallet balance (using service role to bypass RLS)
      const { error: walletError } = await supabaseAdmin.rpc("increment_wallet_credits", {
        p_user_id: userId,
        p_credits: credits,
      });

      // If RPC doesn't exist, fall back to direct update
      if (walletError) {
        logStep("RPC not available, using direct update", { error: walletError.message });
        
        const { error: updateError } = await supabaseAdmin
          .from("wallets")
          .update({ 
            credit_balance: (existingWallet?.credit_balance || 0) + credits,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);

        if (updateError) {
          logStep("ERROR: Failed to update wallet", { error: updateError.message });
          return new Response("Failed to update wallet", { status: 500 });
        }
      }

      logStep("Wallet updated", { userId, creditsAdded: credits });

      // Create ledger entry
      const { error: ledgerError } = await supabaseAdmin
        .from("ledger_entries")
        .insert({
          user_id: userId,
          entry_type: "credit_purchase",
          credits_delta: credits,
          usd_delta: (session.amount_total || 0) / 100, // Convert cents to dollars
          reference_id: packId,
          reference_type: "credit_pack",
          description: `Purchased credit pack (${credits} credits)`,
        });

      if (ledgerError) {
        logStep("ERROR: Failed to create ledger entry", { error: ledgerError.message });
        // Don't fail the webhook - credits were already added
      } else {
        logStep("Ledger entry created");
      }

      logStep("Checkout completed successfully", { userId, credits });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR: Unhandled exception", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
