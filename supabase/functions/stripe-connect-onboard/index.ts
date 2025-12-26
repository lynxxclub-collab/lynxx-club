import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// CORS configuration with origin validation
const ALLOWED_ORIGINS = [
  'https://lynxxclub.com',
  'https://www.lynxxclub.com',
  'https://app.lynxxclub.com',
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  let allowedOrigin = '';
  
  if (origin) {
    for (const allowed of ALLOWED_ORIGINS) {
      if (typeof allowed === 'string' && origin === allowed) {
        allowedOrigin = origin;
        break;
      } else if (allowed instanceof RegExp && allowed.test(origin)) {
        allowedOrigin = origin;
        break;
      }
    }
  }
  
  if (!allowedOrigin && origin) {
    console.warn(`CORS: Origin not in allowed list: ${origin}`);
    allowedOrigin = origin;
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || 'https://lynxxclub.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Helper logging function for debugging
const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-ONBOARD] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: Stripe key not configured");
      throw new Error("Stripe not configured");
    }
    logStep("Stripe key verified");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Supabase config missing", { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey });
      throw new Error("Supabase not configured");
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    logStep("Supabase client created");

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header provided");
      throw new Error("No authorization header - please log in");
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    if (!token || token === "undefined" || token === "null") {
      logStep("ERROR: Invalid token format", { tokenStart: token?.substring(0, 20) });
      throw new Error("Invalid authentication token");
    }
    
    logStep("Authenticating user with token");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      logStep("ERROR: Auth error", { message: authError.message, status: authError.status });
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    if (!user) {
      logStep("ERROR: No user returned from auth");
      throw new Error("User not found - please log in again");
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });
    logStep("Stripe client initialized");

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete, email, name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      logStep("ERROR: Failed to fetch profile", { error: profileError.message });
      throw new Error("Failed to fetch user profile");
    }
    logStep("Profile fetched", { hasStripeAccount: !!profile?.stripe_account_id });

    let accountId = profile?.stripe_account_id;

    // Create Stripe Connect account if doesn't exist
    if (!accountId) {
      logStep("Creating new Stripe Connect account");
      
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
      logStep("Stripe account created", { accountId });

      // Save account ID to profile
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);

      if (updateError) {
        logStep("WARNING: Failed to save account ID to profile", { error: updateError.message });
      }
    }

    // Check if onboarding is complete
    const account = await stripe.accounts.retrieve(accountId);
    const isComplete = account.details_submitted && account.payouts_enabled;
    logStep("Account status checked", { isComplete, detailsSubmitted: account.details_submitted, payoutsEnabled: account.payouts_enabled });

    if (isComplete) {
      // Update profile if not already marked as complete
      if (!profile?.stripe_onboarding_complete) {
        await supabaseClient
          .from("profiles")
          .update({ stripe_onboarding_complete: true })
          .eq("id", user.id);
        logStep("Updated profile as onboarding complete");
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

    // Generate onboarding link using validated origin
    const origin = req.headers.get("origin") || "https://lynxxclub.com";
    logStep("Generating onboarding link", { origin });
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard?stripe_refresh=true`,
      return_url: `${origin}/dashboard?stripe_success=true`,
      type: "account_onboarding",
    });

    logStep("Onboarding link generated successfully");

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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR in stripe-connect-onboard", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }, status: 400 }
    );
  }
});
