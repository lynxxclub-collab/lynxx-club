// supabase/functions/create-daily-room/index.ts
// deno-lint-ignore-file
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

/**
 * create-daily-room (bulletproof + returns tokens)
 *
 * Request body:
 * {
 *   videoDateId: string (uuid),
 *   regenerateTokens?: boolean,
 *   callType?: "video" | "audio"
 * }
 *
 * Response:
 * {
 *   success: true,
 *   roomUrl: string,
 *   roomName: string,
 *   tokensRegenerated: boolean,
 *   roomCreated: boolean,
 *   seekerToken?: string,
 *   earnerToken?: string
 * }
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CallType = "video" | "audio";

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

function validateCallType(value: unknown): CallType {
  return value === "audio" ? "audio" : "video";
}

function json(
  corsHeaders: Record<string, string>,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getRoomNameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  } catch {
    const parts = String(url).split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  }
}

function computeRoomName(videoDateId: string): string {
  return `lynxx-${videoDateId.slice(0, 8)}`;
}

function expSeconds(hours: number): number {
  return Math.floor(Date.now() / 1000) + hours * 60 * 60;
}

async function dailyRoomExists(dailyApiKey: string, roomName: string): Promise<boolean> {
  const res = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
    headers: { Authorization: `Bearer ${dailyApiKey}` },
  });
  return res.ok;
}

async function dailyCreateRoom(dailyApiKey: string, roomName: string, callType: CallType) {
  const roomExp = expSeconds(48);

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
        enable_recording: "cloud",
        exp: roomExp,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[CREATE-DAILY-ROOM] Daily create room failed:", res.status, text);
    throw new Error(`Failed to create Daily.co room (${res.status})`);
  }

  return await res.json();
}

async function dailyCreateMeetingToken(
  dailyApiKey: string,
  roomName: string,
  userId: string,
  tokenExpSeconds: number,
): Promise<string> {
  const res = await fetch("https://api.daily.co/v1/meeting-tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dailyApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        exp: tokenExpSeconds,
        is_owner: false,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[CREATE-DAILY-ROOM] Daily token failed:", res.status, text);
    throw new Error(`Failed to generate meeting token (${res.status})`);
  }

  const data = await res.json();
  if (!data?.token) throw new Error("Daily token response missing token");
  return data.token as string;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) throw new Error("DAILY_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");

    const accessToken = authHeader.replace("Bearer ", "").trim();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) throw new Error("Unauthorized");

    // --- Input ---
    const body = await req.json();
    const videoDateId = validateUUID(body.videoDateId, "videoDateId");
    const regenerateTokens = body.regenerateTokens === true;
    const callType = validateCallType(body.callType);

    // --- Load video date ---
    const { data: videoDate, error: vdErr } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .single();

    if (vdErr || !videoDate) throw new Error("Video date not found");

    // Ensure caller is participant
    if (videoDate.seeker_id !== user.id && videoDate.earner_id !== user.id) {
      throw new Error("Unauthorized to access this video date");
    }

    // Choose room name
    const storedRoomName = (videoDate.daily_room_name as string | null) ?? null;
    const parsedFromUrl = getRoomNameFromUrl(videoDate.daily_room_url);
    const computed = computeRoomName(videoDateId);
    const roomName = storedRoomName || parsedFromUrl || computed;

    const hasRoomUrl = Boolean(videoDate.daily_room_url);
    const hasTokens = Boolean(videoDate.seeker_meeting_token && videoDate.earner_meeting_token);

    // 48h token expiry
    const tokenExp = expSeconds(48);

    // 1) Ensure room exists (create if missing)
    let roomUrl: string | null = (videoDate.daily_room_url as string | null) ?? null;
    let roomCreated = false;

    if (roomUrl) {
      const exists = await dailyRoomExists(dailyApiKey, roomName);
      if (!exists) {
        roomUrl = null;
      }
    }

    if (!roomUrl) {
      const created = await dailyCreateRoom(dailyApiKey, roomName, callType);
      roomUrl = created?.url as string | undefined;
      if (!roomUrl) throw new Error("Daily room created but missing url");
      roomCreated = true;
    }

    // 2) Ensure tokens exist (or regenerate)
    const shouldRegenerateTokens = regenerateTokens || !hasTokens || roomCreated;

    let seekerToken: string | null = (videoDate.seeker_meeting_token as string | null) ?? null;
    let earnerToken: string | null = (videoDate.earner_meeting_token as string | null) ?? null;
    let tokensRegenerated = false;

    if (shouldRegenerateTokens) {
      const [sTok, eTok] = await Promise.all([
        dailyCreateMeetingToken(dailyApiKey, roomName, videoDate.seeker_id, tokenExp),
        dailyCreateMeetingToken(dailyApiKey, roomName, videoDate.earner_id, tokenExp),
      ]);
      seekerToken = sTok;
      earnerToken = eTok;
      tokensRegenerated = true;
    }

    // 3) Persist to DB
    const updatePayload: Record<string, unknown> = {
      daily_room_url: roomUrl,
      daily_room_name: roomName,
    };

    if (tokensRegenerated) {
      updatePayload.seeker_meeting_token = seekerToken;
      updatePayload.earner_meeting_token = earnerToken;
    }

    // Only set status to scheduled on first room creation (avoid clobbering waiting/in_progress)
    if (roomCreated && (videoDate.status === "pending" || videoDate.status === "scheduled")) {
      updatePayload.status = "scheduled";
    }

    const { error: updateErr } = await supabase.from("video_dates").update(updatePayload).eq("id", videoDateId);
    if (updateErr) {
      console.error("[CREATE-DAILY-ROOM] Failed to update video_dates:", updateErr);
      throw new Error("Failed to save Daily room/tokens");
    }

    // 4) Return tokens (client can pick correct one by role)
    return json(corsHeaders, {
      success: true,
      roomUrl,
      roomName,
      roomCreated,
      tokensRegenerated,
      seekerToken: tokensRegenerated ? seekerToken : undefined,
      earnerToken: tokensRegenerated ? earnerToken : undefined,
    });
  } catch (error: unknown) {
    console.error("[CREATE-DAILY-ROOM] Error:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});