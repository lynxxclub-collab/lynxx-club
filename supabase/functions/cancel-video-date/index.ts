diff --git a/functions/cancel-video-date/index.ts b/functions/cancel-video-date/index.ts
--- a/functions/cancel-video-date/index.ts
+++ b/functions/cancel-video-date/index.ts
@@ -1,7 +1,8 @@
 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { getCorsHeaders } from "../_shared/cors.ts";
 import { createAutoErrorResponse } from "../_shared/errors.ts";
+import { verifyAuth } from "../_shared/auth.ts";
 
 // ---------------------------------------------
 // Validation
 // ---------------------------------------------
@@ -43,6 +44,12 @@
 async function getProfileName(supabase: any, userId: string): Promise<string | null> {
   const { data } = await supabase.from("profiles").select("name").eq("id", userId).single();
   return data?.name || null;
 }
 
+function getEnv(name: string) {
+  const v = Deno.env.get(name);
+  if (!v) console.error(`[cancel-video-date] Missing env var: ${name}`);
+  return v;
+}
+
 // ---------------------------------------------
 // Daily helper
 // ---------------------------------------------
 async function deleteDailyRoomIfExists(dailyApiKey: string | null, roomUrl: string | null | undefined) {
@@ -65,6 +72,56 @@
   }
 }
 
