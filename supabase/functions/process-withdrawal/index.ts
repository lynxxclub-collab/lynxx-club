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
    allowedOrigin = origin; // Allow during development
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || 'https://lynxxclub.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Input validation
function validateAmount(value: unknown): number {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    throw new Error("Amount must be a valid number");
  }
  if (value < 20) {
    throw new Error("Minimum withdrawal is $20");
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

    // Parse and validate input
    const body = await req.json();
    const amount = validateAmount(body.amount);

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("earnings_balance, stripe_account_id, stripe_onboarding_complete")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    if (!profile.stripe_account_id || !profile.stripe_onboarding_complete) {
      throw new Error("Please complete bank account setup first");
    }

    if (profile.earnings_balance < amount) {
      throw new Error(`Insufficient balance. Available: $${profile.earnings_balance.toFixed(2)}`);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    console.log(`Processing withdrawal of $${amount} for user ${user.id}`);

    // Create transfer to connected account
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      destination: profile.stripe_account_id,
      metadata: {
        user_id: user.id,
        withdrawal_type: "earner_payout",
      },
    });

    // Deduct from earnings balance
    const newBalance = profile.earnings_balance - amount;
    await supabaseClient
      .from("profiles")
      .update({ earnings_balance: newBalance })
      .eq("id", user.id);

    // Create withdrawal record
    await supabaseClient
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount: amount,
        status: "processing",
        stripe_transfer_id: transfer.id,
      });

    // Create transaction record
    await supabaseClient
      .from("transactions")
      .insert({
        user_id: user.id,
        transaction_type: "earning",
        credits_amount: 0,
        usd_amount: -amount,
        status: "completed",
        description: `Withdrawal of $${amount.toFixed(2)}`,
      });

    console.log(`Withdrawal successful. Transfer ID: ${transfer.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        transferId: transfer.id,
        newBalance,
        message: "Withdrawal initiated! Funds will arrive in 2-3 business days."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error processing withdrawal:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }, status: 400 }
    );
  }
});
