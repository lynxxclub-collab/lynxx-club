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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const jwt = authHeader.replace("Bearer ", "");

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const videoDateId = validateUUID(body.videoDateId, "videoDateId");

    const { data: vd, error: vdErr } = await supabase
      .from("video_dates")
      .select("id,seeker_id,earner_id,status,waiting_started_at,actual_start")
      .eq("id", videoDateId)
      .single();

    if (vdErr || !vd) throw new Error("Video date not found");
    const isParticipant = (user.id === vd.seeker_id) || (user.id === vd.earner_id);
    if (!isParticipant) throw new Error("Unauthorized");

    // If call already started, do nothing
    if (vd.actual_start) {
      return new Response(JSON.stringify({ success: true, status: vd.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Set waiting_started_at once
    const nowIso = new Date().toISOString();

    // Only bump to waiting if scheduled/pending
    const nextStatus =
      (vd.status === "scheduled" || vd.status === "pending") ? "waiting" : vd.status;

    // IMPORTANT: only set waiting_started_at if null
    const update: any = { status: nextStatus };
    if (!vd.waiting_started_at) update.waiting_started_at = nowIso;

    const { error: upErr } = await supabase
      .from("video_dates")
      .update(update)
      .eq("id", videoDateId);

    if (upErr) throw new Error("Failed to mark waiting");

    return new Response(JSON.stringify({ success: true, status: nextStatus, waiting_started_at: update.waiting_started_at ?? vd.waiting_started_at }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("[mark-video-date-waiting] Error:", error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});