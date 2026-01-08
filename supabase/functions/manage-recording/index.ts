diff --git a/functions/manage-recording/index.ts b/functions/manage-recording/index.ts
--- a/functions/manage-recording/index.ts
+++ b/functions/manage-recording/index.ts
@@ -42,6 +42,14 @@
 serve(async (req) => {
   const corsHeaders = getCorsHeaders(req);
 
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
+  // Recording control should be POST-only
+  if (req.method !== "POST") {
+    return new Response(JSON.stringify({ error: "Method not allowed" }), {
+      status: 405,
+      headers: { ...corsHeaders, "Content-Type": "application/json" },
+    });
+  }
+
   try {
     // 1) Verify caller identity using anon + user JWT
     const { user, error: authErr } = await verifyAuth(req);
     if (authErr || !user) throw new Error("Unauthorized");
@@ -175,13 +183,46 @@
 
       if (!recordingId) throw new Error("Recording started but no recording id returned");
 
-      await admin
-        .from("video_dates")
-        .update({
-          recording_id: recordingId,
-          recording_started_at: new Date().toISOString(),
-        })
-        .eq("id", videoDateId);
+      // Idempotency / concurrency guard:
+      // Only set recording_id if it is currently null.
+      const startedAt = new Date().toISOString();
+      const { data: updatedRows, error: updateErr } = await admin
+        .from("video_dates")
+        .update({
+          recording_id: recordingId,
+          recording_started_at: startedAt,
+        })
+        .eq("id", videoDateId)
+        .is("recording_id", null)
+        .select("recording_id");
+
+      if (updateErr) throw new Error("Failed to persist recording state");
+
+      if (!updatedRows || updatedRows.length !== 1) {
+        // Another request already set recording_id; treat as already recording.
+        const { data: latest, error: latestErr } = await admin
+          .from("video_dates")
+          .select("recording_id")
+          .eq("id", videoDateId)
+          .maybeSingle();
+
+        if (latestErr) throw new Error("Recording already started");
+
+        return new Response(
+          JSON.stringify({
+            success: true,
+            alreadyRecording: true,
+            recordingId: latest?.recording_id ?? null,
+            roomName,
+          }),
+          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
+        );
+      }
 
       return new Response(
         JSON.stringify({ success: true, recordingId, roomName }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
