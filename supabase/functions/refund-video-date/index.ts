import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { videoDateId } = await req.json();

    if (!videoDateId) {
      throw new Error("Missing videoDateId");
    }

    // Fetch video date with transaction info
    const { data: videoDate, error: vdError } = await supabase
      .from("video_dates")
      .select("*, transaction_id")
      .eq("id", videoDateId)
      .single();

    if (vdError || !videoDate) {
      throw new Error("Video date not found");
    }

    // Check if already refunded
    if (videoDate.refunded) {
      return new Response(
        JSON.stringify({ success: true, message: "Already refunded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process refund logic here
    // This depends on your payment system (Stripe, etc.)
    // For credits-based system:
    if (videoDate.credits_amount) {
      const { error: creditError } = await supabase
        .from("profiles")
        .update({ 
          credits: supabase.rpc('increment_credits', { 
            amount: videoDate.credits_amount 
          }) 
        })
        .eq("id", videoDate.seeker_id);

      if (creditError) {
        console.error("Credit refund error:", creditError);
      }
    }

    // Mark as refunded
    await supabase
      .from("video_dates")
      .update({ 
        refunded: true, 
        refunded_at: new Date().toISOString(),
        status: "cancelled_no_show"
      })
      .eq("id", videoDateId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Refund error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
