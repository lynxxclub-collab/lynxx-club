import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

type CallType = "video" | "audio";
function normalizeCallType(v: unknown): CallType {
  return v === "audio" ? "audio" : "video";
}

async function dailyGetRoom(dailyApiKey: string, roomName: string) {
  const res = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
    headers: { Authorization: `Bearer ${dailyApiKey}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

async function dailyCreateRoom(dailyApiKey: string, roomName: string, callType: CallType) {
  const exp = Math.floor(Date.now() / 1000) + 48 * 60 * 60;

  const res = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dailyApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: {
        max_participants: 2,
        enable_chat: false,
        enable_screenshare: false,
        start_audio_off: false,
        start_video_off: callType === "audio",
        exp,
      },
    }),
  });

  // If two requests try to create same named room, Daily returns 409.
  if (res.status === 409) {
    const existing = await dailyGetRoom(dailyApiKey, roomName);
    if (!existing) throw new Error("Room conflict but could not fetch existing room");
    return existing;
  }

  if (!res.ok) {
    const errorData = await res.text();
    console.error("[CREATE-DAILY-ROOM] Daily create error:", res.status, errorData);
    throw new Error(`Failed to create Daily.co room: ${res.status}`);
  }

  return await res.json();
}

async function generateMeetingToken(
  dailyApiKey: string,
  roomName: string,
  userId: string,
  expirationTime: number
): Promise<string> {
  const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dailyApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        exp: expirationTime,
        is_owner: false,
      },
    }),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    console.error("[CREATE-DAILY-ROOM] Token API error:", tokenResponse.status, errorData);
    throw new Error(`Failed to generate meeting token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.token;
}

function stableRoomName(videoDateId: string) {
  // Canonical: one stable deterministic name
  return `lynxx-${videoDateId.replaceAll("-", "")}`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) throw new Error("DAILY_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const jwt = authHeader.replace("Bearer ", "");

    // Verify caller identity
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const videoDateId = validateUUID(body.videoDateId, "videoDateId");
    const callType = normalizeCallType(body.callType);
    const regenerateTokens = body.regenerateTokens === true;

    // Always load fresh row from DB
    const { data: videoDate, error: fetchError } = await supabase
      .from("video_dates")
      .select(
        "id,seeker_id,earner_id,call_type,status,daily_room_url,daily_room_name,seeker_meeting_token,earner_meeting_token"
      )
      .eq("id", videoDateId)
      .single();

    if (fetchError || !videoDate) throw new Error("Video date not found");

    const isSeeker = videoDate.seeker_id === user.id;
    const isEarner = videoDate.earner_id === user.id;
    if (!isSeeker && !isEarner) throw new Error("Unauthorized to access this video date");

    // Canonical room name (persisted)
    const roomName = (videoDate.daily_room_name && String(videoDate.daily_room_name)) || stableRoomName(videoDateId);

    // Persist daily_room_name if missing (so all clients converge)
    if (!videoDate.daily_room_name) {
      await supabase.from("video_dates").update({ daily_room_name: roomName }).eq("id", videoDateId);
    }

    const hasRoomUrl = !!videoDate.daily_room_url;
    const hasTokens = !!videoDate.seeker_meeting_token && !!videoDate.earner_meeting_token;

    const tokenExp = Math.floor(Date.now() / 1000) + 48 * 60 * 60;

    // ------------------------------------------------------------
    // RULE: ONLY SEEKER MAY CREATE ROOM
    // ------------------------------------------------------------
    if (isEarner) {
      // Earner must never create a room
      if (!hasRoomUrl) {
        throw new Error("Room not created yet. Please wait for the seeker to start the session.");
      }

      // Earner may regenerate tokens ONLY if room exists
      if (!hasTokens || regenerateTokens) {
        const roomExists = await dailyGetRoom(dailyApiKey, roomName);
        if (!roomExists) {
          throw new Error("Room is not available yet. Please wait for the seeker.");
        }

        const [seekerToken, earnerToken] = await Promise.all([
          generateMeetingToken(dailyApiKey, roomName, videoDate.seeker_id, tokenExp),
          generateMeetingToken(dailyApiKey, roomName, videoDate.earner_id, tokenExp),
        ]);

        const { error: updateErr } = await supabase
          .from("video_dates")
          .update({
            seeker_meeting_token: seekerToken,
            earner_meeting_token: earnerToken,
          })
          .eq("id", videoDateId);

        if (updateErr) throw new Error("Failed to save tokens");

        return new Response(
          JSON.stringify({
            success: true,
            roomUrl: videoDate.daily_room_url,
            roomName,
            tokensRegenerated: true,
            role: "earner",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          roomUrl: videoDate.daily_room_url,
          roomName,
          tokensRegenerated: false,
          role: "earner",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ------------------------------------------------------------
    // SEEKER PATH: create room if needed, ensure tokens
    // ------------------------------------------------------------

    // Fast path: already good and no regen requested
    if (hasRoomUrl && hasTokens && !regenerateTokens) {
      return new Response(
        JSON.stringify({
          success: true,
          roomUrl: videoDate.daily_room_url,
          roomName,
          tokensRegenerated: false,
          role: "seeker",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Ensure room exists
    let roomUrl = videoDate.daily_room_url as string | null;

    if (!roomUrl) {
      // Idempotency anchor: write daily_room_name first (already done),
      // then create/fetch room from Daily.
      const room = await dailyCreateRoom(dailyApiKey, roomName, callType);
      roomUrl = room.url;

      const { error: roomSaveErr } = await supabase
        .from("video_dates")
        .update({
          daily_room_url: roomUrl,
          daily_room_name: roomName,
        })
        .eq("id", videoDateId);

      if (roomSaveErr) throw new Error("Failed to save room URL");
    }

    // Ensure tokens (always generate for seeker path if missing or regen requested)
    const [seekerToken, earnerToken] = await Promise.all([
      generateMeetingToken(dailyApiKey, roomName, videoDate.seeker_id, tokenExp),
      generateMeetingToken(dailyApiKey, roomName, videoDate.earner_id, tokenExp),
    ]);

    const { error: tokenSaveErr } = await supabase
      .from("video_dates")
      .update({
        seeker_meeting_token: seekerToken,
        earner_meeting_token: earnerToken,
      })
      .eq("id", videoDateId);

    if (tokenSaveErr) throw new Error("Failed to save tokens");

    // Return canonical data
    return new Response(
      JSON.stringify({
        success: true,
        roomUrl,
        roomName,
        tokensRegenerated: regenerateTokens || !hasTokens,
        role: "seeker",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("[CREATE-DAILY-ROOM] Error:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});