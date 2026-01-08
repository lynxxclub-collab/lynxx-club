diff --git a/functions/accept-video-date/index.ts b/functions/accept-video-date/index.ts
--- a/functions/accept-video-date/index.ts
+++ b/functions/accept-video-date/index.ts
@@ -1,15 +1,27 @@
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
+  if (!v) console.error(`[ACCEPT-VIDEO-DATE] Missing env var: ${name}`);
+  return v;
+}
 
 serve(async (req) => {
   // Handle CORS preflight
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
-    const authHeader = req.headers.get("Authorization");
-    if (!authHeader) {
-      throw new Error("Missing authorization header");
-    }
+    if (req.method !== "POST") {
+      return new Response(JSON.stringify({ error: "Method not allowed" }), {
+        status: 405,
+        headers: { ...corsHeaders, "Content-Type": "application/json" },
+      });
+    }
+
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
-    // Verify user
-    const token = authHeader.replace("Bearer ", "");
-    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
-    
-    if (userError || !user) {
-      throw new Error("Unauthorized");
-    }
+    // Verify user (single source of truth)
+    const { user, error: authError } = await verifyAuth(req);
+    if (authError || !user) {
+      return new Response(JSON.stringify({ error: "Unauthorized" }), {
+        status: 401,
+        headers: { ...corsHeaders, "Content-Type": "application/json" },
+      });
+    }
+
+    // Service role for DB writes
+    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
+      auth: { persistSession: false },
+    });
 
     const { videoDateId } = await req.json();
 
-    if (!videoDateId) {
+    if (!videoDateId || typeof videoDateId !== "string" || !UUID_REGEX.test(videoDateId)) {
       throw new Error("Missing videoDateId");
     }
 
     // Fetch video date
     const { data: videoDate, error: vdError } = await supabase
       .from("video_dates")
       .select("*")
       .eq("id", videoDateId)
       .single();
 
     if (vdError || !videoDate) {
       throw new Error("Video date not found");
     }
 
     // Only earner can accept
     if (user.id !== videoDate.earner_id) {
-      throw new Error("Only the earner can accept this date");
+      return new Response(JSON.stringify({ error: "Forbidden" }), {
+        status: 403,
+        headers: { ...corsHeaders, "Content-Type": "application/json" },
+      });
     }
 
     // Check current status
     if (videoDate.status !== "pending") {
-      throw new Error(`Cannot accept date with status: ${videoDate.status}`);
+      // Idempotent: if already accepted/scheduled/confirmed, return success
+      return new Response(
+        JSON.stringify({ success: true, message: "Already accepted", status: videoDate.status }),
+        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
+      );
     }
 
     // Check if room already exists
     if (videoDate.daily_room_url) {
-      // Just update status
-      await supabase
+      // Just update status (idempotent / conditional)
+      const { data: updated, error: statusUpdateError } = await supabase
         .from("video_dates")
         .update({ status: "scheduled" })
-        .eq("id", videoDateId);
+        .eq("id", videoDateId)
+        .eq("status", "pending")
+        .select("id");
+
+      if (statusUpdateError) throw new Error("Failed to update status");
 
       return new Response(
         JSON.stringify({ success: true, message: "Date accepted (room already exists)" }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
@@ -59,7 +71,7 @@
     const roomResponse = await fetch("https://api.daily.co/v1/rooms", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${DAILY_API_KEY}`,
       },
       body: JSON.stringify({
         name: roomName,
         privacy: "private",
         properties: {
           exp: roomExpiry,
           max_participants: 2,
           enable_screenshare: false,
           enable_chat: true,
           enable_knocking: false,
           start_video_off: false,
           start_audio_off: false,
           eject_at_room_exp: true, // Auto-kick at room expiry
         },
       }),
     });
@@ -126,16 +138,33 @@
 
     const earnerToken = await earnerTokenResponse.json();
 
     // Update video date with room info and status
-    const { error: updateError } = await supabase
+    const { data: updatedRows, error: updateError } = await supabase
       .from("video_dates")
       .update({
         status: "scheduled",
         daily_room_url: room.url,
         daily_room_name: roomName,
         seeker_meeting_token: seekerToken.token,
         earner_meeting_token: earnerToken.token,
       })
-      .eq("id", videoDateId);
+      .eq("id", videoDateId)
+      .eq("status", "pending")
+      .is("daily_room_url", null)
+      .select("daily_room_url");
 
     if (updateError) {
       console.error("Failed to update video date:", updateError);
       throw new Error(`Failed to update video date: ${updateError.message}`);
     }
 
+    if (!updatedRows || updatedRows.length !== 1) {
+      // Another request accepted/created room concurrently. Re-fetch and return existing.
+      const { data: latest } = await supabase
+        .from("video_dates")
+        .select("status,daily_room_url")
+        .eq("id", videoDateId)
+        .maybeSingle();
+
+      return new Response(
+        JSON.stringify({
+          success: true,
+          message: "Date accepted",
+          roomUrl: latest?.daily_room_url ?? room.url,
+          status: latest?.status ?? "scheduled",
+        }),
+        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
+      );
+    }
+
     console.log("Video date accepted successfully");
 
     return new Response(
       JSON.stringify({
         success: true,
         message: "Date accepted and room created",
         roomUrl: room.url,
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
