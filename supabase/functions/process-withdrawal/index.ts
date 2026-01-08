import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

// Fixed minimum payout - NO EXCEPTIONS
const PAYOUT_MINIMUM_USD = 25.00;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-WITHDRAWAL] ${step}${detailsStr}`);
};

// Input validation
function validateAmount(value: unknown): number {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    throw new Error("Amount must be a valid number");
  }
  if (value < PAYOUT_MINIMUM_USD) {
    throw new Error(`Minimum withdrawal is $${PAYOUT_MINIMUM_USD}. No exceptions.`);
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

  // TEMP DISABLED FOR LAUNCH:
  // Automated withdrawals are high-risk and can strand creator balances if transfers fail.
  logStep("Withdrawals DISABLED for launch");
  return new Response(
    JSON.stringify({
      success: false,
      error: "Withdrawals are temporarily disabled. Please contact support for manual payout.",
      code: "withdrawals_disabled",
    }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
