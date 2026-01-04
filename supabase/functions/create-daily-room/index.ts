import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
const DAILY_API_URL = "https://api.daily.co/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateRoomRequest {
  videoDateId: string;
  callType: "video" | "audio";
  waitingRoom?: boolean;
  autoStart?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { videoDateId, callType = "video", waitingRoom = true, autoStart = false }: CreateRoomRequest = await req.json();

    if (!videoDateId) {
      throw new Error("videoDateId is required");
    }

    // Verify the video date exists and user has access
    const { data: videoDate, error: videoDateError } = await supabaseClient
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .single();

    if (videoDateError || !videoDate) {
      throw new Error("Video date not found");
    }

    // Verify user is either the seeker or earner
    if (videoDate.seeker_id !== user.id && videoDate.earner_id !== user.id) {
      throw new Error("Unauthorized access to this video date");
    }

    if (!DAILY_API_KEY) {
      throw new Error("Daily API key not configured");
    }

    // Generate unique room name
    const roomName = `video-date-${videoDateId}`;
    const expiryTime = new Date(videoDate.scheduled_start);
    expiryTime.setHours(expiryTime.getHours() + 2); // Room expires 2 hours after scheduled start

    // Create Daily.co room with proper configuration
    const roomConfig = {
      name: roomName,
      privacy: "private",
      properties: {
        // Waiting room configuration - both parties can join but call doesn't start until ready
        enable_knocking: true,
        enable_screenshare: callType === "video",
        enable_chat: true,
        start_video_off: false,
        start_audio_off: false,
        owner_only_broadcast: false,
        enable_recording: "cloud", // Enable cloud recording for quality assurance
        // Expiry settings
        exp: Math.floor(expiryTime.getTime() / 1000),
        // Advanced settings for better connection
        enable_prejoin_ui: true, // Allow users to test audio/video before joining
        enable_network_ui: true, // Show network quality indicators
        enable_noise_cancellation_ui: callType === "audio", // Extra useful for audio calls
        // Ensure both parties can join
        max_participants: 2,
        // Auto-join settings
        autojoin: false, // Don't auto-join, let users click to join
      },
    };

    console.log("Creating Daily.co room with config:", JSON.stringify(roomConfig, null, 2));

    const dailyResponse = await fetch(`${DAILY_API_URL}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify(roomConfig),
    });

    if (!dailyResponse.ok) {
      const errorText = await dailyResponse.text();
      console.error("Daily.co API error:", errorText);
      throw new Error(`Failed to create Daily.co room: ${errorText}`);
    }

    const room = await dailyResponse.json();
    console.log("Daily.co room created successfully:", room.url);

    // Generate meeting tokens for both participants
    const seekerToken = await createMeetingToken(room.name, videoDate.seeker_id, "seeker");
    const earnerToken = await createMeetingToken(room.name, videoDate.earner_id, "earner");

    // Update video_dates record with room information
    const { error: updateError } = await supabaseClient
      .from("video_dates")
      .update({
        room_url: room.url,
        room_name: room.name,
        seeker_token: seekerToken,
        earner_token: earnerToken,
      })
      .eq("id", videoDateId);

    if (updateError) {
      console.error("Failed to update video_dates with room info:", updateError);
      // Don't throw - room is created, just log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        roomUrl: room.url,
        roomName: room.name,
        seekerToken,
        earnerToken,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-daily-room function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

// Helper function to create meeting tokens for participants
async function createMeetingToken(
  roomName: string,
  userId: string,
  role: "seeker" | "earner"
): Promise<string> {
  const tokenConfig = {
    properties: {
      room_name: roomName,
      user_id: userId,
      user_name: role,
      enable_screenshare: true,
      start_video_off: false,
      start_audio_off: false,
      // Token expires in 24 hours
      exp: Math.floor(Date.now() / 1000) + 86400,
    },
  };

  const tokenResponse = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify(tokenConfig),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Failed to create meeting token:", errorText);
    throw new Error(`Failed to create meeting token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.token;
}
