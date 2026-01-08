import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CREDIT-WEBHOOK] ${step}${detailsStr}`);
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) logStep(`ERROR: Missing env var ${name}`);
  return v;
}

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = getEnv("STRIPE_SECRET_KEY");
    const webhookSecret = getEnv("STRIPE_CREDIT_WEBHOOK_SECRET");

    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not configured");
      return new Response("Stripe not configured", { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-04-30.basil",
    });

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response("Missing signature", { status: 400 });
    }

    if (!webhookSecret) {
      logStep("ERROR: STRIPE_CREDIT_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logStep("ERROR: Signature verification failed", { error: (err as Error).message });
      return new Response("Signature verification failed", { status: 400 });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // TEMP DISABLE FOR LAUNCH: high-risk clawbacks not needed for core credits MVP.
    if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
      logStep("Chargeback/refund handling DISABLED for launch", { type: event.type, id: event.id });
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      getEnv("SUPABASE_URL") ?? "",
      getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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

      if (!userId || !UUID_RE.test(userId) || !packId || credits <= 0 || !Number.isFinite(credits)) {
        logStep("ERROR: Missing or invalid metadata", { userId, packId, credits });
        return new Response("Missing metadata", { status: 400 });
      }

      const paymentIntent =
        (typeof session.payment_intent === "string" && session.payment_intent.length > 0)
          ? session.payment_intent
          : session.id;

      logStep("Metadata extracted", { userId, packId, credits });

      // IDEMPOTENCY: if already completed, skip.
      const { data: existingTx, error: existingTxError } = await supabaseAdmin
        .from("transactions")
        .select("id,status")
        .eq("transaction_type", "credit_purchase")
        .eq("stripe_payment_id", paymentIntent)
        .limit(1);

      if (existingTxError) {
        logStep("WARN: Idempotency check failed (continuing)", { error: existingTxError.message });
      } else if (existingTx && existingTx.length > 0) {
        const status = (existingTx[0] as { status: string }).status;
        if (status === "completed" || status === "processing") {
          logStep("Idempotency: already processed or in-flight; skipping", { paymentIntent, status });
          return new Response(JSON.stringify({ received: true, skipped: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          });
        }
      }

      const purchaseDescription =
        `Purchased credit pack (${credits} credits) pack_id=${packId} session_id=${session.id} event_id=${event.id} payment_intent=${paymentIntent}`;

      // Best-effort processing marker
      const { error: txInsertError } = await supabaseAdmin
        .from("transactions")
        .insert({
          user_id: userId,
          transaction_type: "credit_purchase",
          credits_amount: credits,
          usd_amount: (session.amount_total || 0) / 100,
          status: "processing",
          stripe_payment_id: paymentIntent,
          description: purchaseDescription,
        });

      if (txInsertError) {
        const code = (txInsertError as { code?: string }).code;
        const msg = txInsertError.message || "";
        if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
          logStep("Idempotency: duplicate transaction marker; skipping", { paymentIntent });
          return new Response(JSON.stringify({ received: true, skipped: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          });
        }
        logStep("WARN: Failed to insert processing marker (continuing)", { error: txInsertError.message });
      }

      // Check if wallet exists, create if not
      const { data: existingWallet } = await supabaseAdmin
        .from("wallets")
        .select("user_id, credit_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingWallet) {
        logStep("Creating new wallet for user", { userId });
        const { error: createWalletError } = await supabaseAdmin
          .from("wallets")
          .insert({ user_id: userId, credit_balance: 0, pending_earnings: 0, available_earnings: 0 });

        if (createWalletError) {
          // May already exist due to race condition
          const code = (createWalletError as { code?: string }).code;
          if (code !== "23505") {
            logStep("ERROR: Failed to create wallet", { error: createWalletError.message });
          }
        }
      }

      // Update wallet with credits - try RPC first, fall back to direct update
      const { error: walletError } = await supabaseAdmin.rpc("increment_wallet_credits", {
        p_user_id: userId,
        p_credits: credits,
      });

      // If RPC doesn't exist, fall back to direct update
      if (walletError) {
        logStep("RPC not available, using direct update", { error: walletError.message });

        // Re-fetch to avoid stale read-modify-write
        const { data: currentWallet, error: currentWalletError } = await supabaseAdmin
          .from("wallets")
          .select("credit_balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (currentWalletError || !currentWallet) {
          logStep("ERROR: Failed to re-fetch wallet", { error: currentWalletError?.message });
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
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);

        if (updateError) {
          logStep("ERROR: Failed to update wallet", { error: updateError.message });
          await supabaseAdmin
            .from("transactions")
            .update({ status: "failed" })
            .eq("transaction_type", "credit_purchase")
            .eq("stripe_payment_id", paymentIntent);
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
          usd_delta: (session.amount_total || 0) / 100,
          reference_id: packId,
          reference_type: "credit_pack",
          description: purchaseDescription,
        });

      if (ledgerError) {
        logStep("ERROR: Failed to create ledger entry", { error: ledgerError.message });
      } else {
        logStep("Ledger entry created");
      }

      // Mark transaction completed
      const { error: txUpdateError } = await supabaseAdmin
        .from("transactions")
        .update({ status: "completed" })
        .eq("transaction_type", "credit_purchase")
        .eq("stripe_payment_id", paymentIntent);
      if (txUpdateError) {
        logStep("WARN: Failed to mark transaction completed", { error: txUpdateError.message });
      }

      logStep("Checkout completed successfully", { userId, credits });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[STRIPE-CREDIT-WEBHOOK] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
