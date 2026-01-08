import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) console.error(`[ACCEPT-VIDEO-DATE] Missing env var: ${name}`);
  return v;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const DAILY_API_KEY = getEnv("DAILY_API_KEY");
    const SUPABASE_URL = getEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!DAILY_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user (single source of truth)
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role for DB writes
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { videoDateId } = await req.json();

    if (!videoDateId || typeof videoDateId !== "string" || !UUID_REGEX.test(videoDateId)) {
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
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check current status
    if (videoDate.status !== "pending") {
      // Idempotent: if already accepted/scheduled/confirmed, return success
      return new Response(
        JSON.stringify({ success: true, message: "Already accepted", status: videoDate.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if room already exists
    if (videoDate.daily_room_url) {
      // Just update status (idempotent / conditional)
      const { error: statusUpdateError } = await supabase
        .from("video_dates")
        .update({ status: "scheduled" })
        .eq("id", videoDateId)
        .eq("status", "pending");

      if (statusUpdateError) throw new Error("Failed to update status");

      return new Response(
        JSON.stringify({ success: true, message: "Date accepted (room already exists)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate room expiry (scheduled end time + 30 min buffer)
    const scheduledStart = new Date(videoDate.scheduled_start);
    const scheduledEndMs = scheduledStart.getTime() + videoDate.scheduled_duration * 60 * 1000;
    const roomExpiry = Math.floor((scheduledEndMs + 30 * 60 * 1000) / 1000); // Unix timestamp

    // Create Daily room
    const roomName = `vd-${videoDateId.substring(0, 8)}-${Date.now()}`;
    
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
          eject_at_room_exp: true,
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

    // Create meeting tokens for both participants
    const seekerTokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_id: videoDate.seeker_id,
          is_owner: false,
          exp: roomExpiry,
        },
      }),
    });

    if (!seekerTokenResponse.ok) {
      throw new Error("Failed to create seeker meeting token");
    }

    const seekerToken = await seekerTokenResponse.json();

    const earnerTokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_id: videoDate.earner_id,
          is_owner: true,
          exp: roomExpiry,
        },
      }),
    });

    if (!earnerTokenResponse.ok) {
      throw new Error("Failed to create earner meeting token");
    }

    const earnerToken = await earnerTokenResponse.json();

    // Update video date with room info and status
    const { data: updatedRows, error: updateError } = await supabase
      .from("video_dates")
      .update({
        status: "scheduled",
        daily_room_url: room.url,
        seeker_meeting_token: seekerToken.token,
        earner_meeting_token: earnerToken.token,
      })
      .eq("id", videoDateId)
      .eq("status", "pending")
      .is("daily_room_url", null)
      .select("daily_room_url");

    if (updateError) {
      console.error("Failed to update video date:", updateError);
      throw new Error(`Failed to update video date: ${updateError.message}`);
    }

    if (!updatedRows || updatedRows.length !== 1) {
      // Another request accepted/created room concurrently. Re-fetch and return existing.
      const { data: latest } = await supabase
        .from("video_dates")
        .select("status,daily_room_url")
        .eq("id", videoDateId)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          message: "Date accepted",
          roomUrl: latest?.daily_room_url ?? room.url,
          status: latest?.status ?? "scheduled",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Accept video date error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
