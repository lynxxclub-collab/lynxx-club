import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { PRICING, calculateCreatorEarnings } from "../_shared/pricing.ts";

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

    // Handle checkout.session.completed (credit purchase)
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

    // Handle charge.refunded (credit pack refund/chargeback)
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      logStep("Processing charge.refunded", { chargeId: charge.id });

      await handleChargeback(supabaseAdmin, charge, "refund");
    }

    // Handle charge.dispute.created (chargeback dispute)
    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object as Stripe.Dispute;
      logStep("Processing charge.dispute.created", { disputeId: dispute.id });

      // Get the charge associated with the dispute
      const charge = await stripe.charges.retrieve(dispute.charge as string);
      await handleChargeback(supabaseAdmin, charge as Stripe.Charge, "dispute");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Log full error server-side, return generic message
    console.error("[STRIPE-CREDIT-WEBHOOK] Unhandled exception:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Handle chargebacks and refunds
async function handleChargeback(supabaseAdmin: any, charge: Stripe.Charge, type: "refund" | "dispute") {
  const logPrefix = type === "refund" ? "REFUND" : "DISPUTE";
  logStep(`${logPrefix}: Processing chargeback`, { chargeId: charge.id });

  try {
    // Find the original credit purchase by looking at ledger entries or transactions
    const { data: originalPurchase } = await supabaseAdmin
      .from("ledger_entries")
      .select("*")
      .eq("entry_type", "credit_purchase")
      .ilike("description", `%${charge.id}%`)
      .single();

    // Try to find by amount if not found by charge ID
    let userId: string | null = null;
    let creditsPurchased = 0;

    if (originalPurchase) {
      userId = originalPurchase.user_id;
      creditsPurchased = originalPurchase.credits_delta || 0;
    } else {
      // Fallback: try to match by payment intent
      const paymentIntent = charge.payment_intent as string;
      if (paymentIntent) {
        const { data: txRecord } = await supabaseAdmin
          .from("transactions")
          .select("user_id, credits_amount")
          .eq("stripe_payment_id", paymentIntent)
          .eq("transaction_type", "credit_purchase")
          .single();

        if (txRecord) {
          userId = txRecord.user_id;
          creditsPurchased = Math.abs(txRecord.credits_amount || 0);
        }
      }
    }

    if (!userId) {
      logStep(`${logPrefix}: Could not find original purchase`, { chargeId: charge.id });
      // Still record the chargeback for manual review
      await supabaseAdmin
        .from("chargeback_records")
        .insert({
          stripe_charge_id: charge.id,
          credits_purchased: 0,
          credits_remaining: 0,
          credits_used: 0,
          status: "needs_review",
        });
      return;
    }

    logStep(`${logPrefix}: Found user`, { userId, creditsPurchased });

    // Get current wallet balance
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("credit_balance, pending_earnings, available_earnings")
      .eq("user_id", userId)
      .single();

    if (!wallet) {
      logStep(`${logPrefix}: Wallet not found`, { userId });
      return;
    }

    const creditsRemaining = wallet.credit_balance;
    const creditsUsed = Math.max(0, creditsPurchased - creditsRemaining);

    logStep(`${logPrefix}: Credit analysis`, { creditsPurchased, creditsRemaining, creditsUsed });

    // Remove remaining credits from wallet
    if (creditsRemaining > 0) {
      const creditsToRemove = Math.min(creditsRemaining, creditsPurchased);
      await supabaseAdmin
        .from("wallets")
        .update({ 
          credit_balance: wallet.credit_balance - creditsToRemove,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      logStep(`${logPrefix}: Removed ${creditsToRemove} credits from wallet`);
    }

    // If credits were used on gifts, we need to claw back from creators
    let affectedCreators: any[] = [];
    let clawbackTotal = 0;

    if (creditsUsed > 0) {
      // Find gift transactions from this user that could be affected
      // We use the centralized pricing to determine clawback amount
      const creditsToClawback = creditsUsed;
      const usdToClawback = calculateCreatorEarnings(creditsToClawback); // Creator's 70% share

      logStep(`${logPrefix}: Credits used on gifts, need to claw back`, { 
        creditsToClawback, 
        usdToClawback 
      });

      // Get recent gift transactions from this user
      const { data: giftTx } = await supabaseAdmin
        .from("gift_transactions")
        .select("id, recipient_id, earner_amount, credits_spent")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (giftTx && giftTx.length > 0) {
        let remainingClawback = usdToClawback;

        for (const tx of giftTx) {
          if (remainingClawback <= 0) break;

          const creatorClawback = Math.min(tx.earner_amount, remainingClawback);
          
          // Reduce creator's pending or available earnings
          const { data: creatorWallet } = await supabaseAdmin
            .from("wallets")
            .select("pending_earnings, available_earnings")
            .eq("user_id", tx.recipient_id)
            .single();

          if (creatorWallet) {
            let pendingReduction = 0;
            let availableReduction = 0;

            // First reduce from pending earnings
            if (creatorWallet.pending_earnings >= creatorClawback) {
              pendingReduction = creatorClawback;
            } else {
              pendingReduction = creatorWallet.pending_earnings;
              // Then reduce from available if needed
              const remainingFromAvailable = creatorClawback - pendingReduction;
              availableReduction = Math.min(creatorWallet.available_earnings, remainingFromAvailable);
            }

            const totalReduction = pendingReduction + availableReduction;

            if (totalReduction > 0) {
              await supabaseAdmin
                .from("wallets")
                .update({
                  pending_earnings: Math.max(0, creatorWallet.pending_earnings - pendingReduction),
                  available_earnings: Math.max(0, creatorWallet.available_earnings - availableReduction),
                  updated_at: new Date().toISOString()
                })
                .eq("user_id", tx.recipient_id);

              affectedCreators.push({
                creator_id: tx.recipient_id,
                amount_clawed: totalReduction,
                gift_transaction_id: tx.id,
              });

              clawbackTotal += totalReduction;
              remainingClawback -= totalReduction;

              logStep(`${logPrefix}: Clawed back $${totalReduction.toFixed(2)} from creator`, { 
                creatorId: tx.recipient_id 
              });
            }
          }
        }
      }
    }

    // Record the chargeback
    await supabaseAdmin
      .from("chargeback_records")
      .insert({
        stripe_charge_id: charge.id,
        credits_purchased: creditsPurchased,
        credits_remaining: creditsRemaining,
        credits_used: creditsUsed,
        affected_creators: affectedCreators.length > 0 ? affectedCreators : null,
        clawback_total: clawbackTotal,
        status: "processed",
        processed_at: new Date().toISOString(),
      });

    // Create transaction record for audit trail
    await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId,
        transaction_type: "chargeback",
        credits_amount: -creditsPurchased,
        usd_amount: -(charge.amount_refunded / 100),
        status: "completed",
        stripe_payment_id: charge.id,
        description: `${type === "refund" ? "Refund" : "Dispute"} - ${creditsPurchased} credits clawed back`,
      });

    logStep(`${logPrefix}: Chargeback processing complete`, { 
      creditsRemoved: Math.min(creditsRemaining, creditsPurchased),
      clawbackTotal,
      affectedCreators: affectedCreators.length
    });

  } catch (error) {
    logStep(`${logPrefix}: Error processing chargeback`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}
