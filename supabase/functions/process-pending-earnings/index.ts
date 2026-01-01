import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-PENDING-EARNINGS] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Processing pending earnings - moving to available after 48-hour hold");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Call the database function to process pending earnings
    const { data, error } = await supabaseClient.rpc("process_pending_earnings");

    if (error) {
      logStep("ERROR: Failed to process pending earnings", { error: error.message });
      throw new Error(`Failed to process pending earnings: ${error.message}`);
    }

    const processedCount = data || 0;
    logStep(`Processed ${processedCount} gift transactions from pending to available`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        message: `Moved earnings from ${processedCount} transactions to available balance`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR: Process pending earnings failed", { error: errorMessage });
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
