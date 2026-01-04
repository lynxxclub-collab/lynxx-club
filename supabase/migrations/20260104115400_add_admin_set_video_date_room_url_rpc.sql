import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Find expired waiting calls
  const nowIso = new Date().toISOString();

  const { data: expired, error } = await supabase
    .from("video_dates")
    .select("id,status,grace_deadline")
    .eq("status", "waiting")
    .lte("grace_deadline", nowIso)
    .limit(100);

  if (error) {
    console.error("Query error:", error);
    return new Response(JSON.stringify({ success: false, error }), { status: 500 });
  }

  if (!expired?.length) {
    return new Response(JSON.stringify({ success: true, processed: 0 }), { status: 200 });
  }

  let processed = 0;

  for (const vd of expired) {
    try {
      // Mark no_show first (idempotent)
      await supabase
        .from("video_dates")
        .update({ status: "no_show" })
        .eq("id", vd.id)
        .eq("status", "waiting");

      // If you already have cancel-video-date that handles refunds,
      // you should move the refund logic into a DB RPC or do it here directly.
      //
      // ⚠️ If you CAN call your cancel-video-date logic from here, do it here.
      // Otherwise, paste your wallet schema and I’ll implement refund inline.

      processed++;
    } catch (e) {
      console.error("Failed processing", vd.id, e);
    }
  }

  return new Response(JSON.stringify({ success: true, processed }), { status: 200 });
});