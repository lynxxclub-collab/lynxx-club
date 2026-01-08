diff --git a/functions/create-checkout-session/index.ts b/functions/create-checkout-session/index.ts
--- a/functions/create-checkout-session/index.ts
+++ b/functions/create-checkout-session/index.ts
@@ -1,10 +1,10 @@
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import Stripe from "https://esm.sh/stripe@18.5.0";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 import { getCorsHeaders } from "../_shared/cors.ts";
 import { createAutoErrorResponse } from "../_shared/errors.ts";
+import { verifyAuth } from "../_shared/auth.ts";
 
 const logStep = (step: string, details?: any) => {
   const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
   console.log(`[CREATE-CHECKOUT-SESSION] ${step}${detailsStr}`);
@@ -12,6 +12,11 @@
 
 serve(async (req) => {
   const corsHeaders = getCorsHeaders(req);
+
+  // Force a known-good redirect base. Do NOT trust client-controlled Origin for payment redirects.
+  // (You already default to this; making it deterministic reduces risk.)
+  const REDIRECT_BASE = "https://lynxxclub.com";
   
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
@@ -19,54 +24,34 @@
   const supabaseClient = createClient(
     Deno.env.get("SUPABASE_URL") ?? "",
     Deno.env.get("SUPABASE_ANON_KEY") ?? ""
   );
 
   try {
     logStep("Function started");
 
-    // Authenticate user with detailed logging
-    const authHeader = req.headers.get("Authorization");
-    logStep("Auth header check", { 
-      hasAuthHeader: !!authHeader, 
-      headerPrefix: authHeader?.substring(0, 30) + "..." 
-    });
-    
-    if (!authHeader) {
-      throw new Error("No authorization header provided. Please ensure you are logged in.");
-    }
-
-    const token = authHeader.replace("Bearer ", "");
-    logStep("Token extracted", { tokenLength: token.length });
-    
-    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
-    
-    if (userError) {
-      logStep("Auth error details", { error: userError.message, code: userError.status });
-      throw new Error(`Authentication error: ${userError.message}`);
-    }
-    
-    const user = userData.user;
-    if (!user?.email) throw new Error("User not authenticated or email not available");
-    logStep("User authenticated", { userId: user.id, email: user.email });
+    // Centralized auth verification (single source of truth)
+    const { user, error: authError, supabase } = await verifyAuth(req);
+    if (authError || !user) {
+      logStep("Auth failed", { error: authError });
+      throw new Error(authError || "Authentication failed");
+    }
+    if (!user.email) throw new Error("User authenticated but email not available");
+    logStep("User authenticated", { userId: user.id });
 
     // Get pack ID from request body
     const { packId } = await req.json();
     if (!packId) throw new Error("packId is required");
     logStep("Pack ID received", { packId });
 
     // Look up the credit pack
-    const { data: pack, error: packError } = await supabaseClient
+    const { data: pack, error: packError } = await supabase
       .from("credit_packs")
       .select("*")
       .eq("id", packId)
       .eq("active", true)
       .maybeSingle();
@@ -74,26 +59,38 @@
     if (packError) throw new Error(`Error fetching pack: ${packError.message}`);
     if (!pack) throw new Error("Credit pack not found or inactive");
-    logStep("Credit pack found", { pack });
+    if (!pack.stripe_price_id) throw new Error("Credit pack is misconfigured (missing stripe_price_id)");
+    if (!pack.credits || pack.credits <= 0) throw new Error("Credit pack is misconfigured (invalid credits)");
+    logStep("Credit pack found", { packId: pack.id, credits: pack.credits });
 
     // Initialize Stripe
-    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
+    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") || "";
+    if (!stripeSecret) throw new Error("Stripe secret key not configured");
+    const stripe = new Stripe(stripeSecret, {
       apiVersion: "2025-08-27.basil",
     });
 
     // Check if customer exists
     const customers = await stripe.customers.list({ email: user.email, limit: 1 });
     let customerId: string | undefined;
     if (customers.data.length > 0) {
       customerId = customers.data[0].id;
       logStep("Existing Stripe customer found", { customerId });
     }
 
     // Create checkout session
-    const origin = req.headers.get("origin") || "https://lynxxclub.com";
+    const origin = REDIRECT_BASE;
     const session = await stripe.checkout.sessions.create({
       customer: customerId,
       customer_email: customerId ? undefined : user.email,
       line_items: [
         {
           price: pack.stripe_price_id,
           quantity: 1,
         },
       ],
       mode: "payment",
       success_url: `${origin}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
       cancel_url: `${origin}/credits?canceled=true`,
       metadata: {
         user_id: user.id,
         pack_id: pack.id,
         credits: pack.credits.toString(),
       },
     });