+async function refundWalletCreditsSafe(supabase: any, userId: string, creditsToAdd: number) {
+  if (!creditsToAdd || !Number.isFinite(creditsToAdd) || creditsToAdd <= 0) return;
+
+  // Ensure wallet exists
+  const { error: upsertErr } = await supabase
+    .from("wallets")
+    .upsert({ user_id: userId, credit_balance: 0 }, { onConflict: "user_id" });
+  if (upsertErr) throw new Error(`Failed to init wallet: ${upsertErr.message}`);
+
+  // Prefer atomic RPC if present
+  const { error: rpcErr } = await supabase.rpc("wallet_atomic_increment", {
+    p_user_id: userId,
+    p_field: "credit_balance",
+    p_amount: creditsToAdd,
+  });
+  if (!rpcErr) return;
+
+  // CAS fallback (best effort)
+  for (let attempt = 0; attempt < 2; attempt++) {
+    const { data: w, error: readErr } = await supabase
+      .from("wallets")
+      .select("credit_balance")
+      .eq("user_id", userId)
+      .maybeSingle();
+    if (readErr || !w) throw new Error(`Failed to read wallet: ${readErr?.message || "not found"}`);
+
+    const current = Number((w as any).credit_balance ?? 0);
+    const next = current + creditsToAdd;
+
+    const { data: updated, error: updateErr } = await supabase
+      .from("wallets")
+      .update({ credit_balance: next, updated_at: new Date().toISOString() })
+      .eq("user_id", userId)
+      .eq("credit_balance", current)
+      .select("credit_balance");
+
+    if (updateErr) throw new Error(`Failed to update wallet: ${updateErr.message}`);
+    if (updated && updated.length === 1) return;
+  }
+
+  throw new Error("Failed to refund credits due to contention. Please retry.");
+}
+
 // ---------------------------------------------
 // Main
 // ---------------------------------------------
 serve(async (req) => {
   const corsHeaders = getCorsHeaders(req);
 
   if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
 
   try {
-    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
-    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
-    const dailyApiKey = Deno.env.get("DAILY_API_KEY") ?? null;
+    if (req.method !== "POST") {
+      return new Response(JSON.stringify({ error: "Method not allowed" }), {
+        status: 405,
+        headers: { ...corsHeaders, "Content-Type": "application/json" },
+      });
+    }
+
+    const supabaseUrl = getEnv("SUPABASE_URL");
+    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
+    const dailyApiKey = Deno.env.get("DAILY_API_KEY") ?? null;
+
+    if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase environment variables");
 
     const supabase = createClient(supabaseUrl, serviceKey);
 
-    // Auth
-    const authHeader = req.headers.get("Authorization");
-    if (!authHeader) throw new Error("Missing authorization header");
-
-    const jwt = authHeader.replace("Bearer ", "");
-    const { data: auth, error: authError } = await supabase.auth.getUser(jwt);
-    if (authError || !auth?.user) throw new Error("Unauthorized");
-    const user = auth.user;
+    // Auth (single source of truth)
+    const { user, error: authError } = await verifyAuth(req);
+    if (authError || !user) throw new Error("Unauthorized");
 
     // Input
     const body = await req.json();
     const videoDateId = validateUUID(body.videoDateId, "videoDateId");
     const reason = validateReason(body.reason);
@@ -139,71 +196,88 @@
     const refundLabel =
       reason === "no_show" ? "no_show" : reason === "technical" ? "technical" : "user_cancelled";
 
     let creditsRefunded = 0;
 
     const { data: refundRpc, error: refundRpcErr } = await supabase.rpc("refund_video_date_reservation", {
       p_video_date_id: videoDateId,
       p_reason: refundLabel,
     });
 
     if (!refundRpcErr && refundRpc?.success) {
       creditsRefunded = Number(refundRpc.credits_refunded || 0);
     } else {
-      // ---------------------------------------------
-      // Fallback (if RPC not installed yet):
-      // Refund ALL active reservations safely (no .single())
-      // ---------------------------------------------
-      const { data: reservations, error: resErr } = await supabase
-        .from("credit_reservations")
-        .select("id,user_id,credits_amount")
-        .eq("video_date_id", videoDateId)
-        .eq("status", "active");
-
-      if (resErr) throw new Error(`Failed to load reservations: ${resErr.message}`);
-
-      for (const r of reservations || []) {
-        // increment wallet with an atomic SQL update pattern (no read-modify-write)
-        // NOTE: Supabase JS can't do "credit_balance = credit_balance + X" directly
-        // without RPC, so we do a safe read+write per reservation as last resort.
-        // This is why the RPC above is strongly recommended.
-        const { data: wallet, error: wErr } = await supabase
-          .from("wallets")
-          .select("credit_balance")
-          .eq("user_id", r.user_id)
-          .single();
-
-        if (wErr) continue;
-
-        const newBal = Number(wallet?.credit_balance || 0) + Number(r.credits_amount || 0);
-
-        await supabase
-          .from("wallets")
-          .update({ credit_balance: newBal, updated_at: new Date().toISOString() })
-          .eq("user_id", r.user_id);
-
-        await supabase
-          .from("credit_reservations")
-          .update({ status: "released", released_at: new Date().toISOString() })
-          .eq("id", r.id);
-
-        creditsRefunded += Number(r.credits_amount || 0);
-      }
-
-      if (creditsRefunded > 0) {
-        await supabase.from("transactions").insert({
-          user_id: videoDate.seeker_id,
-          transaction_type: "video_date_refund",
-          credits_amount: creditsRefunded,
-          description: `Credits refunded: ${refundLabel}`,
-          status: "completed",
-        });
-      }
-
-      // Ensure status cancelled even if refund fallback used
-      await supabase
-        .from("video_dates")
-        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
-        .eq("id", videoDateId);
+      // Safe fallback:
+      // Claim active reservations in ONE update (prevents double-refunds under concurrency),
+      // then refund wallets for the claimed rows.
+      console.warn("[cancel-video-date] refund_video_date_reservation RPC failed; using safe fallback", {
+        error: refundRpcErr?.message,
+      });
+
+      const releasedAt = new Date().toISOString();
+      const { data: claimed, error: claimErr } = await supabase
+        .from("credit_reservations")
+        .update({ status: "released", released_at: releasedAt })
+        .eq("video_date_id", videoDateId)
+        .eq("status", "active")
+        .select("id,user_id,credits_amount");
+
+      if (claimErr) throw new Error(`Failed to release reservations: ${claimErr.message}`);
+
+      for (const r of claimed || []) {
+        const amt = Number((r as any).credits_amount || 0);
+        const uid = (r as any).user_id;
+        if (!uid || amt <= 0) continue;
+
+        await refundWalletCreditsSafe(supabase, uid, amt);
+        creditsRefunded += amt;
+
+        // Best-effort transaction audit per refunded user
+        const { error: txErr } = await supabase.from("transactions").insert({
+          user_id: uid,
+          transaction_type: "video_date_refund",
+          credits_amount: amt,
+          description: `Credits refunded: ${refundLabel} video_date_id=${videoDateId}`,
+          status: "completed",
+        });
+        if (txErr) console.warn("[cancel-video-date] Failed to insert refund transaction", { error: txErr.message });
+      }
     }
+
+    // Ensure status cancelled ALWAYS (even if refund RPC succeeded)
+    const { error: cancelErr } = await supabase
+      .from("video_dates")
+      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
+      .eq("id", videoDateId);
+    if (cancelErr) console.warn("[cancel-video-date] Failed to mark cancelled", { error: cancelErr.message });
 
     // No-show email (best-effort)
     if (reason === "no_show") {
       const noShowUserId = isSeeker ? videoDate.earner_id : videoDate.seeker_id;
       const senderName = (await getProfileName(supabase, user.id)) || "Your date";
