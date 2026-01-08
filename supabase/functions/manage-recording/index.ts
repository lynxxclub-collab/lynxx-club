import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";

const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY") || "";
const DAILY_API_URL = "https://api.daily.co/v1";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MANAGE-RECORDING] ${step}${detailsStr}`);
};

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

async function dailyRequest(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<Response> {
  const res = await fetch(`${DAILY_API_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Recording control should be POST-only
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1) Verify caller identity using anon + user JWT
    const { user, error: authErr } = await verifyAuth(req);
    if (authErr || !user) throw new Error("Unauthorized");

    logStep("User authenticated", { userId: user.id });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { action, videoDateId } = await req.json();

    if (!videoDateId || !isValidUUID(videoDateId)) {
      throw new Error("Invalid videoDateId");
    }

    if (!["start", "stop"].includes(action)) {
      throw new Error("Invalid action");
    }

    logStep("Request parsed", { action, videoDateId });

    // 2) Verify user is a participant
    const { data: videoDate, error: vdErr } = await admin
      .from("video_dates")
      .select("id, seeker_id, earner_id, daily_room_url, status, recording_id, recording_consent_seeker, recording_consent_earner")
      .eq("id", videoDateId)
      .maybeSingle();

    if (vdErr || !videoDate) {
      throw new Error("Video date not found");
    }

    const isParticipant = user.id === videoDate.seeker_id || user.id === videoDate.earner_id;
    if (!isParticipant) {
      throw new Error("Not a participant");
    }

    // Extract room name from daily URL
    const roomName = videoDate.daily_room_url?.split("/").pop();
    if (!roomName) {
      throw new Error("No room associated with this video date");
    }

    logStep("Video date verified", { roomName, status: videoDate.status });

    // 3) Handle start/stop
    if (action === "start") {
      // Both parties must consent
      if (!videoDate.recording_consent_seeker || !videoDate.recording_consent_earner) {
        throw new Error("Both parties must consent to recording");
      }

      // Check if already recording
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

      // Start recording via Daily API
      const startRes = await dailyRequest("POST", `/rooms/${roomName}/recordings`, {
        max_duration: 3600, // 1 hour max
      });

      if (!startRes.ok) {
        const errText = await startRes.text();
        logStep("Daily API error starting recording", { status: startRes.status, error: errText });
        throw new Error("Failed to start recording");
      }

      const recordingData = await startRes.json();
      const recordingId = recordingData.id || recordingData.recording_id;

      logStep("Recording started", { recordingId });

      if (!recordingId) throw new Error("Recording started but no recording id returned");

      // Idempotency / concurrency guard:
      // Only set recording_id if it is currently null.
      const startedAt = new Date().toISOString();
      const { data: updatedRows, error: updateErr } = await admin
        .from("video_dates")
        .update({
          recording_id: recordingId,
          recording_started_at: startedAt,
        })
        .eq("id", videoDateId)
        .is("recording_id", null)
        .select("recording_id");

      if (updateErr) throw new Error("Failed to persist recording state");

      if (!updatedRows || updatedRows.length !== 1) {
        // Another request already set recording_id; treat as already recording.
        const { data: latest, error: latestErr } = await admin
          .from("video_dates")
          .select("recording_id")
          .eq("id", videoDateId)
          .maybeSingle();

        if (latestErr) throw new Error("Recording already started");

        return new Response(
          JSON.stringify({
            success: true,
            alreadyRecording: true,
            recordingId: latest?.recording_id ?? null,
            roomName,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, recordingId, roomName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "stop") {
      const recordingId = videoDate.recording_id;
      if (!recordingId) {
        return new Response(
          JSON.stringify({ success: true, message: "No recording to stop" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Stop recording via Daily API
      const stopRes = await dailyRequest("POST", `/rooms/${roomName}/recordings/${recordingId}/stop`);

      if (!stopRes.ok) {
        const errText = await stopRes.text();
        logStep("Daily API error stopping recording", { status: stopRes.status, error: errText });
        // Don't fail - the recording may have already stopped
      }

      logStep("Recording stopped", { recordingId });

      return new Response(
        JSON.stringify({ success: true, recordingId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { error: message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
