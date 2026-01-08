diff --git a/functions/create-checkout-session/index.ts b/functions/create-checkout-session/index.ts
--- a/functions/create-checkout-session/index.ts
+++ b/functions/create-checkout-session/index.ts
@@ -1,8 +1,8 @@
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import Stripe from "https://esm.sh/stripe@18.5.0";
-import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 import { getCorsHeaders } from "../_shared/cors.ts";
 import { createAutoErrorResponse } from "../_shared/errors.ts";
+import { verifyAuth } from "../_shared/auth.ts";
 
 const logStep = (step: string, details?: any) => {
   const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
   console.log(`[CREATE-CHECKOUT-SESSION] ${step}${detailsStr}`);
 };
 
 serve(async (req) => {
   const corsHeaders = getCorsHeaders(req);
+  const REDIRECT_BASE = "https://lynxxclub.com";
   
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
-
-  const supabaseClient = createClient(
-    Deno.env.get("SUPABASE_URL") ?? "",
-    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
-  );
 
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
+    const { user, error: authError, supabase } = await verifyAuth(req);
+    if (authError || !user) throw new Error(authError || "Unauthorized");
+    if (!user.email) throw new Error("User not authenticated or email not available");
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
@@ -49,7 +49,9 @@
     if (packError) throw new Error(`Error fetching pack: ${packError.message}`);
     if (!pack) throw new Error("Credit pack not found or inactive");
-    logStep("Credit pack found", { pack });
+    if (!pack.stripe_price_id) throw new Error("Credit pack misconfigured (missing stripe_price_id)");
+    logStep("Credit pack found", { packId: pack.id, credits: pack.credits });
 
     // Initialize Stripe
     const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
       apiVersion: "2025-08-27.basil",
     });
@@ -68,7 +70,7 @@
     }
 
     // Create checkout session
-    const origin = req.headers.get("origin") || "https://lynxxclub.com";
+    const origin = REDIRECT_BASE;
     const session = await stripe.checkout.sessions.create({
       customer: customerId,
       customer_email: customerId ? undefined : user.email,
