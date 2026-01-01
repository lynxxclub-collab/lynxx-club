import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Fixed minimum payout - NO EXCEPTIONS
const PAYOUT_MINIMUM_USD = 25.00;
const MAX_RETRY_COUNT = 3;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RUN-WEEKLY-PAYOUTS] ${step}${detailsStr}`);
};

interface EligibleCreator {
  user_id: string;
  available_earnings: number;
  stripe_account_id: string;
  name: string;
  email: string;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Weekly payout run started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find all eligible creators:
    // 1. available_earnings >= $25 (fixed minimum, no exceptions)
    // 2. stripe_onboarding_complete = true
    // 3. payout_hold = false
    const { data: eligibleWallets, error: walletsError } = await supabaseClient
      .from("wallets")
      .select("user_id, available_earnings, payout_hold")
      .gte("available_earnings", PAYOUT_MINIMUM_USD)
      .eq("payout_hold", false);

    if (walletsError) {
      logStep("ERROR: Failed to fetch eligible wallets", { error: walletsError.message });
      throw new Error("Failed to fetch eligible wallets");
    }

    logStep(`Found ${eligibleWallets?.length || 0} wallets with >= $${PAYOUT_MINIMUM_USD}`);

    if (!eligibleWallets || eligibleWallets.length === 0) {
      logStep("No eligible creators for payout");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No eligible creators for payout" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profile info for each eligible wallet
    const eligibleCreators: EligibleCreator[] = [];
    
    for (const wallet of eligibleWallets) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("id, stripe_account_id, stripe_onboarding_complete, name, email")
        .eq("id", wallet.user_id)
        .eq("stripe_onboarding_complete", true)
        .not("stripe_account_id", "is", null)
        .single();

      if (profile && profile.stripe_account_id) {
        eligibleCreators.push({
          user_id: wallet.user_id,
          available_earnings: wallet.available_earnings,
          stripe_account_id: profile.stripe_account_id,
          name: profile.name || "Creator",
          email: profile.email,
        });
      }
    }

    logStep(`${eligibleCreators.length} creators with complete Stripe setup`);

    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      totalPaidOut: 0,
      errors: [] as string[],
    };

    // Process each eligible creator
    for (const creator of eligibleCreators) {
      results.processed++;
      const payoutAmount = creator.available_earnings;

      try {
        logStep(`Processing payout for ${creator.name}`, { 
          userId: creator.user_id, 
          amount: payoutAmount 
        });

        // Check for existing pending payout schedule to prevent duplicates
        const { data: existingPayout } = await supabaseClient
          .from("payout_schedules")
          .select("id")
          .eq("user_id", creator.user_id)
          .eq("status", "pending")
          .single();

        if (existingPayout) {
          logStep(`Skipping ${creator.name} - already has pending payout`);
          continue;
        }

        // Create payout schedule record (pending)
        const { data: scheduleRecord, error: scheduleError } = await supabaseClient
          .from("payout_schedules")
          .insert({
            user_id: creator.user_id,
            scheduled_for: new Date().toISOString(),
            amount: payoutAmount,
            status: "processing",
          })
          .select()
          .single();

        if (scheduleError) {
          logStep(`ERROR: Failed to create schedule for ${creator.name}`, { error: scheduleError.message });
          results.failed++;
          results.errors.push(`${creator.name}: Failed to create schedule`);
          continue;
        }

        // Create Stripe transfer
        const transfer = await stripe.transfers.create({
          amount: Math.round(payoutAmount * 100), // Convert to cents
          currency: "usd",
          destination: creator.stripe_account_id,
          metadata: {
            user_id: creator.user_id,
            user_email: creator.email,
            payout_type: "weekly_automated",
            schedule_id: scheduleRecord.id,
            platform: "lynxxclub",
          },
        });

        logStep(`Transfer created for ${creator.name}`, { transferId: transfer.id });

        // Get current wallet state
        const { data: currentWallet } = await supabaseClient
          .from("wallets")
          .select("available_earnings, paid_out_total")
          .eq("user_id", creator.user_id)
          .single();

        if (!currentWallet) {
          throw new Error("Wallet not found after transfer");
        }

        // Update wallet balances
        const { error: walletUpdateError } = await supabaseClient
          .from("wallets")
          .update({
            available_earnings: currentWallet.available_earnings - payoutAmount,
            paid_out_total: (currentWallet.paid_out_total || 0) + payoutAmount,
            last_payout_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", creator.user_id);

        if (walletUpdateError) {
          logStep(`ERROR: Failed to update wallet for ${creator.name}`, { error: walletUpdateError.message });
          // Transfer was successful but wallet update failed - mark for manual review
          await supabaseClient
            .from("payout_schedules")
            .update({
              status: "completed",
              stripe_transfer_id: transfer.id,
              error_message: "Wallet update failed - needs manual review",
              processed_at: new Date().toISOString(),
            })
            .eq("id", scheduleRecord.id);
        } else {
          // Update schedule to completed
          await supabaseClient
            .from("payout_schedules")
            .update({
              status: "completed",
              stripe_transfer_id: transfer.id,
              processed_at: new Date().toISOString(),
            })
            .eq("id", scheduleRecord.id);
        }

        // Create withdrawal record
        await supabaseClient
          .from("withdrawals")
          .insert({
            user_id: creator.user_id,
            amount: payoutAmount,
            status: "completed",
            stripe_transfer_id: transfer.id,
            processed_at: new Date().toISOString(),
          });

        // Create transaction record
        await supabaseClient
          .from("transactions")
          .insert({
            user_id: creator.user_id,
            transaction_type: "withdrawal",
            credits_amount: 0,
            usd_amount: -payoutAmount,
            status: "completed",
            stripe_payment_id: transfer.id,
            description: `Weekly automated payout of $${payoutAmount.toFixed(2)}`,
          });

        results.success++;
        results.totalPaidOut += payoutAmount;

        logStep(`Payout successful for ${creator.name}`, { 
          amount: payoutAmount, 
          transferId: transfer.id 
        });

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logStep(`ERROR: Payout failed for ${creator.name}`, { error: errorMessage });
        results.failed++;
        results.errors.push(`${creator.name}: ${errorMessage}`);

        // Update schedule to failed with retry count
        await supabaseClient
          .from("payout_schedules")
          .update({
            status: "failed",
            error_message: errorMessage,
            retry_count: 1,
          })
          .eq("user_id", creator.user_id)
          .eq("status", "processing");
      }
    }

    logStep("Weekly payout run completed", {
      processed: results.processed,
      success: results.success,
      failed: results.failed,
      totalPaidOut: results.totalPaidOut,
    });

    return new Response(
      JSON.stringify({
        processed: results.processed,
        successCount: results.success,
        failed: results.failed,
        totalPaidOut: results.totalPaidOut,
        errors: results.errors,
        message: `Processed ${results.success} payouts totaling $${results.totalPaidOut.toFixed(2)}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR: Weekly payout run failed", { error: errorMessage });
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
