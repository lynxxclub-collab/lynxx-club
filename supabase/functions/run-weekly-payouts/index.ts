import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Fixed minimum payout - NO EXCEPTIONS
const PAYOUT_MINIMUM_USD = 25.00;
const MAX_RETRY_COUNT = 3;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RUN-WEEKLY-PAYOUTS] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Cron-only. Never use "Bearer service_role_key" patterns for launch.
  const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
  const cronSecret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || cronSecret !== CRON_SECRET) {
    logStep("Forbidden: missing/invalid x-cron-secret");
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // TEMP DISABLED FOR LAUNCH:
  // Automated payouts are high-risk and can strand/duplicate funds under retries or partial failures.
  logStep("DISABLED for launch");
  return new Response(JSON.stringify({ success: true, disabled: true, processed: 0 }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
