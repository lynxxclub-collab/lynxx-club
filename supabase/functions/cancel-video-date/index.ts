import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
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

    const { videoDateId } = await req.json();

    if (!videoDateId) {
      throw new Error('videoDateId is required');
    }

    console.log(`Cancelling video date: ${videoDateId}`);

    // Get the video date
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
      throw new Error('Unauthorized to cancel this video date');
    }

    // Can't cancel if already cancelled or completed
    if (videoDate.status !== 'scheduled' && videoDate.status !== 'pending') {
      throw new Error('Cannot cancel this video date');
    }

    // Delete Daily.co room if exists
    if (videoDate.daily_room_url && dailyApiKey) {
      const roomName = videoDate.daily_room_url.split('/').pop();
      if (roomName) {
        try {
          await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${dailyApiKey}`,
            }
          });
          console.log('Daily.co room deleted:', roomName);
        } catch (e) {
          console.warn('Failed to delete Daily.co room:', e);
        }
      }
    }

    // Update video date status
    const { error: updateError } = await supabase
      .from('video_dates')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', videoDateId);

    if (updateError) {
      throw new Error('Failed to update video date status');
    }

    // Refund credits to seeker (if applicable)
    // Note: In a real app, you'd check if credits were actually deducted
    // For now, since we only reserve credits, we just mark as cancelled
    console.log(`Video date ${videoDateId} cancelled successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Video date cancelled successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error cancelling video date:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
