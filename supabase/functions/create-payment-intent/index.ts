diff --git a/functions/create-payment-intent/index.ts b/functions/create-payment-intent/index.ts
--- a/functions/create-payment-intent/index.ts
+++ b/functions/create-payment-intent/index.ts
@@ -1,8 +1,8 @@
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import Stripe from "https://esm.sh/stripe@14.21.0";
-import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
 import { getCorsHeaders } from "../_shared/cors.ts";
 import { createAutoErrorResponse } from "../_shared/errors.ts";
+import { verifyAuth } from "../_shared/auth.ts";
 
 const CREDIT_PACKAGES = {
   starter: { credits: 500, price: 5000, name: "Starter Pack" },
@@ -23,6 +23,12 @@
   }
   return value as keyof typeof CREDIT_PACKAGES;
 }
 
+function getEnv(name: string) {
+  const v = Deno.env.get(name);
+  if (!v) console.error(`[CREATE-PAYMENT-INTENT] Missing env var: ${name}`);
+  return v;
+}
+
 serve(async (req) => {
   const corsHeaders = getCorsHeaders(req);
   
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
-    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
+    const stripeKey = getEnv("STRIPE_SECRET_KEY");
     if (!stripeKey) {
       console.error("Stripe secret key not configured");
       throw new Error("Payment system not configured");
     }
 
-    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
-    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
-    
-    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
-
-    // Get user from auth header
-    const authHeader = req.headers.get("Authorization");
-    if (!authHeader) {
-      throw new Error("No authorization header");
-    }
-
-    const token = authHeader.replace("Bearer ", "");
-    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
-    
-    if (authError || !user) {
-      console.error("Auth error:", authError);
-      throw new Error("Invalid user session");
-    }
+    // Centralized auth (no service role needed here)
+    const { user, error: authError } = await verifyAuth(req);
+    if (authError || !user) throw new Error("Invalid user session");
+    if (!user.email) throw new Error("User email not available");
 
     // Parse and validate input
     const body = await req.json();
     const packageId = validatePackageId(body.packageId);
     
     const selectedPackage = CREDIT_PACKAGES[packageId];
     
-    console.log(`Creating payment intent for user ${user.id}, package: ${packageId}`);
+    console.log(`[CREATE-PAYMENT-INTENT] Creating payment intent`, { userId: user.id, packageId });
 
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
@@ -88,7 +94,7 @@
         enabled: true,
       },
     });
 
-    console.log(`Payment intent created: ${paymentIntent.id}`);
+    console.log(`[CREATE-PAYMENT-INTENT] Payment intent created`, { paymentIntentId: paymentIntent.id });
 
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
