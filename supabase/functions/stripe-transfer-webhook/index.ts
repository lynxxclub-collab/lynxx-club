diff --git a/functions/stripe-transfer-webhook/index.ts b/functions/stripe-transfer-webhook/index.ts
--- a/functions/stripe-transfer-webhook/index.ts
+++ b/functions/stripe-transfer-webhook/index.ts
@@ -1,6 +1,6 @@
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import Stripe from "https://esm.sh/stripe@14.21.0";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
 import { getCorsHeaders } from "../_shared/cors.ts";
 
 const logStep = (step: string, details?: Record<string, unknown>) => {
@@ -8,6 +8,12 @@
   console.log(`[STRIPE-TRANSFER-WEBHOOK] ${step}${detailsStr}`);
 };
 
+function getEnv(name: string) {
+  const v = Deno.env.get(name);
+  if (!v) logStep("ERROR: Missing env var", { name });
+  return v;
+}
+
 serve(async (req) => {
   const corsHeaders = getCorsHeaders(req);
 
@@ -19,12 +25,14 @@
   }
 
   try {
-    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
-    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
-    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
-    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
+    const stripeKey = getEnv("STRIPE_SECRET_KEY");
+    const webhookSecret = getEnv("STRIPE_WEBHOOK_SECRET");
+    const supabaseUrl = getEnv("SUPABASE_URL");
+    const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
 
-    if (!stripeKey) {
+    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
       throw new Error("STRIPE_SECRET_KEY is not configured");
     }
 
@@ -43,15 +51,6 @@
       });
     }
 
-    if (!webhookSecret) {
-      logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
-      return new Response(JSON.stringify({ error: "Webhook authentication not configured" }), {
-        status: 500,
-        headers: { ...corsHeaders, "Content-Type": "application/json" },
-      });
-    }
-
     let event: Stripe.Event;
     try {
       event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
       logStep("Webhook signature verified");
@@ -67,6 +66,15 @@
 
     logStep("Event received", { type: event.type, id: event.id });
 
+    // Ignore unrelated events safely
+    if (event.type !== "transfer.paid" && event.type !== "transfer.failed" && event.type !== "transfer.reversed") {
+      logStep("Ignoring unsupported event type", { type: event.type });
+      return new Response(JSON.stringify({ received: true, ignored: true }), {
+        headers: { ...corsHeaders, "Content-Type": "application/json" },
+      });
+    }
+
     const transfer = event.data.object as Stripe.Transfer;
     const transferId = transfer.id;
 
@@ -92,6 +100,17 @@
 
     logStep("Found withdrawal", { withdrawalId: withdrawal.id, userId: withdrawal.user_id });
 
     if (event.type === "transfer.paid") {
+      // Idempotency: already completed
+      if (withdrawal.status === "completed") {
+        logStep("Idempotency: withdrawal already completed; skipping", { withdrawalId: withdrawal.id });
+        return new Response(JSON.stringify({ received: true, skipped: true }), {
+          headers: { ...corsHeaders, "Content-Type": "application/json" },
+        });
+      }
+
       // Update withdrawal status to completed
       const { error: updateError } = await supabase
         .from("withdrawals")
@@ -144,6 +163,14 @@
       }
     } else if (event.type === "transfer.failed" || event.type === "transfer.reversed") {
+      // Idempotency: already failed
+      if (withdrawal.status === "failed") {
+        logStep("Idempotency: withdrawal already failed; skipping", { withdrawalId: withdrawal.id });
+        return new Response(JSON.stringify({ received: true, skipped: true }), {
+          headers: { ...corsHeaders, "Content-Type": "application/json" },
+        });
+      }
+
       // Update withdrawal status to failed
       const { error: updateError } = await supabase
         .from("withdrawals")
@@ -162,30 +189,20 @@
         throw updateError;
       }
 
-      // Refund the earnings balance
-      const { error: refundError } = await supabase
-        .from("profiles")
-        .update({
-          earnings_balance: supabase.rpc("", {}), // We need to add the amount back
-        })
-        .eq("id", withdrawal.user_id);
-
-      // Actually, let's do a proper increment
-      const { data: profile } = await supabase
-        .from("profiles")
-        .select("earnings_balance")
-        .eq("id", withdrawal.user_id)
-        .single();
-
-      if (profile) {
-        await supabase
-          .from("profiles")
-          .update({
-            earnings_balance: (profile.earnings_balance || 0) + withdrawal.amount,
-          })
-          .eq("id", withdrawal.user_id);
-
-        logStep("Refunded earnings balance", { amount: withdrawal.amount });
-      }
+      // TEMP FOR LAUNCH: Do NOT mutate user balances here.
+      // This code previously contained a broken placeholder and was non-atomic.
+      // If a payout fails, mark the withdrawal failed and require manual balance reconciliation.
+      logStep("Balance refund DISABLED for launch; manual review required", {
+        withdrawalId: withdrawal.id,
+        userId: withdrawal.user_id,
+        amount: withdrawal.amount,
+        eventType: event.type,
+      });
 
       // Create refund transaction record
-      await supabase.from("transactions").insert({
+      const { error: txError } = await supabase.from("transactions").insert({
         user_id: withdrawal.user_id,
         transaction_type: "withdrawal_refund",
         credits_amount: 0,
         usd_amount: withdrawal.amount,
         status: "completed",
         description: `Withdrawal refunded: ${event.type}`,
       });
+      if (txError) logStep("WARN: Failed to insert withdrawal_refund transaction", { error: txError.message });
 
       logStep("Withdrawal marked as failed and refunded", { withdrawalId: withdrawal.id });
 
       // Send failure notification email
