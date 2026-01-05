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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { videoDateId, callType = "video" }: CreateRoomRequest = await req.json();

    if (!videoDateId) {
      throw new Error("videoDateId is required");
    }

    // Fetch video date with correct column names
    const { data: videoDate, error: videoDateError } = await supabaseClient
      .from("video_dates")
      .select("id, seeker_id, earner_id, scheduled_start, daily_room_url, seeker_meeting_token, earner_meeting_token")
      .eq("id", videoDateId)
      .single();

    if (videoDateError || !videoDate) {
      console.error("Video date fetch error:", videoDateError);
      throw new Error("Video date not found");
    }

    // Verify user is either the seeker or earner
    if (videoDate.seeker_id !== user.id && videoDate.earner_id !== user.id) {
      throw new Error("Unauthorized access to this video date");
    }

    // Canonical room name based on videoDateId
    const canonicalRoomName = `video-date-${videoDateId}`;

    // Check if room already exists and has a shared token
    if (videoDate.daily_room_url && videoDate.seeker_meeting_token && videoDate.earner_meeting_token) {
      console.log("Room and tokens already exist, verifying with Daily.co...");
      
      try {
        const roomCheckResponse = await fetch(`${DAILY_API_URL}/rooms/${canonicalRoomName}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
          },
        });

        if (roomCheckResponse.ok) {
          console.log("Room verified in Daily.co, returning existing data");
          return new Response(
            JSON.stringify({
              success: true,
              roomUrl: videoDate.daily_room_url,
              roomName: canonicalRoomName,
              token: videoDate.seeker_meeting_token, // Same token for both
              seekerToken: videoDate.seeker_meeting_token,
              earnerToken: videoDate.earner_meeting_token,
              message: "Using existing room",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
        console.log("Room not found in Daily.co, will create new one");
      } catch (checkError) {
        const errMsg = checkError instanceof Error ? checkError.message : String(checkError);
        console.log("Error checking existing room:", errMsg);
      }
    }

    if (!DAILY_API_KEY) {
      throw new Error("Daily API key not configured");
    }

    // Calculate room expiry (2 hours after scheduled start)
    const expiryTime = new Date(videoDate.scheduled_start);
    expiryTime.setHours(expiryTime.getHours() + 2);

    // Check if room already exists in Daily.co
    let room;
    const existingRoomResponse = await fetch(`${DAILY_API_URL}/rooms/${canonicalRoomName}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (existingRoomResponse.ok) {
      room = await existingRoomResponse.json();
      console.log("Using existing Daily.co room:", room.url);
    } else {
      // Create new Daily.co room
      const roomConfig = {
        name: canonicalRoomName,
        privacy: "private",
        properties: {
          enable_knocking: false,
          enable_screenshare: callType === "video",
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
          owner_only_broadcast: false,
          enable_recording: "cloud",
          exp: Math.floor(expiryTime.getTime() / 1000),
          enable_prejoin_ui: false,
          enable_network_ui: true,
          enable_noise_cancellation_ui: callType === "audio",
          max_participants: 2,
          autojoin: true,
        },
      };

      console.log("Creating new Daily.co room:", canonicalRoomName);

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
        // Handle conflict (room already exists)
        if (dailyResponse.status === 409) {
          const getAgain = await fetch(`${DAILY_API_URL}/rooms/${canonicalRoomName}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
          });
          if (getAgain.ok) {
            room = await getAgain.json();
            console.log("Room already existed (409), using it:", room.url);
          } else {
            throw new Error(`Failed to create or retrieve Daily.co room`);
          }
        } else {
          console.error("Daily.co API error:", errorText);
          throw new Error(`Failed to create Daily.co room: ${errorText}`);
        }
      } else {
        room = await dailyResponse.json();
        console.log("Daily.co room created successfully:", room.url);
      }
    }

    // Generate ONE SHARED meeting token (not user-bound)
    const sharedToken = await createSharedMeetingToken(room.name, expiryTime);
    console.log("Generated shared meeting token for room:", room.name);

    // Update video_dates with correct column names and SAME token for both
    const { error: updateError } = await supabaseClient
      .from("video_dates")
      .update({
        daily_room_url: room.url,
        seeker_meeting_token: sharedToken,
        earner_meeting_token: sharedToken,
      })
      .eq("id", videoDateId);

    if (updateError) {
      console.error("Failed to update video_dates with room info:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        roomUrl: room.url,
        roomName: room.name,
        token: sharedToken,
        seekerToken: sharedToken,
        earnerToken: sharedToken,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in create-daily-room function:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

// Generate a SHARED meeting token (not bound to a specific user)
async function createSharedMeetingToken(roomName: string, expiryTime: Date): Promise<string> {
  const tokenConfig = {
    properties: {
      room_name: roomName,
      enable_screenshare: true,
      start_video_off: false,
      start_audio_off: false,
      exp: Math.floor(expiryTime.getTime() / 1000) + 86400, // 24 hours from expiry
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
