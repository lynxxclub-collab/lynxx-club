import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

const CREDIT_PACKAGES = {
  starter: { credits: 500, price: 5000, name: "Starter Pack" },
  popular: { credits: 1100, price: 10000, name: "Popular Pack" },
  premium: { credits: 2400, price: 20000, name: "Premium Pack" },
  vip: { credits: 6500, price: 50000, name: "VIP Pack" },
} as const;

const VALID_PACKAGE_IDS = Object.keys(CREDIT_PACKAGES);

// Input validation
function validatePackageId(value: unknown): keyof typeof CREDIT_PACKAGES {
  if (typeof value !== 'string') {
    throw new Error("Package ID must be a string");
  }
  if (!VALID_PACKAGE_IDS.includes(value)) {
    throw new Error(`Invalid package. Must be one of: ${VALID_PACKAGE_IDS.join(', ')}`);
  }
  return value as keyof typeof CREDIT_PACKAGES;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("Stripe secret key not configured");
      throw new Error("Payment system not configured");
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
      console.error("Auth error:", authError);
      throw new Error("Invalid user session");
    }

    // Parse and validate input
    const body = await req.json();
    const packageId = validatePackageId(body.packageId);
    
    const selectedPackage = CREDIT_PACKAGES[packageId];
    
    console.log(`Creating payment intent for user ${user.id}, package: ${packageId}`);

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: selectedPackage.price,
      currency: "usd",
      customer: customerId,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        credits: selectedPackage.credits.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(`Payment intent created: ${paymentIntent.id}`);

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        packageName: selectedPackage.name,
        credits: selectedPackage.credits,
        amount: selectedPackage.price / 100,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error creating payment intent:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
