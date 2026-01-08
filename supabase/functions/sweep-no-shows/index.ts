import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
  const cronSecret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || cronSecret !== CRON_SECRET) {
    console.error("[sweep-no-shows] Forbidden: missing/invalid x-cron-secret");
    return new Response(JSON.stringify({ success: false, error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // TEMP DISABLED FOR LAUNCH:
  // This job invoked cancel-video-date via service role, but cancel-video-date requires user auth now.
  // Leaving this enabled would cause repeated failures and/or unsafe financial mutations.
  console.log("[sweep-no-shows] DISABLED for launch");
  return new Response(JSON.stringify({ success: true, disabled: true, processed: 0 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
