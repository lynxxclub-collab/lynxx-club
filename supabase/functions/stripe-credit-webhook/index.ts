import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { calculateCreatorEarnings } from "../_shared/pricing.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-CREDIT-WEBHOOK] ${step}${detailsStr}`);
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) console.error(`[STRIPE-CREDIT-WEBHOOK] Missing env var: ${name}`);
  return v;
}

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("ERROR: No stripe-signature header");
      return new Response("No signature", { status: 400 });
    }

    const webhookSecret = getEnv("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("ERROR: Signature verification failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return new Response("Invalid signature", { status: 400 });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // TEMPORARILY DISABLED FOR LAUNCH: refund/dispute clawbacks are high risk and not needed for core MVP.
    if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
      logStep("Chargeback/refund handling DISABLED for launch", { type: event.type, id: event.id });
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabaseUrl = getEnv("SUPABASE_URL") ?? "";
    const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Supabase service role misconfigured");
      return new Response("Server misconfigured", { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout.session.completed", { sessionId: session.id });

      const userId = session.metadata?.user_id;
      const packId = session.metadata?.pack_id;
      const credits = parseInt(session.metadata?.credits || "0", 10);

      if (!userId || !UUID_RE.test(userId) || !packId || credits <= 0 || !Number.isFinite(credits)) {
        logStep("ERROR: Missing or invalid metadata", { userId, packId, credits });
        return new Response("Missing metadata", { status: 400 });
      }

      const paymentIntent =
        typeof session.payment_intent === "string" && session.payment_intent.length > 0
          ? session.payment_intent
          : session.id;

      const usdAmount = Number((((session.amount_total ?? 0) as number) / 100).toFixed(2));

      logStep("Metadata extracted", { userId, packId, credits, paymentIntent, usdAmount });

      // IDEMPOTENCY: if we've already completed this purchase, do nothing.
      // We use transactions(stripe_payment_id=payment_intent) because refunds/disputes reference payment_intent.
      const { data: alreadyProcessed, error: alreadyProcessedError } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("transaction_type", "credit_purchase")
        .eq("stripe_payment_id", paymentIntent)
        .eq("status", "completed")
        .limit(1);

      if (alreadyProcessedError) {
        logStep("WARN: Failed idempotency check (continuing)", { error: alreadyProcessedError.message });
      } else if (alreadyProcessed && alreadyProcessed.length > 0) {
        logStep("Idempotency: purchase already processed; skipping", { paymentIntent });
        return new Response(JSON.stringify({ received: true, skipped: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Ensure wallet exists
      const { data: existingWallet, error: walletSelectError } = await supabaseAdmin
        .from("wallets")
        .select("user_id, credit_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletSelectError) {
        logStep("ERROR: Failed to read wallet", { error: walletSelectError.message });
        return new Response("Failed to read wallet", { status: 500 });
      }

      if (!existingWallet) {
        const { error: createWalletError } = await supabaseAdmin
          .from("wallets")
          .insert({ user_id: userId, credit_balance: 0 });

        if (createWalletError) {
          // If a concurrent insert happened, tolerate it; otherwise fail.
          const msg = createWalletError.message || "";
          const code = (createWalletError as any).code;
          if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
            logStep("Wallet already created concurrently; continuing");
          } else {
            logStep("ERROR: Failed to create wallet", { error: createWalletError.message });
            return new Response("Failed to create wallet", { status: 500 });
          }
        } else {
          logStep("Created new wallet for user");
        }
      }

      // Insert or update a purchase transaction record as a processing marker (best-effort).
      // If this fails, we continue but log loudly (idempotency may be weaker).
      const purchaseDescription =
        `Stripe checkout completed. pack_id=${packId} credits=${credits} ` +
        `session_id=${session.id} event_id=${event.id} payment_intent=${paymentIntent}`;

      const { error: txInsertError } = await supabaseAdmin
        .from("transactions")
        .insert({
          user_id: userId,
          transaction_type: "credit_purchase",
          credits_amount: credits,
          usd_amount: usdAmount,
          status: "processing",
          stripe_payment_id: paymentIntent,
          description: purchaseDescription,
        });

      if (txInsertError) {
        // Could be duplicate if a previous attempt inserted; we handle idempotency via completed check above.
        logStep("WARN: Failed to insert processing transaction marker (continuing)", {
          error: txInsertError.message,
        });
      } else {
        logStep("Inserted processing transaction marker", { paymentIntent });
      }

      // Update wallet balance (prefer RPC)
      const { error: walletRpcError } = await supabaseAdmin.rpc("increment_wallet_credits", {
        p_user_id: userId,
        p_credits: credits,
      });

      if (walletRpcError) {
        logStep("RPC not available, using direct update", { error: walletRpcError.message });

        // Re-fetch current balance to reduce stale updates (still not perfectly atomic, but stable with idempotency).
        const { data: currentWallet, error: currentWalletError } = await supabaseAdmin
          .from("wallets")
          .select("credit_balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (currentWalletError || !currentWallet) {
          logStep("ERROR: Failed to re-fetch wallet for direct update", {
            error: currentWalletError?.message,
          });

          // mark tx failed (best-effort)
          await supabaseAdmin
            .from("transactions")
            .update({ status: "failed" })
            .eq("transaction_type", "credit_purchase")
            .eq("stripe_payment_id", paymentIntent);

          return new Response("Failed to update wallet", { status: 500 });
        }

        const { error: updateError } = await supabaseAdmin
          .from("wallets")
          .update({
            credit_balance: (currentWallet.credit_balance || 0) + credits,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateError) {
          logStep("ERROR: Failed to update wallet", { error: updateError.message });

          // mark tx failed (best-effort)
          await supabaseAdmin
            .from("transactions")
            .update({ status: "failed" })
            .eq("transaction_type", "credit_purchase")
            .eq("stripe_payment_id", paymentIntent);

          return new Response("Failed to update wallet", { status: 500 });
        }
      }

      logStep("Wallet updated", { userId, creditsAdded: credits });

      // Create ledger entry (best-effort, do not fail webhook)
      const { error: ledgerError } = await supabaseAdmin
        .from("ledger_entries")
        .insert({
          user_id: userId,
          entry_type: "credit_purchase",
          credits_delta: credits,
          usd_delta: usdAmount,
          reference_id: packId,
          reference_type: "credit_pack",
          description: purchaseDescription,
        });

      if (ledgerError) {
        logStep("ERROR: Failed to create ledger entry (continuing)", { error: ledgerError.message });
      } else {
        logStep("Ledger entry created");
      }

      // Mark transaction completed (best-effort)
      const { error: txUpdateError } = await supabaseAdmin
        .from("transactions")
        .update({ status: "completed" })
        .eq("transaction_type", "credit_purchase")
        .eq("stripe_payment_id", paymentIntent);

      if (txUpdateError) {
        logStep("WARN: Failed to mark transaction completed", { error: txUpdateError.message });
      }

      logStep("Checkout completed successfully", { userId, credits, paymentIntent });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[STRIPE-CREDIT-WEBHOOK] Unhandled exception:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Existing chargeback logic left in place but is currently unreachable due to launch bypass above.
// Keep for post-launch re-enable & hardening.

// Handle chargebacks and refunds
async function handleChargeback(supabaseAdmin: any, charge: Stripe.Charge, type: "refund" | "dispute") {
  const logPrefix = type === "refund" ? "REFUND" : "DISPUTE";
  logStep(`${logPrefix}: Processing chargeback`, { chargeId: charge.id });

  try {
    const { data: originalPurchase } = await supabaseAdmin
      .from("ledger_entries")
      .select("*")
      .eq("entry_type", "credit_purchase")
      .ilike("description", `%${charge.id}%`)
      .single();

    let userId: string | null = null;
    let creditsPurchased = 0;

    if (originalPurchase) {
      userId = originalPurchase.user_id;
      creditsPurchased = originalPurchase.credits_delta || 0;
    } else {
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

    if (creditsRemaining > 0) {
      const creditsToRemove = Math.min(creditsRemaining, creditsPurchased);
      await supabaseAdmin
        .from("wallets")
        .update({
          credit_balance: wallet.credit_balance - creditsToRemove,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      logStep(`${logPrefix}: Removed ${creditsToRemove} credits from wallet`);
    }

    let affectedCreators: any[] = [];
    let clawbackTotal = 0;

    if (creditsUsed > 0) {
      const creditsToClawback = creditsUsed;
      const usdToClawback = calculateCreatorEarnings(creditsToClawback);

      logStep(`${logPrefix}: Credits used on gifts, need to claw back`, {
        creditsToClawback,
        usdToClawback,
      });

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

          const { data: creatorWallet } = await supabaseAdmin
            .from("wallets")
            .select("pending_earnings, available_earnings")
            .eq("user_id", tx.recipient_id)
            .single();

          if (creatorWallet) {
            let pendingReduction = 0;
            let availableReduction = 0;

            if (creatorWallet.pending_earnings >= creatorClawback) {
              pendingReduction = creatorClawback;
            } else {
              pendingReduction = creatorWallet.pending_earnings;
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
                  updated_at: new Date().toISOString(),
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
                creatorId: tx.recipient_id,
              });
            }
          }
        }
      }
    }

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
      affectedCreators: affectedCreators.length,
    });
  } catch (error) {
    logStep(`${logPrefix}: Error processing chargeback`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
