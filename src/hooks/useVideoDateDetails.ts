import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VideoDateDetails {
  id: string;
  scheduled_duration: number;
  scheduled_start?: string;
  daily_room_url: string | null;
  daily_room_name: string | null;
  seeker_id: string;
  earner_id: string;
  status: string;
  waiting_started_at: string | null;
  actual_start: string | null;
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

  const myToken = useMemo(() => {
    if (!videoDate || !userId) return null;
    return isSeeker ? videoDate.seeker_meeting_token : videoDate.earner_meeting_token;
  }, [videoDate, userId, isSeeker]);

  const fetchAndEnrich = useCallback(async () => {
    if (!videoDateId || !userId) return;

    const { data: vd, error: vdErr } = await supabase
      .from("video_dates")
      .select("*")
      .eq("id", videoDateId)
      .single();

    if (vdErr || !vd) throw new Error("Video date not found");

    const isParticipant = (userId === vd.seeker_id) || (userId === vd.earner_id);
    if (!isParticipant) throw new Error("Unauthorized");

    const otherId = userId === vd.seeker_id ? vd.earner_id : vd.seeker_id;
    const { data: other } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", otherId)
      .single();

    setVideoDate({
      ...vd,
      other_person_name: other?.name || "User",
    } as VideoDateDetails);
  }, [videoDateId, userId]);

  const ensureRoomAndTokens = useCallback(async () => {
    if (!videoDateId) return;

    const { data: sessionRes } = await supabase.auth.getSession();
    const token = sessionRes.session?.access_token;
    if (!token) throw new Error("Session expired");

    // Create/ensure the shared room + tokens
    const result = await supabase.functions.invoke("create-daily-room", {
      body: { videoDateId },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.error) {
      throw new Error(result.error.message || "Failed to prepare room");
    }

    // Immediately mark waiting (first join starts the 5-min clock)
    await supabase.functions.invoke("mark-video-date-waiting", {
      body: { videoDateId },
      headers: { Authorization: `Bearer ${token}` },
    });

    // Reload the row (source of truth)
    await fetchAndEnrich();
  }, [videoDateId, fetchAndEnrich]);

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

        // If room/tokens missing, prepare them
        // (we use DB row after fetchAndEnrich by reading directly again)
        const { data: vd } = await supabase
          .from("video_dates")
          .select("daily_room_url,seeker_meeting_token,earner_meeting_token")
          .eq("id", videoDateId)
          .single();

        const hasRoom = !!vd?.daily_room_url;
        const hasTokens = !!vd?.seeker_meeting_token && !!vd?.earner_meeting_token;

        if (!hasRoom || !hasTokens) {
          await ensureRoomAndTokens();
        }

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
        { event: "UPDATE", schema: "public", table: "video_dates", filter: `id=eq.${videoDateId}` },
        () => fetchAndEnrich()
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
    refresh: fetchAndEnrich,
    ensureRoomAndTokens,
  };
}