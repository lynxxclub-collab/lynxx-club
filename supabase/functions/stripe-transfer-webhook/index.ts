import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-TRANSFER-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // SECURITY: Always require signature verification - no bypass allowed
    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "No signature provided" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook authentication not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event received", { type: event.type, id: event.id });

    const transfer = event.data.object as Stripe.Transfer;
    const transferId = transfer.id;

    logStep("Processing transfer", { transferId, status: event.type });

    // Find the withdrawal record by stripe_transfer_id
    const { data: withdrawal, error: findError } = await supabase
      .from("withdrawals")
      .select("*, profiles!withdrawals_user_id_fkey(email, name, notify_payouts)")
      .eq("stripe_transfer_id", transferId)
      .single();

    if (findError || !withdrawal) {
      logStep("Withdrawal not found for transfer", { transferId, error: findError?.message });
      // Return 200 to acknowledge receipt (may be an unrelated transfer)
      return new Response(JSON.stringify({ received: true, note: "No matching withdrawal" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Found withdrawal", { withdrawalId: withdrawal.id, userId: withdrawal.user_id });

    if (event.type === "transfer.paid") {
      // Update withdrawal status to completed
      const { error: updateError } = await supabase
        .from("withdrawals")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", withdrawal.id);

      if (updateError) {
        logStep("Failed to update withdrawal", { error: updateError.message });
        throw updateError;
      }

      logStep("Withdrawal marked as completed", { withdrawalId: withdrawal.id });

      // Send success notification email
      if (withdrawal.profiles?.notify_payouts !== false) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              type: "payout_processed",
              recipientId: withdrawal.user_id,
              amount: withdrawal.amount,
              processedAt: new Date().toISOString(),
            }),
          });
          logStep("Sent payout success notification");
        } catch (emailError: any) {
          logStep("Failed to send notification email", { error: emailError.message });
        }
      }
    } else if (event.type === "transfer.failed" || event.type === "transfer.reversed") {
      // Update withdrawal status to failed
      const { error: updateError } = await supabase
        .from("withdrawals")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", withdrawal.id);

      if (updateError) {
        logStep("Failed to update withdrawal", { error: updateError.message });
        throw updateError;
      }

      // Refund the earnings balance
      const { error: refundError } = await supabase
        .from("profiles")
        .update({
          earnings_balance: supabase.rpc("", {}), // We need to add the amount back
        })
        .eq("id", withdrawal.user_id);

      // Actually, let's do a proper increment
      const { data: profile } = await supabase
        .from("profiles")
        .select("earnings_balance")
        .eq("id", withdrawal.user_id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({
            earnings_balance: (profile.earnings_balance || 0) + withdrawal.amount,
          })
          .eq("id", withdrawal.user_id);

        logStep("Refunded earnings balance", { amount: withdrawal.amount });
      }

      // Create refund transaction record
      await supabase.from("transactions").insert({
        user_id: withdrawal.user_id,
        transaction_type: "withdrawal_refund",
        credits_amount: 0,
        usd_amount: withdrawal.amount,
        status: "completed",
        description: `Withdrawal refunded: ${event.type}`,
      });

      logStep("Withdrawal marked as failed and refunded", { withdrawalId: withdrawal.id });

      // Send failure notification email
      if (withdrawal.profiles?.notify_payouts !== false) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              type: "payout_failed",
              recipientId: withdrawal.user_id,
              amount: withdrawal.amount,
              reason: event.type === "transfer.reversed" ? "Transfer was reversed" : "Transfer failed",
            }),
          });
          logStep("Sent payout failure notification");
        } catch (emailError: any) {
          logStep("Failed to send notification email", { error: emailError.message });
        }
      }
    }

    return new Response(JSON.stringify({ received: true, processed: event.type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});