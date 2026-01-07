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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { videoDateId } = await req.json();

    if (!videoDateId) {
      throw new Error("Missing videoDateId");
    }

    // Fetch video date
    const { data: videoDate, error: vdError } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .single();

    if (vdError || !videoDate) {
      throw new Error("Video date not found");
    }

    // Only earner can accept
    if (user.id !== videoDate.earner_id) {
      throw new Error("Only the earner can accept this date");
    }

    // Check current status
    if (videoDate.status !== "pending") {
      throw new Error(`Cannot accept date with status: ${videoDate.status}`);
    }

    // Check if room already exists
    if (videoDate.daily_room_url) {
      // Just update status
      await supabase
        .from("video_dates")
        .update({ status: "scheduled" })
        .eq("id", videoDateId);

      return new Response(
        JSON.stringify({ success: true, message: "Date accepted (room already exists)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate room expiry (end of call + 10 min buffer)
    const scheduledStart = new Date(videoDate.scheduled_start);
    const durationMs = videoDate.scheduled_duration * 60 * 1000;
    const scheduledEnd = new Date(scheduledStart.getTime() + durationMs);
    const roomExpiry = Math.floor((scheduledEnd.getTime() + 10 * 60 * 1000) / 1000);

    // Create unique room name
    const roomName = `vd-${videoDateId.substring(0, 8)}-${Date.now()}`;
    
    console.log(`Creating Daily room: ${roomName}`);

    // Create Daily room
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
          eject_at_room_exp: true, // Auto-kick at room expiry
        },
      }),
    });

    if (!roomResponse.ok) {
      const errorText = await roomResponse.text();
      console.error("Daily room creation failed:", errorText);
      throw new Error(`Failed to create video room: ${errorText}`);
    }

    const room = await roomResponse.json();
    console.log("Room created:", room.url);

    // Create meeting token for seeker
    const seekerTokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          exp: roomExpiry,
          user_id: videoDate.seeker_id,
          is_owner: false,
        },
      }),
    });

    if (!seekerTokenResponse.ok) {
      throw new Error("Failed to create seeker meeting token");
    }

    const seekerToken = await seekerTokenResponse.json();

    // Create meeting token for earner
    const earnerTokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          exp: roomExpiry,
          user_id: videoDate.earner_id,
          is_owner: false,
        },
      }),
    });

    if (!earnerTokenResponse.ok) {
      throw new Error("Failed to create earner meeting token");
    }

    const earnerToken = await earnerTokenResponse.json();

    // Update video date with room info and status
    const { error: updateError } = await supabase
      .from("video_dates")
      .update({
        status: "scheduled",
        daily_room_url: room.url,
        daily_room_name: roomName,
        seeker_meeting_token: seekerToken.token,
        earner_meeting_token: earnerToken.token,
      })
      .eq("id", videoDateId);

    if (updateError) {
      console.error("Failed to update video date:", updateError);
      throw new Error(`Failed to update video date: ${updateError.message}`);
    }

    console.log("Video date accepted successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Date accepted and room created",
        roomUrl: room.url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Accept video date error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
