diff --git a/functions/confirm-payment/index.ts b/functions/confirm-payment/index.ts
--- a/functions/confirm-payment/index.ts
+++ b/functions/confirm-payment/index.ts
@@ -1,8 +1,9 @@
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import Stripe from "https://esm.sh/stripe@14.21.0";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
 import { getCorsHeaders } from "../_shared/cors.ts";
 import { createAutoErrorResponse } from "../_shared/errors.ts";
+import { verifyAuth } from "../_shared/auth.ts";
 
 // Input validation - Stripe payment intent IDs start with "pi_"
 function validatePaymentIntentId(value: unknown): string {
@@ -19,6 +20,21 @@
   return value;
 }
 
+function getEnv(name: string) {
+  const v = Deno.env.get(name);
+  if (!v) console.error(`[CONFIRM-PAYMENT] Missing env var: ${name}`);
+  return v;
+}
+
+function parseCredits(value: unknown): number | null {
+  if (typeof value !== "string") return null;
+  const n = parseInt(value, 10);
+  if (!Number.isFinite(n) || n <= 0 || n > 100000) return null;
+  return n;
+}
+
 serve(async (req) => {
   const corsHeaders = getCorsHeaders(req);
   
   if (req.method === "OPTIONS") {
@@ -27,29 +43,22 @@
 
   try {
-    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
+    const stripeKey = getEnv("STRIPE_SECRET_KEY");
     if (!stripeKey) {
       throw new Error("Payment system not configured");
     }
 
-    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
-    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
-    
-    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
-
-    // Get user from auth header
-    const authHeader = req.headers.get("Authorization");
-    if (!authHeader) {
-      throw new Error("No authorization header");
-    }
-
-    const token = authHeader.replace("Bearer ", "");
-    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
-    
-    if (authError || !user) {
-      throw new Error("Invalid user session");
-    }
+    const supabaseUrl = getEnv("SUPABASE_URL");
+    const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
+    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Server misconfigured");
+
+    // Centralized auth
+    const { user, error: authError } = await verifyAuth(req);
+    if (authError || !user) throw new Error("Invalid user session");
 
     // Parse and validate input
     const body = await req.json();
     const paymentIntentId = validatePaymentIntentId(body.paymentIntentId);
 
-    console.log(`Confirming payment for user ${user.id}, intent: ${paymentIntentId}`);
+    console.log(`[CONFIRM-PAYMENT] Confirming payment`, { userId: user.id, paymentIntentId });
 
     const stripe = new Stripe(stripeKey, {
       apiVersion: "2023-10-16",
     });
 
     // Retrieve the payment intent to verify it succeeded
     const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
 
     if (paymentIntent.status !== "succeeded") {
       throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
     }
 
-    // Verify the user matches
-    if (paymentIntent.metadata.user_id !== user.id) {
-      throw new Error("Payment user mismatch");
-    }
+    // Verify the user matches if metadata is present (fail closed on explicit mismatch)
+    const metaUserId = paymentIntent.metadata?.user_id;
+    if (metaUserId && metaUserId !== user.id) throw new Error("Payment user mismatch");
 
-    const credits = parseInt(paymentIntent.metadata.credits);
-    const usdAmount = paymentIntent.amount / 100;
+    // IMPORTANT:
+    // Do not grant credits here unless metadata.credits is present and valid.
+    // Checkout-based purchases should be fulfilled by stripe-credit-webhook.
+    const credits = parseCredits(paymentIntent.metadata?.credits);
+    const usdAmount = Number(((paymentIntent.amount || 0) / 100).toFixed(2));
 
-    // Check if this payment was already processed
-    const { data: existingTx } = await supabaseClient
+    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
+
+    // If webhook already processed (or in-flight), do nothing.
+    const { data: existingTx, error: existingTxError } = await supabaseAdmin
       .from("transactions")
-      .select("id")
-      .eq("stripe_payment_id", paymentIntentId)
-      .maybeSingle();
-
-    if (existingTx) {
-      console.log("Payment already processed");
+      .select("id,status,transaction_type")
+      .eq("stripe_payment_id", paymentIntentId)
+      .eq("transaction_type", "credit_purchase")
+      .limit(1);
+
+    if (existingTxError) {
+      console.error("[CONFIRM-PAYMENT] Failed to check existing transaction", { error: existingTxError.message });
+    } else if (existingTx && existingTx.length > 0) {
+      console.log("[CONFIRM-PAYMENT] Payment already processed (or in-flight)", { paymentIntentId });
       return new Response(
         JSON.stringify({ success: true, message: "Payment already processed" }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
-    // Update user's credit balance in wallets table (source of truth)
-    const { data: wallet, error: walletError } = await supabaseClient
-      .from("wallets")
-      .select("credit_balance")
-      .eq("user_id", user.id)
-      .single();
-
-    if (walletError && walletError.code !== 'PGRST116') {
-      throw new Error("Failed to fetch user wallet");
-    }
-
-    const currentBalance = wallet?.credit_balance || 0;
-    const newBalance = currentBalance + credits;
-
-    // Upsert wallet - create if not exists, update if exists
-    const { error: updateError } = await supabaseClient
-      .from("wallets")
-      .upsert({ 
-        user_id: user.id, 
-        credit_balance: newBalance,
-        updated_at: new Date().toISOString()
-      }, { onConflict: 'user_id' });
-
-    if (updateError) {
-      throw new Error("Failed to update credit balance");
-    }
-
-    // Create transaction record
-    const { error: txError } = await supabaseClient
-      .from("transactions")
-      .insert({
-        user_id: user.id,
-        transaction_type: "credit_purchase",
-        credits_amount: credits,
-        usd_amount: usdAmount,
-        stripe_payment_id: paymentIntentId,
-        status: "completed",
-        description: `Purchased ${credits} credits for $${usdAmount}`,
-      });
-
-    if (txError) {
-      console.error("Failed to create transaction record:", txError);
-    }
-
-    console.log(`Credits added: ${credits}, new balance: ${newBalance}`);
+    // If we don't have credits metadata, this is almost certainly a Checkout flow.
+    // Return success and let the webhook fulfill credits.
+    if (!credits) {
+      console.log("[CONFIRM-PAYMENT] No credits metadata on payment intent; skipping fulfillment (webhook will handle)", {
+        paymentIntentId,
+      });
+      return new Response(
+        JSON.stringify({
+          success: true,
+          message: "Payment confirmed. Credits will be applied shortly.",
+        }),
+        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
+      );
+    }
+
+    // Legacy PaymentIntent flow fulfillment (guarded + best-effort idempotency marker)
+    const description =
+      `Credit purchase via confirm-payment. credits=${credits} payment_intent=${paymentIntentId}`;
+
+    const { error: markerError } = await supabaseAdmin.from("transactions").insert({
+      user_id: user.id,
+      transaction_type: "credit_purchase",
+      credits_amount: credits,
+      usd_amount: usdAmount,
+      stripe_payment_id: paymentIntentId,
+      status: "processing",
+      description,
+    });
+
+    if (markerError) {
+      const code = (markerError as any).code;
+      const msg = markerError.message || "";
+      if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
+        return new Response(
+          JSON.stringify({ success: true, message: "Payment already processed" }),
+          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
+        );
+      }
+      console.error("[CONFIRM-PAYMENT] Failed to create processing marker (continuing)", { error: markerError.message });
+    }
+
+    // Ensure wallet exists
+    const { error: upsertError } = await supabaseAdmin
+      .from("wallets")
+      .upsert({ user_id: user.id, credit_balance: 0 }, { onConflict: "user_id" });
+    if (upsertError) throw new Error("Failed to initialize wallet");
+
+    // Prefer RPC if available
+    const { error: rpcError } = await supabaseAdmin.rpc("increment_wallet_credits", {
+      p_user_id: user.id,
+      p_credits: credits,
+    });
+
+    let newBalance: number | null = null;
+    if (rpcError) {
+      console.log("[CONFIRM-PAYMENT] increment_wallet_credits RPC failed; using fallback", { error: rpcError.message });
+
+      // CAS-style fallback
+      const { data: w, error: readError } = await supabaseAdmin
+        .from("wallets")
+        .select("credit_balance")
+        .eq("user_id", user.id)
+        .maybeSingle();
+      if (readError || !w) throw new Error("Failed to fetch user wallet");
+
+      const currentBalance = Number((w as any).credit_balance ?? 0);
+      const target = currentBalance + credits;
+
+      const { data: updated, error: updateError } = await supabaseAdmin
+        .from("wallets")
+        .update({ credit_balance: target, updated_at: new Date().toISOString() })
+        .eq("user_id", user.id)
+        .eq("credit_balance", currentBalance)
+        .select("credit_balance");
+      if (updateError) throw new Error("Failed to update credit balance");
+      if (!updated || updated.length !== 1) throw new Error("Credit balance changed. Please retry.");
+      newBalance = (updated[0] as any).credit_balance;
+    } else {
+      // Read back balance for response
+      const { data: w } = await supabaseAdmin
+        .from("wallets")
+        .select("credit_balance")
+        .eq("user_id", user.id)
+        .maybeSingle();
+      newBalance = w ? Number((w as any).credit_balance ?? 0) : null;
+    }
+
+    // Mark completed (best-effort)
+    const { error: completeError } = await supabaseAdmin
+      .from("transactions")
+      .update({ status: "completed" })
+      .eq("transaction_type", "credit_purchase")
+      .eq("stripe_payment_id", paymentIntentId);
+    if (completeError) console.error("[CONFIRM-PAYMENT] Failed to mark transaction completed", { error: completeError.message });
+
+    console.log("[CONFIRM-PAYMENT] Credits added", { credits, newBalance });
 
     return new Response(
       JSON.stringify({ 
         success: true, 
-        newBalance,
+        newBalance,
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
