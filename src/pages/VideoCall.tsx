import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, PhoneOff, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVideoDateDetails } from "@/hooks/useVideoDateDetails";

const NO_SHOW_SECONDS = 5 * 60;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function VideoCall() {
  const { videoDateId } = useParams<{ videoDateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { state, error, videoDate, myToken } = useVideoDateDetails(videoDateId, user?.id);

  const frameRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [participantCount, setParticipantCount] = useState(0);
  const [status, setStatus] = useState<"loading" | "waiting" | "active" | "ending">("loading");
  const [noShowRemaining, setNoShowRemaining] = useState(NO_SHOW_SECONDS);

  const waitingStartedAt = videoDate?.waiting_started_at ? new Date(videoDate.waiting_started_at).getTime() : null;

  // realtime derived countdown
  useEffect(() => {
    if (!waitingStartedAt) return;
    if (status === "active" || status === "ending") return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - waitingStartedAt) / 1000);
      const remaining = Math.max(0, NO_SHOW_SECONDS - elapsed);
      setNoShowRemaining(remaining);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [waitingStartedAt, status]);

  const cancelAsNoShow = useCallback(async () => {
    if (!videoDateId) return;

    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      if (!token) throw new Error("Session expired");

      await supabase.functions.invoke("cancel-video-date", {
        body: { videoDateId, reason: "no_show" },
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("No-show. Credits refunded.");
      navigate("/video-dates");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to cancel no-show");
      navigate("/video-dates");
    }
  }, [videoDateId, navigate]);

  // If countdown hits 0 and still not active, cancel
  useEffect(() => {
    if (status === "active" || status === "ending") return;
    if (!waitingStartedAt) return;
    if (noShowRemaining > 0) return;

    // Only cancel if we never got both participants
    if (participantCount <= 1) {
      cancelAsNoShow();
    }
  }, [noShowRemaining, participantCount, status, waitingStartedAt, cancelAsNoShow]);

  const joinCall = useCallback(async () => {
    if (!videoDate || !myToken || !containerRef.current) return;
    if (!videoDate.daily_room_url) return;

    // prevent duplicate
    if (frameRef.current) return;

    setStatus("loading");

    // get display name
    const { data: myProfile } = await supabase.from("profiles").select("name").eq("id", user!.id).single();
    const userName = myProfile?.name || "User";

    const frame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: { position: "absolute", width: "100%", height: "100%", border: "0" },
      showLeaveButton: true,
      showFullscreenButton: true,
    });

    frameRef.current = frame;

    frame.on("joined-meeting", () => {
      const participants = frameRef.current?.participants() || {};
      const count = Object.keys(participants).length;
      setParticipantCount(count);

      if (count > 1) {
        setStatus("active");
      } else {
        setStatus("waiting");
      }
    });

    frame.on("participant-joined", () => {
      const participants = frameRef.current?.participants() || {};
      const count = Object.keys(participants).length;
      setParticipantCount(count);
      if (count > 1) setStatus("active");

      // Track actual_start when BOTH are present (first moment)
      if (count > 1 && videoDateId) {
        supabase.from("video_dates").update({ actual_start: new Date().toISOString(), status: "in_progress" } as any).eq("id", videoDateId);
      }
    });

    frame.on("participant-left", () => {
      const participants = frameRef.current?.participants() || {};
      const count = Object.keys(participants).length;
      setParticipantCount(count);
      // do not auto-cancel here; just show waiting state
      if (count <= 1) setStatus("waiting");
    });

    frame.on("error", (e: any) => {
      console.error("Daily error:", e);
      toast.error("Video call error. Try again.");
      navigate("/video-dates");
    });

    await frame.join({
      url: videoDate.daily_room_url,
      token: myToken,
      userName,
      startVideoOff: false,
      startAudioOff: false,
    });

    // after join, waiting clock is already set by mark-video-date-waiting
    setStatus("waiting");
  }, [videoDate, myToken, user, videoDateId, navigate]);

  // Start the join once everything is ready
  useEffect(() => {
    if (!user) {
      navigate("/auth?mode=signup");
      return;
    }
    if (state === "error") {
      toast.error(error || "Failed to load call");
      navigate("/video-dates");
      return;
    }
    if (state !== "ready") return;
    if (!videoDate?.daily_room_url || !myToken) return;

    joinCall();

    return () => {
      try {
        frameRef.current?.leave();
        frameRef.current?.destroy();
      } catch {}
      frameRef.current = null;
    };
  }, [state, error, navigate, user, videoDate?.daily_room_url, myToken, joinCall, videoDate]);

  const endCall = useCallback(async () => {
    setStatus("ending");
    try {
      await frameRef.current?.leave();
      frameRef.current?.destroy();
    } catch {}
    frameRef.current = null;

    // go to rating flow or list
    navigate(`/rate/${videoDateId}`);
  }, [navigate, videoDateId]);

  const isLoading = state === "loading" || status === "loading";

  return (
    <div className="fixed inset-0 bg-[#0a0a0f]">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Overlay UI */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-rose-400 mb-3" />
            <p className="text-white/70">Connecting…</p>
          </div>
        </div>
      )}

      {state === "ready" && status !== "active" && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/90 backdrop-blur-sm">
          <div className="text-center px-6">
            <div className="flex items-center justify-center gap-2 text-white mb-2">
              <Users className="w-5 h-5" />
              <span className="font-semibold">Waiting for the other person…</span>
            </div>

            <div className={cn("text-3xl font-mono tabular-nums", noShowRemaining <= 60 ? "text-rose-400 animate-pulse" : "text-white")}>
              <Clock className="inline w-5 h-5 mr-2 opacity-70" />
              {formatTime(noShowRemaining)}
            </div>

            <p className="text-white/60 mt-2 text-sm">
              If they don’t join in 5 minutes, the call is canceled and the seeker is refunded.
            </p>

            <button
              onClick={endCall}
              className="mt-6 inline-flex items-center justify-center px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Leave
            </button>
          </div>
        </div>
      )}

      {/* Minimal bottom controls */}
      {!isLoading && (
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center">
          <button
            onClick={endCall}
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white"
          >
            <PhoneOff className="w-4 h-4 mr-2" />
            End Call
          </button>
        </div>
      )}
    </div>
  );
}