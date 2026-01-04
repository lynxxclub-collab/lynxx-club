import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GET-STRIPE-BALANCE] ${step}${detailsStr}`);
};

// Get next Friday date for payout scheduling
function getNextFriday(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7; // If today is Friday, get next Friday
  const nextFriday = new Date(now);
  nextFriday.setUTCDate(now.getUTCDate() + daysUntilFriday);
  nextFriday.setUTCHours(12, 0, 0, 0); // Noon UTC
  return nextFriday;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Authentication failed");

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    // Get user's Stripe account ID from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("id", userId)
      .single();

    if (profileError) throw new Error("Failed to fetch profile");

    if (!profile?.stripe_account_id || !profile?.stripe_onboarding_complete) {
      logStep("No Stripe account connected");
      return new Response(
        JSON.stringify({
          connected: false,
          available: 0,
          pending: 0,
          nextPayoutDate: null,
          nextPayoutAmount: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Fetching Stripe balance", { stripeAccountId: profile.stripe_account_id });

    // Get the connected account's balance from Stripe
    const balance = await stripe.balance.retrieve({
      stripeAccount: profile.stripe_account_id,
    });

    // Convert from cents to dollars
    const availableBalance = (balance.available?.[0]?.amount || 0) / 100;
    const pendingBalance = (balance.pending?.[0]?.amount || 0) / 100;

    logStep("Balance retrieved from Stripe", { availableBalance, pendingBalance });

    // Get wallet data for next payout calculation
    const { data: wallet } = await supabase
      .from("wallets")
      .select("available_earnings, paid_out_total")
      .eq("user_id", userId)
      .single();

    const PAYOUT_MINIMUM = 25.0;
    const nextFriday = getNextFriday();
    const walletAvailable = wallet?.available_earnings || 0;

    // Determine next payout info
    let nextPayoutAmount = 0;
    let nextPayoutDate: string | null = null;
    let nextPayoutStatus = "accumulating";

    if (walletAvailable >= PAYOUT_MINIMUM) {
      nextPayoutAmount = walletAvailable;
      nextPayoutDate = nextFriday.toISOString();
      nextPayoutStatus = "scheduled";
    } else if (walletAvailable > 0) {
      nextPayoutAmount = walletAvailable;
      nextPayoutDate = nextFriday.toISOString();
      nextPayoutStatus = "below_minimum";
    }

    const response = {
      connected: true,
      available: availableBalance,
      pending: pendingBalance,
      walletAvailable: walletAvailable,
      paidOutTotal: wallet?.paid_out_total || 0,
      nextPayoutDate,
      nextPayoutAmount,
      nextPayoutStatus,
      payoutMinimum: PAYOUT_MINIMUM,
    };

    logStep("Returning balance data", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
