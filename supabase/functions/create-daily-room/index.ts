diff --git a/functions/create-daily-room/index.ts b/functions/create-daily-room/index.ts
--- a/functions/create-daily-room/index.ts
+++ b/functions/create-daily-room/index.ts
@@ -1,17 +1,34 @@
 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
+import { verifyAuth } from "../_shared/auth.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
-const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY")!;
-const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
-const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
+const UUID_REGEX =
+  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
+
+function getEnv(name: string) {
+  const v = Deno.env.get(name);
+  if (!v) console.error(`[CREATE-DAILY-ROOM] Missing env var: ${name}`);
+  return v;
+}
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
-    const authHeader = req.headers.get("Authorization");
-    if (!authHeader) {
-      throw new Error("Missing authorization header");
-    }
+    const DAILY_API_KEY = getEnv("DAILY_API_KEY");
+    const SUPABASE_URL = getEnv("SUPABASE_URL");
+    const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
+    if (!DAILY_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
+      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
+        status: 500,
+        headers: { ...corsHeaders, "Content-Type": "application/json" },
+      });
+    }
 
-    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
-    
-    // Verify the user
-    const token = authHeader.replace("Bearer ", "");
-    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
-    
-    if (userError || !user) {
-      throw new Error("Unauthorized");
-    }
+    const { user, error: authError } = await verifyAuth(req);
+    if (authError || !user) {
+      return new Response(JSON.stringify({ error: "Unauthorized" }), {
+        status: 401,
+        headers: { ...corsHeaders, "Content-Type": "application/json" },
+      });
+    }
+
+    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
+      auth: { persistSession: false },
+    });
 
     const { videoDateId, onAcceptance } = await req.json();
 
-    if (!videoDateId) {
+    if (!videoDateId || typeof videoDateId !== "string" || !UUID_REGEX.test(videoDateId)) {
       throw new Error("Missing videoDateId");
     }
 
@@ -32,10 +49,23 @@
     if (vdError || !videoDate) {
       throw new Error("Video date not found");
     }
 
+    // P0: caller must be a participant (service role bypasses RLS)
+    if (user.id !== videoDate.seeker_id && user.id !== videoDate.earner_id) {
+      console.error("[CREATE-DAILY-ROOM] FORBIDDEN: caller not participant", { userId: user.id, videoDateId });
+      return new Response(JSON.stringify({ error: "Forbidden" }), {
+        status: 403,
+        headers: { ...corsHeaders, "Content-Type": "application/json" },
+      });
+    }
+
     // Only earner can create room (on acceptance)
     if (onAcceptance && user.id !== videoDate.earner_id) {
       throw new Error("Only the earner can create the room upon acceptance");
     }
@@ -53,8 +83,10 @@
 
     // Calculate room expiry (scheduled end time + 10 min buffer)
     const scheduledEnd = new Date(videoDate.scheduled_end_at);
-    const roomExpiry = Math.floor((scheduledEnd.getTime() + 10 * 60 * 1000) / 1000);
+    const scheduledEndMs = scheduledEnd.getTime();
+    const baseMs = Number.isFinite(scheduledEndMs) ? scheduledEndMs : Date.now() + 60 * 60 * 1000;
+    const roomExpiry = Math.floor((baseMs + 10 * 60 * 1000) / 1000);
 
     // Create Daily room
     const roomName = `video-date-${videoDateId}-${Date.now()}`;
@@ -152,16 +184,33 @@
 
     const earnerToken = await earnerTokenResponse.json();
 
-    // Update the video date with room info
-    const { error: updateError } = await supabase
+    // Update the video date with room info (avoid overwriting if another request beat us)
+    const { data: updatedRows, error: updateError } = await supabase
       .from("video_dates")
       .update({
         daily_room_url: room.url,
         daily_room_name: roomName,
         seeker_meeting_token: seekerToken.token,
         earner_meeting_token: earnerToken.token,
         status: "confirmed",
       })
-      .eq("id", videoDateId);
+      .eq("id", videoDateId)
+      .is("daily_room_url", null)
+      .select("daily_room_url");
 
     if (updateError) {
       throw new Error(`Failed to update video date: ${updateError.message}`);
     }
 
+    if (!updatedRows || updatedRows.length !== 1) {
+      // Someone else created the room concurrently. Re-fetch and return existing.
+      const { data: latest } = await supabase
+        .from("video_dates")
+        .select("daily_room_url")
+        .eq("id", videoDateId)
+        .maybeSingle();
+
+      return new Response(
+        JSON.stringify({ success: true, roomUrl: latest?.daily_room_url ?? room.url, message: "Room already exists" }),
+        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
+      );
+    }
+
     return new Response(
       JSON.stringify({
         success: true,
         roomUrl: room.url,
         roomName: roomName,
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
