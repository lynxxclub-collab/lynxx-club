diff --git a/functions/stripe-credit-webhook/index.ts b/functions/stripe-credit-webhook/index.ts
--- a/functions/stripe-credit-webhook/index.ts
+++ b/functions/stripe-credit-webhook/index.ts
@@ -1,10 +1,24 @@
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import Stripe from "https://esm.sh/stripe@18.5.0";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 import { PRICING, calculateCreatorEarnings } from "../_shared/pricing.ts";
 
 const logStep = (step: string, details?: any) => {
   const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
   console.log(`[STRIPE-CREDIT-WEBHOOK] ${step}${detailsStr}`);
 };
 
+const UUID_RE =
+  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
+
+function getEnv(name: string) {
+  const v = Deno.env.get(name);
+  if (!v) logStep(`ERROR: Missing env var ${name}`);
+  return v;
+}
+
 serve(async (req) => {
   try {
     logStep("Webhook received");
@@ -55,15 +69,36 @@
 
     logStep("Event verified", { type: event.type, id: event.id });
 
+    // TEMP DISABLE FOR LAUNCH: high-risk clawbacks not needed for core credits MVP.
+    if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
+      logStep("Chargeback/refund handling DISABLED for launch", { type: event.type, id: event.id });
+      return new Response(JSON.stringify({ received: true, ignored: true }), {
+        headers: { "Content-Type": "application/json" },
+        status: 200,
+      });
+    }
+
     // Create Supabase client with service role to bypass RLS
     const supabaseAdmin = createClient(
-      Deno.env.get("SUPABASE_URL") ?? "",
-      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
+      getEnv("SUPABASE_URL") ?? "",
+      getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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
 
-      if (!userId || !packId || credits <= 0) {
+      if (!userId || !UUID_RE.test(userId) || !packId || credits <= 0 || !Number.isFinite(credits)) {
         logStep("ERROR: Missing or invalid metadata", { userId, packId, credits });
         return new Response("Missing metadata", { status: 400 });
       }
 
+      const paymentIntent =
+        (typeof session.payment_intent === "string" && session.payment_intent.length > 0)
+          ? session.payment_intent
+          : session.id;
+
       logStep("Metadata extracted", { userId, packId, credits });
 
+      // IDEMPOTENCY: if already completed, skip.
+      const { data: existingTx, error: existingTxError } = await supabaseAdmin
+        .from("transactions")
+        .select("id,status")
+        .eq("transaction_type", "credit_purchase")
+        .eq("stripe_payment_id", paymentIntent)
+        .limit(1);
+
+      if (existingTxError) {
+        logStep("WARN: Idempotency check failed (continuing)", { error: existingTxError.message });
+      } else if (existingTx && existingTx.length > 0) {
+        const status = (existingTx[0] as any).status;
+        if (status === "completed" || status === "processing") {
+          logStep("Idempotency: already processed or in-flight; skipping", { paymentIntent, status });
+          return new Response(JSON.stringify({ received: true, skipped: true }), {
+            headers: { "Content-Type": "application/json" },
+            status: 200,
+          });
+        }
+      }
+
+      const purchaseDescription =
+        `Purchased credit pack (${credits} credits) pack_id=${packId} session_id=${session.id} event_id=${event.id} payment_intent=${paymentIntent}`;
+
+      // Best-effort processing marker; if you have a unique constraint this becomes strong idempotency.
+      const { error: txInsertError } = await supabaseAdmin
+        .from("transactions")
+        .insert({
+          user_id: userId,
+          transaction_type: "credit_purchase",
+          credits_amount: credits,
+          usd_amount: (session.amount_total || 0) / 100,
+          status: "processing",
+          stripe_payment_id: paymentIntent,
+          description: purchaseDescription,
+        });
+
+      if (txInsertError) {
+        const code = (txInsertError as any).code;
+        const msg = txInsertError.message || "";
+        if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
+          logStep("Idempotency: duplicate transaction marker; skipping", { paymentIntent });
+          return new Response(JSON.stringify({ received: true, skipped: true }), {
+            headers: { "Content-Type": "application/json" },
+            status: 200,
+          });
+        }
+        logStep("WARN: Failed to insert processing marker (continuing)", { error: txInsertError.message });
+      }
+
       // Check if wallet exists, create if not
       const { data: existingWallet } = await supabaseAdmin
         .from("wallets")
         .select("user_id, credit_balance")
         .eq("user_id", userId)
         .maybeSingle();
@@ -101,21 +136,33 @@
       const { error: walletError } = await supabaseAdmin.rpc("increment_wallet_credits", {
         p_user_id: userId,
         p_credits: credits,
       });
 
       // If RPC doesn't exist, fall back to direct update
       if (walletError) {
         logStep("RPC not available, using direct update", { error: walletError.message });
-        
-        const { error: updateError } = await supabaseAdmin
+
+        // Re-fetch to avoid stale read-modify-write when retries happen.
+        const { data: currentWallet, error: currentWalletError } = await supabaseAdmin
+          .from("wallets")
+          .select("credit_balance")
+          .eq("user_id", userId)
+          .maybeSingle();
+
+        if (currentWalletError || !currentWallet) {
+          logStep("ERROR: Failed to re-fetch wallet", { error: currentWalletError?.message });
+          await supabaseAdmin
+            .from("transactions")
+            .update({ status: "failed" })
+            .eq("transaction_type", "credit_purchase")
+            .eq("stripe_payment_id", paymentIntent);
+          return new Response("Failed to update wallet", { status: 500 });
+        }
+
+        const { error: updateError } = await supabaseAdmin
           .from("wallets")
           .update({ 
-            credit_balance: (existingWallet?.credit_balance || 0) + credits,
+            credit_balance: (currentWallet.credit_balance || 0) + credits,
             updated_at: new Date().toISOString()
           })
           .eq("user_id", userId);
 
         if (updateError) {
           logStep("ERROR: Failed to update wallet", { error: updateError.message });
+          await supabaseAdmin
+            .from("transactions")
+            .update({ status: "failed" })
+            .eq("transaction_type", "credit_purchase")
+            .eq("stripe_payment_id", paymentIntent);
           return new Response("Failed to update wallet", { status: 500 });
         }
       }
 
       logStep("Wallet updated", { userId, creditsAdded: credits });
@@ -126,7 +173,7 @@
       const { error: ledgerError } = await supabaseAdmin
         .from("ledger_entries")
         .insert({
           user_id: userId,
           entry_type: "credit_purchase",
           credits_delta: credits,
           usd_delta: (session.amount_total || 0) / 100, // Convert cents to dollars
           reference_id: packId,
           reference_type: "credit_pack",
-          description: `Purchased credit pack (${credits} credits)`,
+          description: purchaseDescription,
         });
 
       if (ledgerError) {
         logStep("ERROR: Failed to create ledger entry", { error: ledgerError.message });
         // Don't fail the webhook - credits were already added
       } else {
         logStep("Ledger entry created");
       }
 
+      // Mark transaction completed (best-effort)
+      const { error: txUpdateError } = await supabaseAdmin
+        .from("transactions")
+        .update({ status: "completed" })
+        .eq("transaction_type", "credit_purchase")
+        .eq("stripe_payment_id", paymentIntent);
+      if (txUpdateError) {
+        logStep("WARN: Failed to mark transaction completed", { error: txUpdateError.message });
+      }
+
       logStep("Checkout completed successfully", { userId, credits });
     }
 
-    // Handle charge.refunded (credit pack refund/chargeback)
-    if (event.type === "charge.refunded") {
-      const charge = event.data.object as Stripe.Charge;
-      logStep("Processing charge.refunded", { chargeId: charge.id });
-
-      await handleChargeback(supabaseAdmin, charge, "refund");
-    }
-
-    // Handle charge.dispute.created (chargeback dispute)
-    if (event.type === "charge.dispute.created") {
-      const dispute = event.data.object as Stripe.Dispute;
-      logStep("Processing charge.dispute.created", { disputeId: dispute.id });
-
-      // Get the charge associated with the dispute
-      const charge = await stripe.charges.retrieve(dispute.charge as string);
-      await handleChargeback(supabaseAdmin, charge as Stripe.Charge, "dispute");
-    }
-
     return new Response(JSON.stringify({ received: true }), {
       headers: { "Content-Type": "application/json" },
       status: 200,
     });
   } catch (error) {
