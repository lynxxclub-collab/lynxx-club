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

type Action = "consent" | "start" | "stop";

function validateAction(value: unknown): Action {
  if (value === "consent" || value === "start" || value === "stop") return value;
  throw new Error(`Invalid action. Expected: "consent" | "start" | "stop"`);
}

function parseBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be a boolean`);
  }
  return value;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) throw new Error("DAILY_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase env vars not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- Auth: verify user ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) throw new Error("Missing bearer token");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !user) throw new Error("Unauthorized");

    // ---- Parse body safely ----
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      throw new Error("Invalid JSON body");
    }

    const action = validateAction(body?.action);
    const videoDateId = validateUUID(body?.videoDateId, "videoDateId");

    // ---- Fetch video date ----
    // IMPORTANT: select only what you need (faster + safer)
    const { data: videoDate, error: fetchError } = await supabase
      .from("video_dates")
      .select(
        `
        id,
        seeker_id,
        earner_id,
        daily_room_name,
        recording_id,
        recording_consent_seeker,
        recording_consent_earner
      `
      )
      .eq("id", videoDateId)
      .single();

    if (fetchError || !videoDate) throw new Error("Video date not found");

    // Verify user is part of the video date
    const isSeeker = videoDate.seeker_id === user.id;
    const isEarner = videoDate.earner_id === user.id;
    if (!isSeeker && !isEarner) throw new Error("Unauthorized to access this video date");

    // Prefer DB room name if present (prevents mismatches)
    const roomName =
      videoDate.daily_room_name && typeof videoDate.daily_room_name === "string"
        ? videoDate.daily_room_name
        : `lynxx-${videoDateId.slice(0, 8)}`;

    // ---- Action handlers ----
    if (action === "consent") {
      const consent = parseBoolean(body?.consent, "consent");

      const updateData = isSeeker
        ? { recording_consent_seeker: consent }
        : { recording_consent_earner: consent };

      const { error: updateError } = await supabase
        .from("video_dates")
        .update(updateData)
        .eq("id", videoDateId);

      if (updateError) throw new Error("Failed to update consent");

      const { data: updated } = await supabase
        .from("video_dates")
        .select("recording_consent_seeker, recording_consent_earner")
        .eq("id", videoDateId)
        .single();

      const bothConsented =
        updated?.recording_consent_seeker === true && updated?.recording_consent_earner === true;

      return new Response(
        JSON.stringify({
          success: true,
          bothConsented,
          seekerConsent: updated?.recording_consent_seeker ?? false,
          earnerConsent: updated?.recording_consent_earner ?? false,
          roomName,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "start") {
      // Must have both consents
      if (!videoDate.recording_consent_seeker || !videoDate.recording_consent_earner) {
        throw new Error("Both participants must consent to recording");
      }

      // If already has a recording_id, don’t start a second recording accidentally
      if (videoDate.recording_id) {
        return new Response(
          JSON.stringify({
            success: true,
            alreadyRecording: true,
            recordingId: videoDate.recording_id,
            roomName,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const recordResponse = await fetch(
        `https://api.daily.co/v1/rooms/${encodeURIComponent(roomName)}/recordings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${dailyApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!recordResponse.ok) {
        const errorText = await recordResponse.text();
        console.error("Daily.co recording start error:", errorText);
        throw new Error("Failed to start recording");
      }

      const recordingData = await recordResponse.json();
      const recordingId = recordingData?.id || recordingData?.recording_id;

      if (!recordingId) {
        console.error("Daily.co returned no recording id:", recordingData);
        throw new Error("Recording started but no recording id returned");
      }

      // Save recording info
      await supabase
        .from("video_dates")
        .update({
          recording_id: recordingId,
          recording_started_at: new Date().toISOString(),
        })
        .eq("id", videoDateId);

      return new Response(
        JSON.stringify({
          success: true,
          recordingId,
          roomName,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // action === "stop"
    if (!videoDate.recording_id) {
      // idempotent stop
      return new Response(
        JSON.stringify({ success: true, alreadyStopped: true, roomName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stopResponse = await fetch(
      `https://api.daily.co/v1/recordings/${encodeURIComponent(videoDate.recording_id)}/stop`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${dailyApiKey}` },
      }
    );

    if (!stopResponse.ok) {
      const errorText = await stopResponse.text();
      console.error("Daily.co recording stop error:", errorText);
      // don’t throw — daily may already be stopped
    }

    // Update DB so UI doesn’t stay “recording”
    await supabase
      .from("video_dates")
      .update({
        recording_stopped_at: new Date().toISOString(),
      })
      .eq("id", videoDateId);

    return new Response(JSON.stringify({ success: true, roomName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error managing recording:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});