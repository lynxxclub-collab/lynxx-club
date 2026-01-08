diff --git a/functions/process-withdrawal/index.ts b/functions/process-withdrawal/index.ts
--- a/functions/process-withdrawal/index.ts
+++ b/functions/process-withdrawal/index.ts
@@ -1,120 +1,142 @@
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import Stripe from "https://esm.sh/stripe@14.21.0";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
 import { getCorsHeaders } from "../_shared/cors.ts";
 import { createAutoErrorResponse } from "../_shared/errors.ts";
 
 // Fixed minimum payout - NO EXCEPTIONS
 const PAYOUT_MINIMUM_USD = 25.00;
 
 const logStep = (step: string, details?: any) => {
   const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
   console.log(`[PROCESS-WITHDRAWAL] ${step}${detailsStr}`);
 };
 
 // Input validation
 function validateAmount(value: unknown): number {
   if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
     throw new Error("Amount must be a valid number");
   }
   if (value < PAYOUT_MINIMUM_USD) {
     throw new Error(`Minimum withdrawal is $${PAYOUT_MINIMUM_USD}. No exceptions.`);
   }
   if (value > 10000) {
     throw new Error("Maximum withdrawal is $10,000 per transaction");
   }
   // Ensure 2 decimal precision
   return Math.round(value * 100) / 100;
 }
 
 serve(async (req) => {
   const corsHeaders = getCorsHeaders(req);
   
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
+  // TEMP DISABLED FOR LAUNCH:
+  // Automated withdrawals are high-risk and can strand creator balances if transfers fail.
+  // Re-enable post-launch only after webhook-driven settlement + idempotent balance updates are verified end-to-end.
+  logStep("Withdrawals DISABLED for launch");
+  return new Response(
+    JSON.stringify({
+      success: false,
+      error: "Withdrawals are temporarily disabled. Please contact support for manual payout.",
+      code: "withdrawals_disabled",
+    }),
+    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
+  );
+
   try {
     logStep("Withdrawal request received");
 
     const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
     if (!stripeKey) {
       throw new Error("Stripe not configured");
     }
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     
     const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
 
     // Get user from auth header
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       throw new Error("No authorization header");
     }
 
     const token = authHeader.replace("Bearer ", "");
     const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
     
     if (authError || !user) {
       throw new Error("Invalid user session");
     }
 
     logStep("User authenticated", { userId: user.id });
 
     // Parse and validate input
     const body = await req.json();
     const amount = validateAmount(body.amount);
 
     logStep("Amount validated", { amount });
 
     // Get user wallet (NOT profile.earnings_balance - use wallets table!)
     const { data: wallet, error: walletError } = await supabaseClient
       .from("wallets")
       .select("available_earnings, pending_earnings, paid_out_total, payout_hold, payout_hold_reason")
       .eq("user_id", user.id)
       .single();
 
     if (walletError || !wallet) {
       logStep("ERROR: Wallet not found", { error: walletError?.message });
       throw new Error("Wallet not found. Please contact support.");
     }
 
     logStep("Wallet retrieved", { 
       available: wallet.available_earnings,
       pending: wallet.pending_earnings,
       paidOut: wallet.paid_out_total,
       onHold: wallet.payout_hold
     });
 
     // Check if payouts are on hold (fraud prevention)
     if (wallet.payout_hold) {
       throw new Error(`Your payouts are temporarily on hold. Reason: ${wallet.payout_hold_reason || 'Under review'}. Contact support for assistance.`);
     }
 
     // Check available balance (NOT pending - only available can be withdrawn)
     if (wallet.available_earnings < amount) {
       throw new Error(`Insufficient available balance. You have $${wallet.available_earnings.toFixed(2)} available for withdrawal.`);
     }
 
     // Get user profile for Stripe account info
     const { data: profile, error: profileError } = await supabaseClient
       .from("profiles")
       .select("stripe_account_id, stripe_onboarding_complete, name, email")
       .eq("id", user.id)
       .single();
 
     if (profileError || !profile) {
       throw new Error("Profile not found");
     }
 
     if (!profile.stripe_account_id || !profile.stripe_onboarding_complete) {
       throw new Error("Please complete bank account setup first");
     }
 
     logStep("Profile verified", { stripeAccountId: profile.stripe_account_id });
 
     const stripe = new Stripe(stripeKey, {
       apiVersion: "2023-10-16",
     });
 
     logStep(`Processing withdrawal of $${amount} for user ${user.id}`);
 
     // Create transfer to connected account via Stripe Connect
     const transfer = await stripe.transfers.create({
       amount: Math.round(amount * 100), // Convert to cents
       currency: "usd",
       destination: profile.stripe_account_id,
       metadata: {
         user_id: user.id,
         user_email: profile.email,
         withdrawal_type: "creator_payout",
         platform: "lynxxclub",
       },
     });
 
     logStep("Stripe transfer created", { transferId: transfer.id });
 
     // Calculate new balances
     const newAvailableBalance = wallet.available_earnings - amount;
     const newPaidOutTotal = (wallet.paid_out_total || 0) + amount;
 
     // Update wallet balances
     const { error: updateWalletError } = await supabaseClient
       .from("wallets")
       .update({ 
         available_earnings: newAvailableBalance,
         paid_out_total: newPaidOutTotal,
         last_payout_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
       })
       .eq("user_id", user.id);
 
     if (updateWalletError) {
       logStep("ERROR: Failed to update wallet", { error: updateWalletError.message });
       // Transfer was successful but wallet update failed - this needs manual intervention
       throw new Error("Withdrawal processing error. Please contact support with transfer ID: " + transfer.id);
     }
 
     logStep("Wallet updated", { newAvailable: newAvailableBalance, newPaidOut: newPaidOutTotal });
 
     // Create withdrawal record
     const { error: withdrawalError } = await supabaseClient
       .from("withdrawals")
       .insert({
         user_id: user.id,
         amount: amount,
         status: "completed",
         stripe_transfer_id: transfer.id,
         processed_at: new Date().toISOString(),
       });
 
     if (withdrawalError) {
       logStep("WARNING: Failed to create withdrawal record", { error: withdrawalError.message });
       // Non-critical - withdrawal was successful
     }
 
     // Create transaction record for audit trail
     const { error: txError } = await supabaseClient
       .from("transactions")
       .insert({
         user_id: user.id,
         transaction_type: "withdrawal",
         credits_amount: 0,
         usd_amount: -amount,
         status: "completed",
         stripe_payment_id: transfer.id,
         description: `Withdrawal of $${amount.toFixed(2)} to connected bank account`,
       });
 
     if (txError) {
       logStep("WARNING: Failed to create transaction record", { error: txError.message });
     }
 
     // Create payout schedule record
     await supabaseClient
       .from("payout_schedules")
       .insert({
         user_id: user.id,
         scheduled_for: new Date().toISOString(),
         amount: amount,
         status: "completed",
         stripe_transfer_id: transfer.id,
         processed_at: new Date().toISOString(),
       });
 
     logStep(`Withdrawal successful. Transfer ID: ${transfer.id}`);
 
     return new Response(
       JSON.stringify({ 
         success: true, 
         transferId: transfer.id,
         newAvailableBalance,
         newPaidOutTotal,
         message: "Withdrawal successful! Funds will arrive in 2-3 business days."
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error: unknown) {
     console.error("Error processing withdrawal:", error);
     return createAutoErrorResponse(error, getCorsHeaders(req));
   }
 });
