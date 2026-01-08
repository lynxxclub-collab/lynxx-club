diff --git a/functions/process-message-refunds/index.ts b/functions/process-message-refunds/index.ts
--- a/functions/process-message-refunds/index.ts
+++ b/functions/process-message-refunds/index.ts
@@ -1,17 +1,45 @@
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 import { getCorsHeaders } from "../_shared/cors.ts";
 
 const logStep = (step: string, details?: Record<string, unknown>) => {
   const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
   console.log(`[PROCESS-MESSAGE-REFUNDS] ${step}${detailsStr}`);
 };
 
 serve(async (req) => {
   const corsHeaders = getCorsHeaders(req);
 
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
-  // Verify authentication - only allow service role or admin access
-  const authHeader = req.headers.get("Authorization");
-  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
-  
-  if (!authHeader || !expectedKey || authHeader !== `Bearer ${expectedKey}`) {
-    logStep("Unauthorized access attempt blocked");
-    return new Response(
-      JSON.stringify({ error: "Unauthorized - admin access required" }),
-      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
-    );
-  }
+  // Cron-only: never expose service-role-key-as-bearer patterns for launch stability.
+  const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
+  const cronSecret = req.headers.get("x-cron-secret");
+  if (!CRON_SECRET || cronSecret !== CRON_SECRET) {
+    logStep("Forbidden: missing/invalid x-cron-secret");
+    return new Response(JSON.stringify({ error: "forbidden" }), {
+      status: 403,
+      headers: { ...corsHeaders, "Content-Type": "application/json" },
+    });
+  }
+
+  if (req.method !== "POST") {
+    return new Response(JSON.stringify({ error: "Method not allowed" }), {
+      status: 405,
+      headers: { ...corsHeaders, "Content-Type": "application/json" },
+    });
+  }
+
+  // TEMP DISABLED FOR LAUNCH:
+  // This job mutates credits/earnings via non-atomic updates and can double-refund under retries/concurrency.
+  logStep("DISABLED for launch");
+  return new Response(JSON.stringify({ success: true, disabled: true, processed: 0 }), {
+    status: 200,
+    headers: { ...corsHeaders, "Content-Type": "application/json" },
+  });
 
   try {
     logStep("Starting process-message-refunds");
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL");
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
