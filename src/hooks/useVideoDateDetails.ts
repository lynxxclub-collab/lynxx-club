// src/hooks/useVideoDateDetails.ts
import { useState, useEffect } from "react";
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
  seeker_joined_at: string | null;
  earner_joined_at: string | null;
}

export function useVideoDateDetails(videoDateId: string | undefined, userId: string | undefined) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [videoDate, setVideoDate] = useState<VideoDateData | null>(null);

  useEffect(() => {
    if (!videoDateId || !userId) {
      setState("error");
      setError("Missing video date ID or user ID");
      return;
    }

    async function load() {
      try {
        const { data, error: fetchError } = await supabase
          .from("video_dates")
          .select("*")
          .eq("id", videoDateId)
          .single();

        if (fetchError) throw fetchError;
        
        setVideoDate(data);
        setState("ready");
      } catch (e: any) {
        setError(e.message || "Failed to load");
        setState("error");
      }
    }

    load();
  }, [videoDateId, userId]);

  const isSeeker = videoDate?.seeker_id === userId;
  const myToken = isSeeker 
    ? videoDate?.seeker_meeting_token 
    : videoDate?.earner_meeting_token;

  return { state, error, videoDate, myToken, isSeeker };
}
