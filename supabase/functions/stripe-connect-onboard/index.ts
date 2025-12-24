import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Get user profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete, email, name")
      .eq("id", user.id)
      .single();

    let accountId = profile?.stripe_account_id;

    // Create Stripe Connect account if doesn't exist
    if (!accountId) {
      console.log("Creating new Stripe Connect account for user:", user.id);
      
      const account = await stripe.accounts.create({
        type: "express",
        email: profile?.email || user.email,
        metadata: {
          supabase_user_id: user.id,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      // Save account ID to profile
      await supabaseClient
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
    }

    // Check if onboarding is complete
    const account = await stripe.accounts.retrieve(accountId);
    const isComplete = account.details_submitted && account.payouts_enabled;

    if (isComplete) {
      // Update profile if not already marked as complete
      if (!profile?.stripe_onboarding_complete) {
        await supabaseClient
          .from("profiles")
          .update({ stripe_onboarding_complete: true })
          .eq("id", user.id);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          onboardingComplete: true,
          accountId 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate onboarding link
    const origin = req.headers.get("origin") || "https://lovable.dev";
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard?stripe_refresh=true`,
      return_url: `${origin}/dashboard?stripe_success=true`,
      type: "account_onboarding",
    });

    console.log("Generated onboarding link for account:", accountId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        onboardingComplete: false,
        onboardingUrl: accountLink.url,
        accountId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error with Stripe Connect:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});