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

async function checkRoomExists(dailyApiKey: string, roomName: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CREATE-DAILY-ROOM] Function invoked");
    
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    if (!dailyApiKey) {
      console.error("[CREATE-DAILY-ROOM] DAILY_API_KEY is not configured");
      throw new Error('DAILY_API_KEY is not configured');
    }
    console.log("[CREATE-DAILY-ROOM] DAILY_API_KEY is configured");

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
    const regenerateTokens = body.regenerateTokens === true;
    const callType = body.callType || 'video'; // Default to video

    console.log(`[CREATE-DAILY-ROOM] Processing video date: ${videoDateId}, callType: ${callType}, regenerateTokens: ${regenerateTokens}, userId: ${user.id}`);

    // Verify the video date exists and belongs to the user
    const { data: videoDate, error: fetchError } = await supabase
      .from('video_dates')
      .select('*')
      .eq('id', videoDateId)
      .single();

    if (fetchError || !videoDate) {
      console.error("[CREATE-DAILY-ROOM] Video date not found:", fetchError);
      throw new Error('Video date not found');
    }

    console.log(`[CREATE-DAILY-ROOM] Video date found: status=${videoDate.status}, has_room=${!!videoDate.daily_room_url}`);

    if (videoDate.seeker_id !== user.id && videoDate.earner_id !== user.id) {
      console.error("[CREATE-DAILY-ROOM] User not authorized:", { userId: user.id, seekerId: videoDate.seeker_id, earnerId: videoDate.earner_id });
      throw new Error('Unauthorized to access this video date');
    }

    const roomName = `lynxx-${videoDateId.slice(0, 8)}`;
    // Extend token expiration to 48 hours to handle timezone differences
    const expirationTime = Math.floor(Date.now() / 1000) + (48 * 60 * 60);

    // Check if room already exists and tokens are present
    const hasTokens = videoDate.seeker_meeting_token && videoDate.earner_meeting_token;
    const hasRoom = videoDate.daily_room_url;

    console.log(`[CREATE-DAILY-ROOM] Room status: hasRoom=${hasRoom}, hasTokens=${hasTokens}`);

    // Case 1: Room and tokens exist, not requesting regeneration
    // Case 1: Room and tokens exist, not requesting regeneration
    if (hasRoom && hasTokens && !regenerateTokens) {
      console.log('[CREATE-DAILY-ROOM] Room and tokens already exist, returning existing data');
      return new Response(
        JSON.stringify({ 
          success: true, 
          roomUrl: videoDate.daily_room_url,
          roomName: roomName,
          tokensRegenerated: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Case 2: Room exists but tokens are missing - regenerate tokens only
    if (hasRoom && !hasTokens) {
      console.log('Room exists but tokens missing, regenerating tokens...');
      
      // Verify room still exists on Daily.co
      const roomExists = await checkRoomExists(dailyApiKey, roomName);
      if (!roomExists) {
        console.log('Room no longer exists on Daily.co, will create new one');
      } else {
        // Generate new tokens for existing room
        console.log('Generating new tokens for existing room...');
        const [seekerToken, earnerToken] = await Promise.all([
          generateMeetingToken(dailyApiKey, roomName, videoDate.seeker_id, expirationTime),
          generateMeetingToken(dailyApiKey, roomName, videoDate.earner_id, expirationTime)
        ]);

        // Update video date with new tokens
        const { error: updateError } = await supabase
          .from('video_dates')
          .update({ 
            seeker_meeting_token: seekerToken,
            earner_meeting_token: earnerToken
          })
          .eq('id', videoDateId);

        if (updateError) {
          console.error('Failed to update tokens:', updateError);
          throw new Error('Failed to save new tokens');
        }

        console.log('Tokens regenerated successfully');
        return new Response(
          JSON.stringify({ 
            success: true, 
            roomUrl: videoDate.daily_room_url,
            roomName: roomName,
            tokensRegenerated: true
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
    }

    // Case 3: Force regenerate tokens
    if (regenerateTokens && hasRoom) {
      console.log('Force regenerating tokens for existing room...');
      
      const roomExists = await checkRoomExists(dailyApiKey, roomName);
      if (roomExists) {
        const [seekerToken, earnerToken] = await Promise.all([
          generateMeetingToken(dailyApiKey, roomName, videoDate.seeker_id, expirationTime),
          generateMeetingToken(dailyApiKey, roomName, videoDate.earner_id, expirationTime)
        ]);

        const { error: updateError } = await supabase
          .from('video_dates')
          .update({ 
            seeker_meeting_token: seekerToken,
            earner_meeting_token: earnerToken
          })
          .eq('id', videoDateId);

        if (updateError) {
          throw new Error('Failed to save new tokens');
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            roomUrl: videoDate.daily_room_url,
            roomName: roomName,
            tokensRegenerated: true
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
    }

    // Case 4: Create new room (no room exists or room was deleted)
    console.log('[CREATE-DAILY-ROOM] Creating new Daily.co room...');

    // Extend room expiration to 48 hours for timezone handling
    const roomExpirationTime = Math.floor(Date.now() / 1000) + (48 * 60 * 60);

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
          start_video_off: callType === 'audio', // Disable video for audio-only calls
          enable_recording: 'cloud',
          exp: roomExpirationTime
        }
      })
    });

    if (!dailyResponse.ok) {
      const errorData = await dailyResponse.text();
      console.error('[CREATE-DAILY-ROOM] Daily.co API error:', dailyResponse.status, errorData);
      throw new Error(`Failed to create Daily.co room: ${dailyResponse.status}`);
    }

    const room = await dailyResponse.json();
    console.log('[CREATE-DAILY-ROOM] Daily.co room created:', room.url);

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
        roomName: room.name,
        tokensRegenerated: false
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
