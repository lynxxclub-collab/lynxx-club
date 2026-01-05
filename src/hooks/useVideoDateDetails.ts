import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VideoDateDetails {
  id: string;

  scheduled_duration: number;
  scheduled_start?: string;

  seeker_id: string;
  earner_id: string;

  status: string;

  call_type?: "video" | "audio";

  daily_room_url: string | null;
  daily_room_name: string | null;

  waiting_started_at: string | null; // ✅ needed for live grace countdown
  actual_start: string | null;       // ✅ set when both are present
  actual_end?: string | null;

  seeker_meeting_token: string | null;
  earner_meeting_token: string | null;

  other_person_name: string;
}

type LoadState = "loading" | "ready" | "error";

export function useVideoDateDetails(videoDateId?: string, userId?: string) {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [videoDate, setVideoDate] = useState<VideoDateDetails | null>(null);

  const isSeeker = useMemo(() => {
    if (!videoDate || !userId) return false;
    return videoDate.seeker_id === userId;
  }, [videoDate, userId]);

  const isEarner = useMemo(() => {
    if (!videoDate || !userId) return false;
    return videoDate.earner_id === userId;
  }, [videoDate, userId]);

  const myToken = useMemo(() => {
    if (!videoDate || !userId) return null;
    return isSeeker ? videoDate.seeker_meeting_token : videoDate.earner_meeting_token;
  }, [videoDate, userId, isSeeker]);

  const fetchAndEnrich = useCallback(async () => {
    if (!videoDateId || !userId) return;

    const { data: vd, error: vdErr } = await supabase
      .from("video_dates")
      .select(
        [
          "id",
          "scheduled_duration",
          "scheduled_start",
          "seeker_id",
          "earner_id",
          "status",
          "call_type",
          "daily_room_url",
          "daily_room_name",
          "waiting_started_at",
          "actual_start",
          "actual_end",
          "seeker_meeting_token",
          "earner_meeting_token",
        ].join(","),
      )
      .eq("id", videoDateId)
      .single();

    if (vdErr || !vd) throw new Error("Video date not found");

    const isParticipant = userId === vd.seeker_id || userId === vd.earner_id;
    if (!isParticipant) throw new Error("Unauthorized");

    const otherId = userId === vd.seeker_id ? vd.earner_id : vd.seeker_id;

    const { data: other, error: otherErr } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", otherId)
      .single();

    if (otherErr) {
      // don't hard fail if profile fetch fails
      console.warn("[useVideoDateDetails] profile fetch failed:", otherErr);
    }

    setVideoDate({
      ...(vd as any),
      other_person_name: other?.name || "User",
    } as VideoDateDetails);
  }, [videoDateId, userId]);

  /**
   * ✅ ONLY SEEKER SHOULD ENSURE ROOM/TOKENS
   * - Do NOT start waiting timer here
   * - Just ensure we have daily_room_url + both tokens
   */
  const ensureRoomAndTokens = useCallback(async () => {
    if (!videoDateId || !userId) return;

    // We need current row to know role
    const { data: vd } = await supabase
      .from("video_dates")
      .select("seeker_id,earner_id,daily_room_url,seeker_meeting_token,earner_meeting_token,call_type")
      .eq("id", videoDateId)
      .single();

    if (!vd) throw new Error("Video date not found");

    const seeker = vd.seeker_id === userId;
    const earner = vd.earner_id === userId;

    if (!seeker && !earner) throw new Error("Unauthorized");

    const hasRoom = !!vd.daily_room_url;
    const hasTokens = !!vd.seeker_meeting_token && !!vd.earner_meeting_token;

    // Earner must NEVER create anything — just return.
    if (earner) return;

    // Seeker: only call function if missing
    if (hasRoom && hasTokens) return;

    const { data: sessionRes } = await supabase.auth.getSession();
    const token = sessionRes.session?.access_token;
    if (!token) throw new Error("Session expired");

    const result = await supabase.functions.invoke("create-daily-room", {
      body: { videoDateId, callType: vd.call_type || "video" },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.error) {
      throw new Error(result.error.message || "Failed to prepare room");
    }

    // Reload the row (source of truth)
    await fetchAndEnrich();
  }, [videoDateId, userId, fetchAndEnrich]);

  useEffect(() => {
    if (!videoDateId || !userId) {
      setState("error");
      setError("Missing videoDateId or user");
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        setState("loading");
        setError(null);

        await fetchAndEnrich();

        // ✅ Only seeker will do anything; earner just waits
        await ensureRoomAndTokens();

        if (mounted) setState("ready");
      } catch (e: any) {
        console.error(e);
        if (mounted) {
          setState("error");
          setError(e.message || "Failed to load video date");
        }
      }
    };

    init();

    // realtime subscription keeps both users synced
    const channel = supabase
      .channel(`video_date_${videoDateId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_dates", filter: `id=eq.${videoDateId}` },
        () => fetchAndEnrich(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [videoDateId, userId, fetchAndEnrich, ensureRoomAndTokens]);

  return {
    state,
    error,
    videoDate,
    myToken,
    isSeeker,
    isEarner,
    refresh: fetchAndEnrich,
    ensureRoomAndTokens,
  };
}