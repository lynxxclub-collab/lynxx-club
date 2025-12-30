import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    if (!dailyApiKey) {
      throw new Error('DAILY_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { action, videoDateId, consent } = body;
    
    const validatedVideoDateId = validateUUID(videoDateId, 'videoDateId');

    // Fetch video date
    const { data: videoDate, error: fetchError } = await supabase
      .from('video_dates')
      .select('*')
      .eq('id', validatedVideoDateId)
      .single();

    if (fetchError || !videoDate) {
      throw new Error('Video date not found');
    }

    // Verify user is part of the video date
    const isSeeker = videoDate.seeker_id === user.id;
    const isEarner = videoDate.earner_id === user.id;
    
    if (!isSeeker && !isEarner) {
      throw new Error('Unauthorized to access this video date');
    }

    const roomName = `lynxx-${validatedVideoDateId.slice(0, 8)}`;

    switch (action) {
      case 'consent': {
        // Update consent for this user
        const updateData = isSeeker
          ? { recording_consent_seeker: consent === true }
          : { recording_consent_earner: consent === true };

        const { error: updateError } = await supabase
          .from('video_dates')
          .update(updateData)
          .eq('id', validatedVideoDateId);

        if (updateError) {
          throw new Error('Failed to update consent');
        }

        // Fetch updated video date to check if both consented
        const { data: updatedVideoDate } = await supabase
          .from('video_dates')
          .select('recording_consent_seeker, recording_consent_earner')
          .eq('id', validatedVideoDateId)
          .single();

        const bothConsented = 
          updatedVideoDate?.recording_consent_seeker === true && 
          updatedVideoDate?.recording_consent_earner === true;

        console.log(`Consent updated for ${isSeeker ? 'seeker' : 'earner'}: ${consent}, both consented: ${bothConsented}`);

        return new Response(
          JSON.stringify({
            success: true,
            bothConsented,
            seekerConsent: updatedVideoDate?.recording_consent_seeker,
            earnerConsent: updatedVideoDate?.recording_consent_earner,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'start': {
        // Verify both have consented
        if (!videoDate.recording_consent_seeker || !videoDate.recording_consent_earner) {
          throw new Error('Both participants must consent to recording');
        }

        // Start recording via Daily.co API
        console.log(`Starting recording for room: ${roomName}`);
        
        const recordResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}/recordings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${dailyApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!recordResponse.ok) {
          const errorText = await recordResponse.text();
          console.error('Daily.co recording start error:', errorText);
          throw new Error('Failed to start recording');
        }

        const recordingData = await recordResponse.json();
        console.log('Recording started:', recordingData);

        // Update video date with recording info
        const { error: updateError } = await supabase
          .from('video_dates')
          .update({
            recording_id: recordingData.id || recordingData.recording_id,
            recording_started_at: new Date().toISOString(),
          })
          .eq('id', validatedVideoDateId);

        if (updateError) {
          console.error('Failed to save recording info:', updateError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            recordingId: recordingData.id || recordingData.recording_id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'stop': {
        if (!videoDate.recording_id) {
          throw new Error('No active recording found');
        }

        // Stop recording via Daily.co API
        console.log(`Stopping recording: ${videoDate.recording_id}`);

        const stopResponse = await fetch(
          `https://api.daily.co/v1/recordings/${videoDate.recording_id}/stop`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${dailyApiKey}`,
            },
          }
        );

        if (!stopResponse.ok) {
          const errorText = await stopResponse.text();
          console.error('Daily.co recording stop error:', errorText);
          // Don't throw - recording may have already stopped
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('Error managing recording:', error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
