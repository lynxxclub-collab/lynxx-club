import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";
import { verifyAuth } from "../_shared/auth.ts";

const REDIRECT_BASE = "https://lynxxclub.com";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT-SESSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { user, error: authError, supabase } = await verifyAuth(req);
    if (authError || !user) throw new Error(authError || "Unauthorized");
    if (!user.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    const { packId } = await req.json();
    if (!packId) throw new Error("packId is required");
    logStep("Pack ID received", { packId });

    const { data: pack, error: packError } = await supabase
      .from("credit_packs")
      .select("*")
      .eq("id", packId)
      .eq("active", true)
      .maybeSingle();

    if (packError) throw new Error(`Error fetching pack: ${packError.message}`);
    if (!pack) throw new Error("Credit pack not found or inactive");
    if (!pack.stripe_price_id) throw new Error("Credit pack misconfigured (missing stripe_price_id)");
    logStep("Credit pack found", { packId: pack.id, credits: pack.credits });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined = undefined;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    const totalCredits = pack.credits + (pack.bonus_credits || 0);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: pack.stripe_price_id, quantity: 1 }],
      mode: "payment",
      success_url: `${REDIRECT_BASE}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${REDIRECT_BASE}/dashboard`,
      metadata: {
        user_id: user.id,
        credits: String(totalCredits),
        pack_id: packId,
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating checkout session:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
