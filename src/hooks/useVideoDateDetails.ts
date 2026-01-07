import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VideoDateData {
  id: string;
  seeker_id: string;
  earner_id: string;
  status: string;
  daily_room_url: string | null;
  seeker_meeting_token: string | null;
  earner_meeting_token: string | null;
  scheduled_start: string;
  scheduled_duration: number;
  earner_amount: number;
  call_type: string;
  actual_start: string | null;
  actual_end: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  conversation_id: string | null;
  created_at: string;
}

export function useVideoDateDetails(
  videoDateId: string | undefined, 
  userId: string | undefined
) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [videoDate, setVideoDate] = useState<VideoDateData | null>(null);

  useEffect(() => {
    // Handle undefined videoDateId or userId
    if (!videoDateId || !userId) {
      setState("error");
      setError("Missing video date ID or user ID");
      return;
    }

    let mounted = true;

    async function load() {
      try {
        setState("loading");
        
        if (!videoDateId) {
          throw new Error("Missing video date ID");
        }
        
        const { data, error: fetchError } = await supabase
          .from("video_dates")
          .select("*")
          .eq("id", videoDateId)
          .single();

        if (!mounted) return;

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (!data) {
          throw new Error("Video date not found");
        }

        // Map the data to ensure all required fields exist
        const mappedData: VideoDateData = {
          id: data.id,
          seeker_id: data.seeker_id,
          earner_id: data.earner_id,
          status: data.status,
          daily_room_url: data.daily_room_url ?? null,
          seeker_meeting_token: data.seeker_meeting_token ?? null,
          earner_meeting_token: data.earner_meeting_token ?? null,
          scheduled_start: data.scheduled_start,
          scheduled_duration: data.scheduled_duration,
          earner_amount: data.earner_amount ?? 0,
          call_type: data.call_type ?? "video",
          actual_start: data.actual_start ?? null,
          actual_end: data.actual_end ?? null,
          cancelled_at: data.cancelled_at ?? null,
          completed_at: data.completed_at ?? null,
          conversation_id: data.conversation_id ?? null,
          created_at: data.created_at,
        };

        setVideoDate(mappedData);
        setState("ready");
        
      } catch (e: any) {
        if (!mounted) return;
        console.error("useVideoDateDetails error:", e);
        setError(e.message || "Failed to load video date");
        setState("error");
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [videoDateId, userId]);

  // Derived values
  const isSeeker = useMemo(() => {
    return videoDate?.seeker_id === userId;
  }, [videoDate, userId]);

  const isEarner = useMemo(() => {
    return videoDate?.earner_id === userId;
  }, [videoDate, userId]);

  const myToken = useMemo(() => {
    if (!videoDate) return null;
    return isSeeker ? videoDate.seeker_meeting_token : videoDate.earner_meeting_token;
  }, [videoDate, isSeeker]);

  return { 
    state, 
    error, 
    videoDate, 
    myToken, 
    isSeeker, 
    isEarner 
  };
}
