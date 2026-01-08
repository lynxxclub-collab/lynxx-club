import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";
import { verifyAuth } from "../_shared/auth.ts";

const CREDIT_PACKAGES = {
  starter: { credits: 500, price: 5000, name: "Starter Pack" },
  popular: { credits: 1200, price: 10000, name: "Popular Pack" },
  premium: { credits: 3000, price: 20000, name: "Premium Pack" },
} as const;

function validatePackageId(value: unknown): keyof typeof CREDIT_PACKAGES {
  if (typeof value !== "string" || !(value in CREDIT_PACKAGES)) {
    throw new Error(`Invalid package. Must be one of: ${Object.keys(CREDIT_PACKAGES).join(", ")}`);
  }
  return value as keyof typeof CREDIT_PACKAGES;
}

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) console.error(`[CREATE-PAYMENT-INTENT] Missing env var: ${name}`);
  return v;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = getEnv("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Payment system not configured");
    }

    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) throw new Error("Invalid user session");
    if (!user.email) throw new Error("User email not available");

    const body = await req.json();
    const packageId = validatePackageId(body.packageId);
    
    const selectedPackage = CREDIT_PACKAGES[packageId];
    
    console.log(`[CREATE-PAYMENT-INTENT] Creating payment intent`, { userId: user.id, packageId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: selectedPackage.price,
      currency: "usd",
      customer: customerId,
      metadata: {
        user_id: user.id,
        credits: String(selectedPackage.credits),
        package_id: packageId,
      },
      automatic_payment_methods: { enabled: true },
    });

    console.log(`[CREATE-PAYMENT-INTENT] Payment intent created`, { paymentIntentId: paymentIntent.id });

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        packageName: selectedPackage.name,
        credits: selectedPackage.credits,
        amount: selectedPackage.price / 100,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error creating payment intent:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
