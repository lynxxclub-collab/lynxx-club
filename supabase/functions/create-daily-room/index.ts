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

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * If we already have daily_room_url, ALWAYS parse room name from it.
 * That prevents mismatches and accidental creation of a second room.
 */
function getRoomName(videoDateId: string, existingRoomUrl?: string | null) {
  if (existingRoomUrl) {
    try {
      const u = new URL(existingRoomUrl);
      const pathname = u.pathname.replace("/", "");
      if (pathname) return pathname;
    } catch {
      // ignore parse failure, fallback below
    }
  }
  // Use a stable, longer prefix to reduce collision risk
  // Daily room name limit is ~41 chars; this stays safe.
  return `lynxx-${videoDateId.slice(0, 12)}`;
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
    console.error("Daily.co token API error:", errorData);
    throw new Error(`Failed to generate meeting token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.token;
}

async function checkRoomExists(dailyApiKey: string, roomName: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: { Authorization: `Bearer ${dailyApiKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Prevent duplicate room creation:
 * - We atomically "claim" creation by writing a placeholder into daily_room_url
 *   ONLY if it's currently null.
 * - If the update affected 0 rows, someone else already claimed/created it.
 */
async function claimRoomCreationLock(
  supabase: any,
  videoDateId: string,
  placeholder: string,
) {
  const { data, error } = await supabase
    .from("video_dates")
    .update({ daily_room_url: placeholder })
    .eq("id", videoDateId)
    .is("daily_room_url", null) // only claim if still null
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data; // if null => lock not acquired
}

/**
 * Wait for another request to finish creating the room.
 * We re-fetch a few times.
 */
async function waitForRoomUrl(supabase: any, videoDateId: string, maxTries = 10) {
  for (let i = 0; i < maxTries; i++) {
    const { data, error } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Video date not found");

    const url = data.daily_room_url as string | null;
    const isPlaceholder = url?.startsWith("creating:");

    // If room URL is a real Daily URL, we are done
    if (url && !isPlaceholder) return data;

    await sleep(250);
  }
  throw new Error("Room is still being created. Please retry.");
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CREATE-DAILY-ROOM] Function invoked");

    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) throw new Error("DAILY_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const accessToken = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData?.user) throw new Error("Unauthorized");

    const user = authData.user;

    const body = await req.json();
    const videoDateId = validateUUID(body.videoDateId, "videoDateId");
    const regenerateTokens = body.regenerateTokens === true;
    const callType = body.callType === "audio" ? "audio" : "video";

    console.log(
      `[CREATE-DAILY-ROOM] videoDateId=${videoDateId} callType=${callType} regenerate=${regenerateTokens} userId=${user.id}`,
    );

    // Fetch video date
    const { data: videoDate, error: fetchError } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!videoDate) throw new Error("Video date not found");

    if (videoDate.seeker_id !== user.id && videoDate.earner_id !== user.id) {
      throw new Error("Unauthorized to access this video date");
    }

    const roomName = getRoomName(videoDateId, videoDate.daily_room_url);
    const expirationTime = Math.floor(Date.now() / 1000) + 48 * 60 * 60;

    const hasTokens = !!(videoDate.seeker_meeting_token && videoDate.earner_meeting_token);
    const roomUrl = videoDate.daily_room_url as string | null;
    const isPlaceholder = roomUrl?.startsWith("creating:");

    // If room exists AND tokens exist AND no regen requested -> return
    if (roomUrl && !isPlaceholder && hasTokens && !regenerateTokens) {
      return new Response(
        JSON.stringify({
          success: true,
          roomUrl: roomUrl,
          roomName,
          tokensRegenerated: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // If room exists but tokens missing OR regen requested -> regen tokens only
    if (roomUrl && !isPlaceholder) {
      const roomExists = await checkRoomExists(dailyApiKey, roomName);

      // If Daily deleted the room, we will fall through to create new below
      if (roomExists) {
        const [seekerToken, earnerToken] = await Promise.all([
          generateMeetingToken(dailyApiKey, roomName, videoDate.seeker_id, expirationTime),
          generateMeetingToken(dailyApiKey, roomName, videoDate.earner_id, expirationTime),
        ]);

        const { error: updateError } = await supabase
          .from("video_dates")
          .update({
            seeker_meeting_token: seekerToken,
            earner_meeting_token: earnerToken,
          })
          .eq("id", videoDateId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({
            success: true,
            roomUrl: roomUrl,
            roomName,
            tokensRegenerated: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
        );
      }
    }

    // If placeholder exists, someone else is creating it -> wait
    if (roomUrl && isPlaceholder) {
      const finalRow = await waitForRoomUrl(supabase, videoDateId);
      const finalRoomUrl = finalRow.daily_room_url as string | null;
      const finalRoomName = getRoomName(videoDateId, finalRoomUrl);

      // ensure tokens exist (regen if needed)
      const hasFinalTokens = !!(finalRow.seeker_meeting_token && finalRow.earner_meeting_token);
      if (finalRoomUrl && hasFinalTokens && !regenerateTokens) {
        return new Response(
          JSON.stringify({
            success: true,
            roomUrl: finalRoomUrl,
            roomName: finalRoomName,
            tokensRegenerated: false,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
        );
      }

      const roomExists = await checkRoomExists(dailyApiKey, finalRoomName);
      if (!finalRoomUrl || !roomExists) {
        // fall through to create (rare), but we should clear placeholder first
      } else {
        const [seekerToken, earnerToken] = await Promise.all([
          generateMeetingToken(dailyApiKey, finalRoomName, finalRow.seeker_id, expirationTime),
          generateMeetingToken(dailyApiKey, finalRoomName, finalRow.earner_id, expirationTime),
        ]);

        const { error: updateError } = await supabase
          .from("video_dates")
          .update({
            seeker_meeting_token: seekerToken,
            earner_meeting_token: earnerToken,
          })
          .eq("id", videoDateId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({
            success: true,
            roomUrl: finalRoomUrl,
            roomName: finalRoomName,
            tokensRegenerated: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
        );
      }
    }

    // ---- create new room (only ONE request should reach here due to claim lock) ----

    // Try to claim the lock (only if daily_room_url is null)
    const placeholder = `creating:${roomName}:${crypto.randomUUID()}`;
    const claimedRow = await claimRoomCreationLock(supabase, videoDateId, placeholder);

    if (!claimedRow) {
      // someone else claimed it between our fetch and now -> wait and return
      const finalRow = await waitForRoomUrl(supabase, videoDateId);
      const finalRoomUrl = finalRow.daily_room_url as string | null;
      const finalRoomName = getRoomName(videoDateId, finalRoomUrl);

      return new Response(
        JSON.stringify({
          success: true,
          roomUrl: finalRoomUrl,
          roomName: finalRoomName,
          tokensRegenerated: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    console.log("[CREATE-DAILY-ROOM] Lock claimed, creating Daily room...");

    // Create the Daily room
    const roomExpirationTime = Math.floor(Date.now() / 1000) + 48 * 60 * 60;

    const dailyResponse = await fetch("https://api.daily.co/v1/rooms", {
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
          exp: roomExpirationTime,
        },
      }),
    });

    if (!dailyResponse.ok) {
      const errorData = await dailyResponse.text();
      console.error("[CREATE-DAILY-ROOM] Daily.co API error:", dailyResponse.status, errorData);

      // clear placeholder lock so user can retry
      await supabase
        .from("video_dates")
        .update({ daily_room_url: null })
        .eq("id", videoDateId)
        .eq("daily_room_url", placeholder);

      throw new Error(`Failed to create Daily.co room: ${dailyResponse.status}`);
    }

    const room = await dailyResponse.json();
    console.log("[CREATE-DAILY-ROOM] Daily.co room created:", room.url);

    // Generate meeting tokens for both participants
    const [seekerToken, earnerToken] = await Promise.all([
      generateMeetingToken(dailyApiKey, roomName, claimedRow.seeker_id, expirationTime),
      generateMeetingToken(dailyApiKey, roomName, claimedRow.earner_id, expirationTime),
    ]);

    // Store real room URL and tokens (replace placeholder)
    const { error: updateError } = await supabase
      .from("video_dates")
      .update({
        daily_room_url: room.url,
        seeker_meeting_token: seekerToken,
        earner_meeting_token: earnerToken,
      })
      .eq("id", videoDateId)
      .eq("daily_room_url", placeholder); // only replace if we still own the lock

    if (updateError) {
      console.error("Failed to update video date with room data:", updateError);
      throw new Error("Failed to save room URL and tokens");
    }

    return new Response(
      JSON.stringify({
        success: true,
        roomUrl: room.url,
        roomName: roomName,
        tokensRegenerated: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: unknown) {
    console.error("Error creating Daily.co room:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});