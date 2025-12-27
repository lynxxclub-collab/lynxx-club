import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

// Input validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

async function generateMeetingToken(
  dailyApiKey: string,
  roomName: string,
  userId: string,
  expirationTime: number
): Promise<string> {
  const tokenResponse = await fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${dailyApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        exp: expirationTime,
        is_owner: false
      }
    })
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    console.error('Daily.co token API error:', errorData);
    throw new Error(`Failed to generate meeting token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.token;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
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

    // Parse and validate input
    const body = await req.json();
    const videoDateId = validateUUID(body.videoDateId, 'videoDateId');

    console.log(`Creating Daily.co room for video date: ${videoDateId}`);

    // Verify the video date exists and belongs to the user
    const { data: videoDate, error: fetchError } = await supabase
      .from('video_dates')
      .select('*')
      .eq('id', videoDateId)
      .single();

    if (fetchError || !videoDate) {
      throw new Error('Video date not found');
    }

    if (videoDate.seeker_id !== user.id && videoDate.earner_id !== user.id) {
      throw new Error('Unauthorized to access this video date');
    }

    // Create Daily.co room
    const roomName = `lynxx-${videoDateId.slice(0, 8)}`;
    const expirationTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // Expires in 24 hours

    const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          max_participants: 2,
          enable_chat: false,
          enable_screenshare: false,
          start_audio_off: false,
          start_video_off: false,
          exp: expirationTime
        }
      })
    });

    if (!dailyResponse.ok) {
      const errorData = await dailyResponse.text();
      console.error('Daily.co API error:', errorData);
      throw new Error(`Failed to create Daily.co room: ${dailyResponse.status}`);
    }

    const room = await dailyResponse.json();
    console.log('Daily.co room created:', room.url);

    // Generate meeting tokens for both participants
    console.log('Generating meeting tokens...');
    const [seekerToken, earnerToken] = await Promise.all([
      generateMeetingToken(dailyApiKey, roomName, videoDate.seeker_id, expirationTime),
      generateMeetingToken(dailyApiKey, roomName, videoDate.earner_id, expirationTime)
    ]);
    console.log('Meeting tokens generated successfully');

    // Update video date with room URL and tokens
    const { error: updateError } = await supabase
      .from('video_dates')
      .update({ 
        daily_room_url: room.url,
        seeker_meeting_token: seekerToken,
        earner_meeting_token: earnerToken,
        status: 'scheduled'
      })
      .eq('id', videoDateId);

    if (updateError) {
      console.error('Failed to update video date:', updateError);
      throw new Error('Failed to save room URL and tokens');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        roomUrl: room.url,
        roomName: room.name
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('Error creating Daily.co room:', error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
