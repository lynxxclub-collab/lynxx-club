import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";
import { verifyAuth } from "../_shared/auth.ts";

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
    // 1) Verify caller identity using anon + user JWT
    const { user, error: authErr } = await verifyAuth(req);
    if (authErr || !user) throw new Error("Unauthorized");

    // 2) Service role client for privileged DB reads/writes
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase env vars not configured");

    const admin = createClient(supabaseUrl, serviceKey);

    // 3) Daily API Key
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) throw new Error("DAILY_API_KEY is not configured");

    // 4) Parse body
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      throw new Error("Invalid JSON body");
    }

    const action = validateAction(body?.action);
    const videoDateId = validateUUID(body?.videoDateId, "videoDateId");

    // 5) Load video_date
    const { data: videoDate, error: fetchError } = await admin
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

    // Verify user is a participant
    const isSeeker = videoDate.seeker_id === user.id;
    const isEarner = videoDate.earner_id === user.id;
    if (!isSeeker && !isEarner) throw new Error("Unauthorized to access this video date");

    // Prefer DB room name if present
    const roomName =
      videoDate.daily_room_name && typeof videoDate.daily_room_name === "string"
        ? videoDate.daily_room_name
        : `lynxx-${videoDateId.slice(0, 8)}`;

    // ---- CONSENT ----
    if (action === "consent") {
      const consent = parseBoolean(body?.consent, "consent");

      const updateData = isSeeker
        ? { recording_consent_seeker: consent }
        : { recording_consent_earner: consent };

      const { error: updateError } = await admin
        .from("video_dates")
        .update(updateData)
        .eq("id", videoDateId);

      if (updateError) throw new Error("Failed to update consent");

      const { data: updated } = await admin
        .from("video_dates")
        .select("recording_consent_seeker, recording_consent_earner")
        .eq("id", videoDateId)
        .single();

      const bothConsented =
        updated?.recording_consent_seeker === true && updated?.recording_consent_earner === true;

      return new Response(
        JSON.stringify({
          success: true,
          roomName,
          bothConsented,
          seekerConsent: updated?.recording_consent_seeker ?? false,
          earnerConsent: updated?.recording_consent_earner ?? false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- START ----
    if (action === "start") {
      if (!videoDate.recording_consent_seeker || !videoDate.recording_consent_earner) {
        throw new Error("Both participants must consent to recording");
      }

      // Prevent double-recording starts
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

      if (!recordingId) throw new Error("Recording started but no recording id returned");

      await admin
        .from("video_dates")
        .update({
          recording_id: recordingId,
          recording_started_at: new Date().toISOString(),
        })
        .eq("id", videoDateId);

      return new Response(
        JSON.stringify({ success: true, recordingId, roomName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- STOP ----
    if (!videoDate.recording_id) {
      return new Response(JSON.stringify({ success: true, alreadyStopped: true, roomName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      // do not throw - idempotent stop
    }

    await admin
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