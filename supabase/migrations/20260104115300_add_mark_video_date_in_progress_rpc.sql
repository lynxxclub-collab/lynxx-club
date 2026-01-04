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

  // If two requests try to create same room, Daily returns 409.
  if (res.status === 409) {
    const existing = await dailyGetRoom(dailyApiKey, roomName);
    if (!existing) throw new Error("Room conflict but could not fetch existing room");
    return existing;
  }

  if (!res.ok) {
    const errorData = await res.text();
    console.error("[PREPARE-VIDEO-CALL] Daily create error:", res.status, errorData);
    throw new Error(`Failed to create Daily room: ${res.status}`);
  }

  return await res.json();
}

async function generateMeetingToken(
  dailyApiKey: string,
  roomName: string,
  userId: string,
  expirationTime: number,
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
    console.error("[PREPARE-VIDEO-CALL] Token API error:", tokenResponse.status, errorData);
    throw new Error(`Failed to generate meeting token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.token;
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!anonKey) throw new Error("SUPABASE_ANON_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const jwt = authHeader.replace("Bearer ", "");

    // user-scoped client (auth.uid() works in RPC)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    // service client for DB updates (bypass RLS)
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const videoDateId = validateUUID(body.videoDateId, "videoDateId");
    const callType = normalizeCallType(body.callType);
    const regenerateTokens = body.regenerateTokens === true;

    // 1) Lock row & get shared room name/url
    const { data: roomInfo, error: roomInfoErr } = await userClient.rpc("get_or_create_video_date_room", {
      p_video_date_id: videoDateId,
    });

    if (roomInfoErr) throw roomInfoErr;
    if (!roomInfo?.success) throw new Error(roomInfo?.error || "Failed to get room info");

    const roomName: string = roomInfo.room_name;
    let roomUrl: string | null = roomInfo.room_url;

    // 2) Load the latest video date row (service role)
    const { data: vd, error: vdErr } = await serviceClient
      .from("video_dates")
      .select("id,seeker_id,earner_id,status,grace_deadline,actual_start,daily_room_url,daily_room_name,seeker_meeting_token,earner_meeting_token")
      .eq("id", videoDateId)
      .single();

    if (vdErr || !vd) throw new Error("Video date not found");

    const isSeeker = vd.seeker_id === user.id;
    const isEarner = vd.earner_id === user.id;
    if (!isSeeker && !isEarner) throw new Error("Unauthorized");

    // 3) If needs creation, create Daily room and persist url
    if (!roomUrl) {
      const created = await dailyCreateRoom(dailyApiKey, roomName, callType);
      roomUrl = created.url;

      const { error: saveRoomErr } = await serviceClient
        .from("video_dates")
        .update({
          daily_room_url: roomUrl,
          daily_room_name: roomName,
          daily_room_created_at: new Date().toISOString(),
        })
        .eq("id", videoDateId);

      if (saveRoomErr) throw new Error("Failed to save room URL");
    }

    // 4) Ensure tokens exist (or regenerate)
    const tokenExp = Math.floor(Date.now() / 1000) + 48 * 60 * 60;
    const hasTokens = !!vd.seeker_meeting_token && !!vd.earner_meeting_token;

    if (!hasTokens || regenerateTokens) {
      const [seekerToken, earnerToken] = await Promise.all([
        generateMeetingToken(dailyApiKey, roomName, vd.seeker_id, tokenExp),
        generateMeetingToken(dailyApiKey, roomName, vd.earner_id, tokenExp),
      ]);

      const { error: saveTokErr } = await serviceClient
        .from("video_dates")
        .update({
          seeker_meeting_token: seekerToken,
          earner_meeting_token: earnerToken,
        })
        .eq("id", videoDateId);

      if (saveTokErr) throw new Error("Failed to save meeting tokens");

      vd.seeker_meeting_token = seekerToken;
      vd.earner_meeting_token = earnerToken;
    }

    // 5) Start the 5-minute grace window ONCE when first person joins
    //    Only if call hasn't started yet.
    if (!vd.actual_start) {
      const shouldStartGrace =
        (vd.status === "scheduled" || vd.status === "waiting") &&
        vd.grace_deadline == null;

      if (shouldStartGrace) {
        const deadline = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        // idempotent update: only set if still null
        await serviceClient
          .from("video_dates")
          .update({
            status: "waiting",
            grace_deadline: deadline,
          })
          .eq("id", videoDateId)
          .is("grace_deadline", null);

        vd.grace_deadline = deadline;
        vd.status = "waiting";
      }
    }

    const myToken = isSeeker ? vd.seeker_meeting_token : vd.earner_meeting_token;

    return new Response(
      JSON.stringify({
        success: true,
        roomUrl,
        roomName,
        token: myToken,
        role: isSeeker ? "seeker" : "earner",
        graceDeadline: vd.grace_deadline,
        status: vd.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: unknown) {
    console.error("[PREPARE-VIDEO-CALL] Error:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});