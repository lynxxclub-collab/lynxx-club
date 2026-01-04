import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Find calls stuck in waiting > 5 minutes with no actual_start
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: stuck, error } = await supabase
    .from("video_dates")
    .select("id")
    .eq("status", "waiting")
    .is("actual_start", null)
    .lte("waiting_started_at", fiveMinutesAgo)
    .limit(50);

  if (error) {
    console.error("[sweep-no-shows] Query error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }

  let processed = 0;
  for (const row of stuck || []) {
    try {
      // Call your existing cancel-video-date logic with service role
      // NOTE: This requires your cancel-video-date function to accept service role auth.
      // If it requires user JWT, you should move refund logic into a SQL RPC instead.
      const { error: cancelErr } = await supabase.functions.invoke("cancel-video-date", {
        body: { videoDateId: row.id, reason: "no_show" },
      });

      if (cancelErr) {
        console.error("[sweep-no-shows] cancel error for", row.id, cancelErr);
        continue;
      }

      processed += 1;
    } catch (e) {
      console.error("[sweep-no-shows] exception for", row.id, e);
    }
  }

  return new Response(JSON.stringify({ success: true, processed }), { status: 200 });
});