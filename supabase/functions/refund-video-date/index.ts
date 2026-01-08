import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // TEMP DISABLED FOR LAUNCH:
  // This endpoint had no auth and attempted to mutate credits via service role using incorrect logic.
  // Use cancel-video-date (and credit reservation refund flow) instead.
  console.log("[REFUND-VIDEO-DATE] DISABLED for launch");
  return new Response(
    JSON.stringify({
      success: false,
      error: "Temporarily disabled for launch stability",
      code: "disabled_for_launch",
    }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
