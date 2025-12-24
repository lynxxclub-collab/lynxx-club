import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CREDIT_TO_USD = 0.10;
const PLATFORM_FEE_PCT = 0.30;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { videoDateId, actualEnd } = await req.json();

    if (!videoDateId) {
      throw new Error('videoDateId is required');
    }

    console.log(`Processing charge for video date: ${videoDateId}`);

    // Get video date details
    const { data: videoDate, error: fetchError } = await supabase
      .from('video_dates')
      .select('*')
      .eq('id', videoDateId)
      .single();

    if (fetchError || !videoDate) {
      throw new Error('Video date not found');
    }

    // Verify user is part of this video date
    if (videoDate.seeker_id !== user.id && videoDate.earner_id !== user.id) {
      throw new Error('Unauthorized to charge this video date');
    }

    // Check if already processed
    if (videoDate.status === 'completed' && videoDate.credits_charged) {
      console.log('Video date already charged, skipping');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Already processed',
          credits_charged: videoDate.credits_charged
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get actual times
    const actualStartTime = videoDate.actual_start 
      ? new Date(videoDate.actual_start).getTime() 
      : new Date(videoDate.scheduled_start).getTime();
    
    const actualEndTime = actualEnd 
      ? new Date(actualEnd).getTime() 
      : Date.now();

    // Calculate actual duration in seconds
    const actualSeconds = Math.floor((actualEndTime - actualStartTime) / 1000);
    
    // Convert to minutes (round up, minimum 1 minute)
    const actualMinutes = Math.max(1, Math.ceil(actualSeconds / 60));
    
    console.log(`Actual duration: ${actualMinutes} minutes (${actualSeconds} seconds)`);

    // Calculate credits to charge
    const scheduledMinutes = videoDate.scheduled_duration;
    const creditsPerMinute = videoDate.credits_reserved / scheduledMinutes;
    
    // Charge for actual time, up to scheduled maximum
    const minutesToCharge = Math.min(actualMinutes, scheduledMinutes);
    const creditsToCharge = Math.ceil(minutesToCharge * creditsPerMinute);
    
    console.log(`Charging ${creditsToCharge} credits for ${minutesToCharge} minutes`);

    // Calculate USD amounts with 70/30 split
    const usdAmount = creditsToCharge * CREDIT_TO_USD;
    const platformFee = usdAmount * PLATFORM_FEE_PCT;
    const earnerAmount = usdAmount - platformFee;
    
    // Round to 2 decimals
    const finalUsd = Number(usdAmount.toFixed(2));
    const finalPlatformFee = Number(platformFee.toFixed(2));
    const finalEarnerAmount = Number(earnerAmount.toFixed(2));

    console.log(`USD: $${finalUsd}, Platform fee: $${finalPlatformFee}, Earner: $${finalEarnerAmount}`);

    // Update actual_end before charging
    await supabase
      .from('video_dates')
      .update({ actual_end: new Date(actualEndTime).toISOString() })
      .eq('id', videoDateId);

    // Execute the transaction
    const { data: result, error: rpcError } = await supabase.rpc('charge_video_date_transaction', {
      p_video_date_id: videoDateId,
      p_seeker_id: videoDate.seeker_id,
      p_earner_id: videoDate.earner_id,
      p_credits_charged: creditsToCharge,
      p_earner_amount: finalEarnerAmount,
      p_platform_fee: finalPlatformFee,
      p_usd_amount: finalUsd
    });

    if (rpcError) {
      console.error('RPC error:', rpcError);
      throw new Error('Failed to process payment');
    }

    console.log('Charge result:', result);

    if (!result.success) {
      throw new Error(result.error || 'Transaction failed');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        credits_charged: creditsToCharge,
        earner_amount: finalEarnerAmount,
        minutes_charged: minutesToCharge
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error charging video date:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
