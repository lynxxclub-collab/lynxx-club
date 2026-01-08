diff --git a/functions/send-message-volley/index.ts b/functions/send-message-volley/index.ts
--- a/functions/send-message-volley/index.ts
+++ b/functions/send-message-volley/index.ts
@@ -1,9 +1,10 @@
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 import { getCorsHeaders } from "../_shared/cors.ts";
 import { createAutoErrorResponse, createErrorResponse } from "../_shared/errors.ts";
 import { MESSAGE_MAX_LENGTH, isValidUUID, sanitizeTextContent } from "../_shared/validation.ts";
 import { PRICING, calculateEarnings } from "../_shared/pricing.ts";
+import { verifyAuth } from "../_shared/auth.ts";
 
 // =============================================================================
 // CONFIGURATION
@@ -86,12 +87,13 @@
 function getCreditsForMessageType(messageType: string): number {
   return messageType === 'image' ? CONFIG.credits.image : CONFIG.credits.text;
 }
 
 function calculateBillingAmounts(credits: number) {
-  const usdAmount = credits * CONFIG.usdPerCredit;
-  const platformFee = usdAmount * CONFIG.platformFeePercent;
-  const providerEarning = usdAmount * CONFIG.providerEarningPercent;
-  return { usdAmount, platformFee, providerEarning };
+  const { grossUsd, creatorUsd, platformUsd } = calculateEarnings(credits);
+  return { usdAmount: grossUsd, platformFee: platformUsd, providerEarning: creatorUsd };
 }
 
 // deno-lint-ignore no-explicit-any
 async function getOrCreateWallet(supabaseAdmin: any, userId: string): Promise<WalletData> {
   const { data: wallet, error } = await supabaseAdmin
@@ -109,14 +111,30 @@
 
   if (wallet) return wallet as WalletData;
 
   const { data: newWallet, error: createError } = await supabaseAdmin
     .from("wallets")
     .insert({ user_id: userId, credit_balance: 0, pending_earnings: 0 })
     .select("credit_balance, pending_earnings")
     .single();
 
-  if (createError) throw new Error(`Error creating wallet: ${createError.message}`);
+  if (createError) {
+    const msg = createError.message || "";
+    const code = (createError as any).code;
+    // tolerate concurrent wallet creation
+    if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
+      const { data: retryWallet, error: retryError } = await supabaseAdmin
+        .from("wallets")
+        .select("credit_balance, pending_earnings")
+        .eq("user_id", userId)
+        .maybeSingle();
+      if (retryError || !retryWallet) throw new Error(`Error creating wallet: ${createError.message}`);
+      return retryWallet as WalletData;
+    }
+    throw new Error(`Error creating wallet: ${createError.message}`);
+  }
   return newWallet as WalletData;
 }
 
 // deno-lint-ignore no-explicit-any
 async function getOrCreateConversation(
@@ -131,6 +149,14 @@
       .maybeSingle();
 
     if (error) throw new Error(`Error fetching conversation: ${error.message}`);
     if (!conv) throw new Error("Conversation not found");
 
     const convData = conv as ConversationData;
+
+    // P0: prevent cross-user access since we use service role
+    if (senderId !== convData.seeker_id && senderId !== convData.earner_id) {
+      logStep("FORBIDDEN: sender not part of conversation", { senderId, conversationId: existingConversationId });
+      throw new Error("Forbidden");
+    }
+
     const payerUserId = convData.payer_user_id || convData.seeker_id;
 
     return {
       conversationId: convData.id,
       seekerId: convData.seeker_id,
@@ -260,6 +286,9 @@
   const creditsForMessage = getCreditsForMessageType(messageType);
   const { platformFee, providerEarning } = calculateBillingAmounts(creditsForMessage);
 
   let billing: BillingResult = {
     charged: false,
@@ -278,30 +307,95 @@
   if (isBillableVolley) {
     // Get payer wallet and check balance
     const payerWallet = await getOrCreateWallet(supabaseAdmin, payerUserId);
     
     if (payerWallet.credit_balance < creditsForMessage) {
       throw new Error(`Insufficient credits. Need ${creditsForMessage}, have ${payerWallet.credit_balance}`);
     }
 
-    // Deduct credits from payer
-    const { data: updatedWallet, error: deductError } = await supabaseAdmin
+    // Deduct credits from payer (CAS-style to reduce race conditions)
+    const newBalance = payerWallet.credit_balance - creditsForMessage;
+    const { data: updatedWalletRows, error: deductError } = await supabaseAdmin
       .from("wallets")
-      .update({ credit_balance: payerWallet.credit_balance - creditsForMessage })
+      .update({ credit_balance: newBalance })
       .eq("user_id", payerUserId)
-      .select("credit_balance")
-      .single();
+      .eq("credit_balance", payerWallet.credit_balance)
+      .select("credit_balance");
 
     if (deductError) throw new Error(`Error deducting credits: ${deductError.message}`);
 
-    // Add earnings to earner
+    if (!updatedWalletRows || updatedWalletRows.length !== 1) {
+      // Balance changed between read and update; fail closed.
+      const latest = await getOrCreateWallet(supabaseAdmin, payerUserId);
+      if (latest.credit_balance < creditsForMessage) {
+        throw new Error(`Insufficient credits. Need ${creditsForMessage}, have ${latest.credit_balance}`);
+      }
+      throw new Error("Credit balance changed. Please retry.");
+    }
+
+    const updatedBalance = (updatedWalletRows[0] as { credit_balance: number }).credit_balance;
+
+    // Add earnings to earner (CAS-style). If this fails after debit, rollback debit best-effort.
     const earnerWallet = await getOrCreateWallet(supabaseAdmin, earnerId);
-    const { error: earnError } = await supabaseAdmin
+    const newPending = Number((earnerWallet.pending_earnings + providerEarning).toFixed(2));
+
+    let earnApplied = false;
+    {
+      const { data: earnRows, error: earnError } = await supabaseAdmin
+        .from("wallets")
+        .update({ pending_earnings: newPending })
+        .eq("user_id", earnerId)
+        .eq("pending_earnings", earnerWallet.pending_earnings)
+        .select("pending_earnings");
+
+      if (earnError) {
+        // rollback below
+        logStep("ERROR: earnings update failed after debit", { error: earnError.message, earnerId });
+      } else if (earnRows && earnRows.length === 1) {
+        earnApplied = true;
+      } else {
+        // one retry on contention
+        const latestEarner = await getOrCreateWallet(supabaseAdmin, earnerId);
+        const retryPending = Number((latestEarner.pending_earnings + providerEarning).toFixed(2));
+        const { data: retryRows, error: retryError } = await supabaseAdmin
+          .from("wallets")
+          .update({ pending_earnings: retryPending })
+          .eq("user_id", earnerId)
+          .eq("pending_earnings", latestEarner.pending_earnings)
+          .select("pending_earnings");
+        if (retryError) {
+          logStep("ERROR: earnings retry failed after debit", { error: retryError.message, earnerId });
+        } else if (retryRows && retryRows.length === 1) {
+          earnApplied = true;
+        }
+      }
+    }
+
+    if (!earnApplied) {
+      // Best-effort rollback of debit: only if payer balance still equals the debited value.
+      const rollbackTarget = updatedBalance;
+      const { data: rollbackRows, error: rollbackError } = await supabaseAdmin
+        .from("wallets")
+        .update({ credit_balance: rollbackTarget + creditsForMessage })
+        .eq("user_id", payerUserId)
+        .eq("credit_balance", rollbackTarget)
+        .select("credit_balance");
+
+      if (rollbackError || !rollbackRows || rollbackRows.length !== 1) {
+        logStep("CRITICAL: Failed to rollback debit after earnings failure", {
+          payerUserId,
+          rollbackError: rollbackError?.message,
+        });
+      } else {
+        logStep("Rolled back debit after earnings failure", { payerUserId });
+      }
+
+      throw new Error("Billing failed. No credits were charged.");
+    }
+
+    // Success
+    billing = {
+      charged: true,
+      creditsSpent: creditsForMessage,
+      newBalance: updatedBalance,
+      earnerAmount: providerEarning,
+      platformFee: platformFee,
+    };
-      .from("wallets")
-      .update({ pending_earnings: earnerWallet.pending_earnings + providerEarning })
-      .eq("user_id", earnerId);
-
-    if (earnError) throw new Error(`Error adding earnings: ${earnError.message}`);
-
-    billing = {
-      charged: true,
-      creditsSpent: creditsForMessage,
-      newBalance: (updatedWallet as { credit_balance: number }).credit_balance,
-      earnerAmount: providerEarning,
-      platformFee: platformFee,
-    };
   }
@@ -362,12 +456,11 @@
   // Update conversation stats
   await supabaseAdmin
     .from("conversations")
     .update({
-      total_credits_spent: billing.charged ? creditsForMessage : 0,
       last_message_at: new Date().toISOString(),
     })
     .eq("id", conversationId);
 
   return { message: message as Record<string, unknown>, billing };
 }
@@ -394,35 +487,23 @@
     const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
 
-    // Authenticate user
-    const authHeader = req.headers.get("Authorization");
-    if (!authHeader) {
-      return createErrorResponse("Missing authorization header", "unauthorized", corsHeaders, 401);
-    }
-
-    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
-      global: { headers: { Authorization: authHeader } },
-    });
-
-    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
-    if (authError || !user) {
-      return createErrorResponse("Unauthorized", "unauthorized", corsHeaders, 401);
-    }
+    // Centralized auth verification
+    const { user, error: authError } = await verifyAuth(req);
+    if (authError || !user) return createErrorResponse("Unauthorized", "unauthorized", corsHeaders, 401);
 
     logStep("User authenticated", { userId: user.id });
