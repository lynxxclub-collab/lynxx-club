import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-PAYOUT-SCHEDULE] ${step}${detailsStr}`);
};

// Weekly Friday payout schedule with 2-day delay
const PAYOUT_SCHEDULE = {
  interval: "weekly" as const,
  weekly_anchor: "friday" as const,
  delay_days: 2,
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const isAdmin = roles?.some(r => r.role === "admin");
    
    const body = await req.json();
    const { accountId, updateAll } = body;

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // If updating all accounts (admin only)
    if (updateAll && isAdmin) {
      logStep("Updating payout schedule for all connected accounts");
      
      const { data: profiles, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, stripe_account_id")
        .not("stripe_account_id", "is", null);

      if (profilesError) {
        throw new Error("Failed to fetch profiles");
      }

      const results = {
        updated: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const profile of profiles || []) {
        if (!profile.stripe_account_id) continue;
        
        try {
          await stripe.accounts.update(profile.stripe_account_id, {
            settings: {
              payouts: {
                schedule: PAYOUT_SCHEDULE,
              },
            },
          });
          results.updated++;
          logStep("Updated account", { accountId: profile.stripe_account_id });
        } catch (err) {
          results.failed++;
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          results.errors.push(`${profile.stripe_account_id}: ${errorMsg}`);
          logStep("Failed to update account", { accountId: profile.stripe_account_id, error: errorMsg });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update single account
    let targetAccountId = accountId;

    // If no account ID provided, use the current user's account
    if (!targetAccountId) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", user.id)
        .single();

      targetAccountId = profile?.stripe_account_id;
    }

    if (!targetAccountId) {
      throw new Error("No Stripe account found");
    }

    // Verify user owns this account or is admin
    if (!isAdmin) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", user.id)
        .single();

      if (profile?.stripe_account_id !== targetAccountId) {
        throw new Error("Unauthorized");
      }
    }

    logStep("Updating payout schedule", { accountId: targetAccountId });

    await stripe.accounts.update(targetAccountId, {
      settings: {
        payouts: {
          schedule: PAYOUT_SCHEDULE,
        },
      },
    });

    logStep("Payout schedule updated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        accountId: targetAccountId,
        schedule: PAYOUT_SCHEDULE,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    logStep("ERROR", { message: error instanceof Error ? error.message : "Unknown" });
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
