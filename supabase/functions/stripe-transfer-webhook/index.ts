import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-TRANSFER-WEBHOOK] ${step}${detailsStr}`);
};

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) logStep("ERROR: Missing env var", { name });
  return v;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST for webhooks
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const stripeKey = getEnv("STRIPE_SECRET_KEY");
    const webhookSecret = getEnv("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified");
    } catch (err) {
      logStep("ERROR: Signature verification failed", { error: (err as Error).message });
      return new Response(JSON.stringify({ error: "Signature verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event received", { type: event.type, id: event.id });

    // Ignore unrelated events safely
    if (event.type !== "transfer.paid" && event.type !== "transfer.failed" && event.type !== "transfer.reversed") {
      logStep("Ignoring unsupported event type", { type: event.type });
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transfer = event.data.object as Stripe.Transfer;
    const transferId = transfer.id;

    logStep("Processing transfer event", { transferId, type: event.type });

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Find the withdrawal record
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from("withdrawals")
      .select("id, user_id, amount, status")
      .eq("stripe_transfer_id", transferId)
      .maybeSingle();

    if (withdrawalError) {
      logStep("ERROR: Failed to find withdrawal", { error: withdrawalError.message });
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!withdrawal) {
      logStep("No matching withdrawal found", { transferId });
      return new Response(JSON.stringify({ received: true, message: "No matching withdrawal" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Found withdrawal", { withdrawalId: withdrawal.id, userId: withdrawal.user_id });

    if (event.type === "transfer.paid") {
      // Idempotency: already completed
      if (withdrawal.status === "completed") {
        logStep("Idempotency: withdrawal already completed; skipping", { withdrawalId: withdrawal.id });
        return new Response(JSON.stringify({ received: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update withdrawal status to completed
      const { error: updateError } = await supabase
        .from("withdrawals")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", withdrawal.id);

      if (updateError) {
        logStep("ERROR: Failed to update withdrawal", { error: updateError.message });
        throw updateError;
      }

      logStep("Withdrawal marked as completed", { withdrawalId: withdrawal.id });

      // Send success notification
      await supabase.from("notifications").insert({
        user_id: withdrawal.user_id,
        type: "payout_success",
        title: "Payout Successful",
        message: `Your payout of $${withdrawal.amount.toFixed(2)} has been processed and is on its way!`,
        related_type: "withdrawal",
        related_id: withdrawal.id,
      });

    } else if (event.type === "transfer.failed" || event.type === "transfer.reversed") {
      // Idempotency: already failed
      if (withdrawal.status === "failed") {
        logStep("Idempotency: withdrawal already failed; skipping", { withdrawalId: withdrawal.id });
        return new Response(JSON.stringify({ received: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update withdrawal status to failed
      const { error: updateError } = await supabase
        .from("withdrawals")
        .update({
          status: "failed",
        })
        .eq("id", withdrawal.id);

      if (updateError) {
        logStep("ERROR: Failed to update withdrawal status", { error: updateError.message });
        throw updateError;
      }

      // TEMP FOR LAUNCH: Do NOT mutate user balances here.
      // If a payout fails, mark the withdrawal failed and require manual balance reconciliation.
      logStep("Balance refund DISABLED for launch; manual review required", {
        withdrawalId: withdrawal.id,
        userId: withdrawal.user_id,
        amount: withdrawal.amount,
        eventType: event.type,
      });

      // Create refund transaction record
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: withdrawal.user_id,
        transaction_type: "withdrawal_refund",
        credits_amount: 0,
        usd_amount: withdrawal.amount,
        status: "completed",
        description: `Withdrawal refunded: ${event.type}`,
      });
      if (txError) logStep("WARN: Failed to insert withdrawal_refund transaction", { error: txError.message });

      logStep("Withdrawal marked as failed", { withdrawalId: withdrawal.id });

      // Send failure notification
      await supabase.from("notifications").insert({
        user_id: withdrawal.user_id,
        type: "payout_failed",
        title: "Payout Failed",
        message: `Your payout of $${withdrawal.amount.toFixed(2)} could not be processed. Please contact support.`,
        related_type: "withdrawal",
        related_id: withdrawal.id,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[STRIPE-TRANSFER-WEBHOOK] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
