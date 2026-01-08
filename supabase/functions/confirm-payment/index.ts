import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";
import { verifyAuth } from "../_shared/auth.ts";

function validatePaymentIntentId(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("pi_")) {
    throw new Error("Invalid payment intent ID format");
  }
  return value;
}

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) console.error(`[CONFIRM-PAYMENT] Missing env var: ${name}`);
  return v;
}

function parseCredits(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0 || n > 100000) return null;
  return n;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = getEnv("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Payment system not configured");
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Server misconfigured");

    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) throw new Error("Invalid user session");

    const body = await req.json();
    const paymentIntentId = validatePaymentIntentId(body.paymentIntentId);

    console.log(`[CONFIRM-PAYMENT] Confirming payment`, { userId: user.id, paymentIntentId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
    }

    const metaUserId = paymentIntent.metadata?.user_id;
    if (metaUserId && metaUserId !== user.id) throw new Error("Payment user mismatch");

    const credits = parseCredits(paymentIntent.metadata?.credits);
    const usdAmount = Number(((paymentIntent.amount || 0) / 100).toFixed(2));

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const { data: existingTx } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("stripe_payment_id", paymentIntentId)
      .eq("transaction_type", "credit_purchase")
      .limit(1);

    if (existingTx && existingTx.length > 0) {
      console.log("[CONFIRM-PAYMENT] Payment already processed", { paymentIntentId });
      return new Response(
        JSON.stringify({ success: true, message: "Payment already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!credits) {
      console.log("[CONFIRM-PAYMENT] No credits metadata; webhook will handle");
      return new Response(
        JSON.stringify({ success: true, message: "Payment confirmed. Credits will be applied shortly." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const description = `Credit purchase via confirm-payment. credits=${credits} payment_intent=${paymentIntentId}`;

    const { error: markerError } = await supabaseAdmin.from("transactions").insert({
      user_id: user.id,
      transaction_type: "credit_purchase",
      credits_amount: credits,
      usd_amount: usdAmount,
      stripe_payment_id: paymentIntentId,
      status: "processing",
      description,
    });

    if (markerError) {
      const code = (markerError as Record<string, unknown>).code;
      const msg = markerError.message || "";
      if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
        return new Response(
          JSON.stringify({ success: true, message: "Payment already processed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    await supabaseAdmin.from("wallets").upsert({ user_id: user.id, credit_balance: 0 }, { onConflict: "user_id" });

    const { error: rpcError } = await supabaseAdmin.rpc("increment_wallet_credits", {
      p_user_id: user.id,
      p_credits: credits,
    });

    let newBalance: number | null = null;
    if (rpcError) {
      const { data: w } = await supabaseAdmin.from("wallets").select("credit_balance").eq("user_id", user.id).maybeSingle();
      if (!w) throw new Error("Failed to fetch user wallet");

      const currentBalance = Number((w as Record<string, unknown>).credit_balance ?? 0);
      const target = currentBalance + credits;

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("wallets")
        .update({ credit_balance: target, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("credit_balance", currentBalance)
        .select("credit_balance");
      if (updateError || !updated || updated.length !== 1) throw new Error("Failed to update credit balance");
      newBalance = (updated[0] as Record<string, unknown>).credit_balance as number;
    } else {
      const { data: w } = await supabaseAdmin.from("wallets").select("credit_balance").eq("user_id", user.id).maybeSingle();
      newBalance = w ? Number((w as Record<string, unknown>).credit_balance ?? 0) : null;
    }

    await supabaseAdmin.from("transactions").update({ status: "completed" }).eq("stripe_payment_id", paymentIntentId);

    console.log("[CONFIRM-PAYMENT] Credits added", { credits, newBalance });

    return new Response(
      JSON.stringify({ success: true, newBalance, creditsAdded: credits }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error confirming payment:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
