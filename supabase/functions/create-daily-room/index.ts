import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { videoDateId, onAcceptance } = await req.json();

    if (!videoDateId) {
      throw new Error("Missing videoDateId");
    }

    // Fetch the video date
    const { data: videoDate, error: vdError } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .single();

    if (vdError || !videoDate) {
      throw new Error("Video date not found");
    }

    // Only earner can create room (on acceptance)
    if (onAcceptance && user.id !== videoDate.earner_id) {
      throw new Error("Only the earner can create the room upon acceptance");
    }

    // If room already exists, return it
    if (videoDate.daily_room_url && videoDate.seeker_meeting_token && videoDate.earner_meeting_token) {
      return new Response(
        JSON.stringify({
          success: true,
          roomUrl: videoDate.daily_room_url,
          message: "Room already exists",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate room expiry (scheduled end time + 10 min buffer)
    const scheduledEnd = new Date(videoDate.scheduled_end_at);
    const roomExpiry = Math.floor((scheduledEnd.getTime() + 10 * 60 * 1000) / 1000);

    // Create Daily room
    const roomName = `video-date-${videoDateId}-${Date.now()}`;
    
    const roomResponse = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          exp: roomExpiry,
          max_participants: 2,
          enable_screenshare: false,
          enable_chat: true,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
          eject_at_room_exp: true, // Auto-kick at expiry!
        },
      }),
    });

    if (!roomResponse.ok) {
      const error = await roomResponse.text();
      throw new Error(`Daily API error: ${error}`);
    }

    const room = await roomResponse.json();

    // Create meeting tokens for both participants
    const tokenExpiry = roomExpiry;

    // Seeker token
    const seekerTokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          exp: tokenExpiry,
          user_id: videoDate.seeker_id,
          is_owner: false,
        },
      }),
    });

    if (!seekerTokenResponse.ok) {
      throw new Error("Failed to create seeker token");
    }

    const seekerToken = await seekerTokenResponse.json();

    // Earner token
    const earnerTokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          exp: tokenExpiry,
          user_id: videoDate.earner_id,
          is_owner: false,
        },
      }),
    });

    if (!earnerTokenResponse.ok) {
      throw new Error("Failed to create earner token");
    }

    const earnerToken = await earnerTokenResponse.json();

    // Update the video date with room info
    const { error: updateError } = await supabase
      .from("video_dates")
      .update({
        daily_room_url: room.url,
        daily_room_name: roomName,
        seeker_meeting_token: seekerToken.token,
        earner_meeting_token: earnerToken.token,
        status: "confirmed",
      })
      .eq("id", videoDateId);

    if (updateError) {
      throw new Error(`Failed to update video date: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        roomUrl: room.url,
        roomName: roomName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
