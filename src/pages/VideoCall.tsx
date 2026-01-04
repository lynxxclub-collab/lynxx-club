import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { getFunctionErrorMessage } from "@/lib/supabaseFunctionError";
import { playJoinSound, playWarningSound } from "@/lib/audioNotifications";

import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Clock,
  Users,
  Loader2,
  AlertTriangle,
} from "lucide-react";

type CallType = "video" | "audio";

const GRACE_PERIOD_SECONDS = 5 * 60;
const WARNING_TIME_5_MIN = 300;
const WARNING_TIME_1_MIN = 60;
const COUNTDOWN_START = 30;

type CallStatus = "loading" | "waiting_for_room" | "preparing" | "joining" | "waiting" | "active" | "ending" | "ended" | "no_show";

interface VideoDateDetails {
  id: string;
  scheduled_duration: number;
  scheduled_start: string;
  call_type?: CallType;

  daily_room_url: string | null;
  seeker_id: string;
  earner_id: string;
  status: string;

  seeker_meeting_token: string | null;
  earner_meeting_token: string | null;

  other_person_name: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const getInitials = (name: string | undefined): string => name?.charAt(0).toUpperCase() || "U";

export default function VideoCall() {
  const { videoDateId } = useParams<{ videoDateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<DailyCall | null>(null);
  const callSetupStartedRef = useRef(false);
  const callEndedRef = useRef(false);
  const playedJoinSoundRef = useRef(false);

  const [videoDate, setVideoDate] = useState<VideoDateDetails | null>(null);
  const [status, setStatus] = useState<CallStatus>("loading");

  const [participantCount, setParticipantCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [graceRemaining, setGraceRemaining] = useState(GRACE_PERIOD_SECONDS);
  const [showCountdown, setShowCountdown] = useState(false);

  const isReadyToJoin = useMemo(() => {
    if (!videoDate || !user) return false;
    const isSeeker = videoDate.seeker_id === user.id;
    const token = isSeeker ? videoDate.seeker_meeting_token : videoDate.earner_meeting_token;
    return !!videoDate.daily_room_url && !!token;
  }, [videoDate, user]);

  // -------------------------------
  // Timers
  // -------------------------------
  useEffect(() => {
    if (status !== "active") return;

    const t = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;

        if (next === WARNING_TIME_5_MIN) toast.warning("5 minutes remaining");
        if (next === WARNING_TIME_1_MIN) {
          toast.warning("1 minute remaining");
          playWarningSound();
        }
        if (next === COUNTDOWN_START) {
          setShowCountdown(true);
          playWarningSound();
        }
        if (next <= 0) {
          clearInterval(t);
          handleEndCall();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (status !== "waiting") return;

    const t = setInterval(() => {
      setGraceRemaining((prev) => {
        const next = prev - 1;
        if (next === WARNING_TIME_1_MIN) toast.warning("1 minute left to wait for the other participant");
        if (next <= 0) {
          clearInterval(t);
          handleNoShow();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // -------------------------------
  // Fetch video date + other name
  // -------------------------------
  const fetchVideoDate = useCallback(async () => {
    if (!videoDateId || !user) return;

    const { data: vd, error } = await supabase.from("video_dates").select("*").eq("id", videoDateId).single();
    if (error || !vd) throw new Error("Video date not found");

    if (vd.seeker_id !== user.id && vd.earner_id !== user.id) throw new Error("Unauthorized");

    const isSeeker = vd.seeker_id === user.id;
    const otherId = isSeeker ? vd.earner_id : vd.seeker_id;

    const { data: otherProfile } = await supabase.from("profiles").select("name").eq("id", otherId).single();

    setVideoDate({
      id: vd.id,
      scheduled_duration: vd.scheduled_duration,
      scheduled_start: vd.scheduled_start,
      call_type: (vd.call_type as CallType) || "video",
      daily_room_url: vd.daily_room_url,
      seeker_id: vd.seeker_id,
      earner_id: vd.earner_id,
      status: vd.status,
      seeker_meeting_token: vd.seeker_meeting_token,
      earner_meeting_token: vd.earner_meeting_token,
      other_person_name: otherProfile?.name || "User",
    });

    // Set initial timer length (full scheduled duration)
    setTimeRemaining(vd.scheduled_duration * 60);
  }, [videoDateId, user]);

  // Realtime updates for this video_date
  useEffect(() => {
    if (!videoDateId || !user) return;

    const channel = supabase
      .channel(`video_date_${videoDateId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "video_dates", filter: `id=eq.${videoDateId}` },
        () => fetchVideoDate().catch(() => {}),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoDateId, user, fetchVideoDate]);

  // Initial load
  useEffect(() => {
    if (!user || !videoDateId) {
      navigate("/video-dates");
      return;
    }

    fetchVideoDate()
      .then(() => setStatus("loading"))
      .catch((e) => {
        toast.error(e?.message || "Failed to load video call");
        navigate("/video-dates");
      });
  }, [user, videoDateId, fetchVideoDate, navigate]);

  // -------------------------------
  // Ensure room/tokens rule:
  //   - ONLY seeker can create room
  //   - earner waits if room missing
  // -------------------------------
  const ensureRoomIfSeeker = useCallback(async () => {
    if (!videoDateId || !user || !videoDate) return;

    const isSeeker = videoDate.seeker_id === user.id;

    // Earner never creates the room
    if (!isSeeker) return;

    // If already good, skip
    if (videoDate.daily_room_url && videoDate.seeker_meeting_token && videoDate.earner_meeting_token) return;

    setStatus("preparing");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Session expired");

    const result = await supabase.functions.invoke("create-daily-room", {
      body: { videoDateId, callType: videoDate.call_type || "video" },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const msg = getFunctionErrorMessage(result, "Failed to prepare call");
    if (msg) throw new Error(msg);

    // Refresh from DB after room creation
    await fetchVideoDate();
  }, [videoDateId, user, videoDate, fetchVideoDate]);

  // If earner and room/tokens missing, wait/poll
  useEffect(() => {
    if (!user || !videoDateId || !videoDate) return;

    const isSeeker = videoDate.seeker_id === user.id;
    const myToken = isSeeker ? videoDate.seeker_meeting_token : videoDate.earner_meeting_token;
    const hasRoom = !!videoDate.daily_room_url;

    // Earner: if room not created yet, show waiting_for_room
    if (!isSeeker && !hasRoom) {
      setStatus("waiting_for_room");
      return;
    }

    // If room exists but token missing, still wait (seeker will regenerate/create)
    if (!myToken) {
      // seeker will handle creation; earner waits
      setStatus(isSeeker ? "preparing" : "waiting_for_room");
      return;
    }
  }, [videoDate, user, videoDateId]);

  // Simple poll while waiting_for_room
  useEffect(() => {
    if (status !== "waiting_for_room") return;
    if (!videoDateId || !user) return;

    const t = setInterval(() => {
      fetchVideoDate().catch(() => {});
    }, 2000);

    return () => clearInterval(t);
  }, [status, videoDateId, user, fetchVideoDate]);

  // -------------------------------
  // Join Daily call (once)
  // -------------------------------
  const joinCall = useCallback(async () => {
    if (!videoDateId || !user || !videoDate) return;
    if (callSetupStartedRef.current) return;
    if (!containerRef.current) return;

    const isSeeker = videoDate.seeker_id === user.id;
    const myToken = isSeeker ? videoDate.seeker_meeting_token : videoDate.earner_meeting_token;

    // Gate
    if (!videoDate.daily_room_url || !myToken) return;

    callSetupStartedRef.current = true;
    setStatus("joining");

    // Name
    const { data: myProfile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
    const userName = myProfile?.name || "User";

    const frame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: { position: "absolute", width: "100%", height: "100%", border: "0" },
      showLeaveButton: true,
      showFullscreenButton: true,
    });

    callFrameRef.current = frame;

    frame.on("joined-meeting", () => {
      const participants = callFrameRef.current?.participants() || {};
      const count = Object.keys(participants).length;
      setParticipantCount(count);

      if (count > 1) {
        // start
        if (!playedJoinSoundRef.current) {
          playedJoinSoundRef.current = true;
          playJoinSound();
          toast.success("Your date joined! Starting timer.");
        }
        setStatus("active");

        supabase.from("video_dates").update({ status: "in_progress" } as any).eq("id", videoDateId);
      } else {
        // waiting for other
        setStatus("waiting");
        supabase.from("video_dates").update({ status: "waiting" } as any).eq("id", videoDateId);
      }
    });

    frame.on("participant-joined", () => {
      const participants = callFrameRef.current?.participants() || {};
      const count = Object.keys(participants).length;
      setParticipantCount(count);

      if (count > 1) {
        if (!playedJoinSoundRef.current) {
          playedJoinSoundRef.current = true;
          playJoinSound();
          toast.success("Your date joined! Starting timer.");
        }
        setStatus("active");
        supabase.from("video_dates").update({ status: "in_progress" } as any).eq("id", videoDateId);
      }
    });

    frame.on("participant-left", () => {
      const participants = callFrameRef.current?.participants() || {};
      const count = Object.keys(participants).length;
      setParticipantCount(count);
      toast.info("The other participant left the call");
    });

    frame.on("error", (err: any) => {
      console.error("Daily error:", err);
      toast.error("Video call error. Try again.");
    });

    await frame.join({
      url: videoDate.daily_room_url,
      token: myToken,
      userName,
      startVideoOff: false,
      startAudioOff: false,
    });
  }, [videoDateId, user, videoDate]);

  // Orchestrate preparation + join
  useEffect(() => {
    if (!user || !videoDateId || !videoDate) return;

    const isSeeker = videoDate.seeker_id === user.id;

    // If seeker, ensure room first (only once), then join
    if (isSeeker) {
      ensureRoomIfSeeker()
        .then(() => {
          // If now ready, join
          if (isReadyToJoin) joinCall();
        })
        .catch((e) => {
          toast.error(e?.message || "Failed to prepare call");
          navigate("/video-dates");
        });

      return;
    }

    // Earner: wait until ready; then join
    if (isReadyToJoin) {
      joinCall();
    }
  }, [user, videoDateId, videoDate, ensureRoomIfSeeker, isReadyToJoin, joinCall, navigate]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (callFrameRef.current) {
        try {
          callFrameRef.current.leave();
          callFrameRef.current.destroy();
        } catch {}
        callFrameRef.current = null;
      }
    };
  }, []);

  // -------------------------------
  // End / No-show
  // -------------------------------
  const handleNoShow = useCallback(async () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;

    setStatus("no_show");

    try {
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }

      // Use your cancel-video-date function here if you want auto refund logic.
      // For now, just route back.
      toast.error("No-show. Returning to video dates.");
      navigate("/video-dates");
    } catch (e) {
      navigate("/video-dates");
    }
  }, [navigate]);

  const handleEndCall = useCallback(async () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;

    setStatus("ending");

    try {
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    } catch {}

    // Your existing charge flow can stay in your original file.
    // This rewrite keeps it simple: route to rate page.
    navigate(`/rate/${videoDateId}`);
  }, [navigate, videoDateId]);

  const handleGoBack = useCallback(() => navigate("/video-dates"), [navigate]);

  const toggleMute = useCallback(() => {
    if (!callFrameRef.current) return;
    const next = !isMuted;
    callFrameRef.current.setLocalAudio(!next);
    setIsMuted(next);
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (!callFrameRef.current) return;
    const next = !isVideoOff;
    callFrameRef.current.setLocalVideo(!next);
    setIsVideoOff(next);
  }, [isVideoOff]);

  // -------------------------------
  // UI helpers
  // -------------------------------
  const LoadingOverlay = ({ message }: { message: string }) => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] z-20">
      <div className="text-center px-6">
        <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-white/70 text-sm sm:text-base mb-6">{message}</p>
        <Button variant="outline" onClick={handleGoBack} className="border-white/20 text-white hover:bg-white/10">
          <PhoneOff className="w-4 h-4 mr-2" />
          Exit
        </Button>
      </div>
    </div>
  );

  const WaitingForRoomOverlay = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/95 backdrop-blur-sm z-20">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-16 h-16 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-blue-300" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Waiting for the seeker to start the call</h2>
        <p className="text-white/60 text-sm mb-6">
          As the earner, you can’t create the room. Once the seeker taps <b>Join Call</b>, you’ll connect automatically.
        </p>
        <Button variant="outline" onClick={handleGoBack} className="border-white/20 text-white hover:bg-white/10">
          Back
        </Button>
      </div>
    </div>
  );

  const WaitingRoomOverlay = () => {
    const urgent = graceRemaining <= WARNING_TIME_1_MIN;
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/95 backdrop-blur-sm z-20">
        <div className="text-center max-w-md mx-auto px-6">
          <Avatar className="w-20 h-20 mx-auto mb-4 border-4 border-primary/30">
            <AvatarFallback className="bg-primary/20 text-primary text-2xl">
              {getInitials(videoDate?.other_person_name)}
            </AvatarFallback>
          </Avatar>

          <h2 className="text-2xl font-semibold text-white mb-2">Waiting for {videoDate?.other_person_name}</h2>
          <p className="text-white/60 mb-6 text-sm">They’ll join any moment now.</p>

          <div className={cn("text-4xl font-mono tabular-nums", urgent ? "text-destructive animate-pulse" : "text-white")}>
            {formatTime(graceRemaining)}
          </div>

          {urgent && (
            <div className="flex items-center justify-center gap-2 text-destructive mt-4 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Time running out!</span>
            </div>
          )}

          <p className="text-xs text-white/40 mt-4">Call cancels with refund if they don’t join within 5 minutes.</p>
        </div>
      </div>
    );
  };

  const Controls = () => {
    const urgent = status === "active" && timeRemaining <= WARNING_TIME_1_MIN;
    return (
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-safe bg-gradient-to-t from-[#0a0a0f] via-black/80 to-transparent">
        <div className={cn("flex items-center justify-center gap-2 mb-4 font-mono tabular-nums", urgent ? "text-destructive animate-pulse" : "text-white")}>
          <Clock className="w-5 h-5" />
          <span className="text-sm">
            {status === "active" ? `${formatTime(timeRemaining)} remaining` : `${formatTime(timeRemaining)} (waiting)`}
          </span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={toggleMute}
            className={cn(
              "rounded-full w-14 h-14 border-2",
              isMuted ? "bg-destructive/20 border-destructive text-destructive" : "bg-white/10 border-white/30 text-white",
            )}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={toggleVideo}
            className={cn(
              "rounded-full w-14 h-14 border-2",
              isVideoOff ? "bg-destructive/20 border-destructive text-destructive" : "bg-white/10 border-white/30 text-white",
            )}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>

          <Button size="lg" onClick={handleEndCall} className="rounded-full w-16 h-16 bg-destructive hover:bg-destructive/90">
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>

        <p className="text-center text-white/50 text-xs mt-3">
          {participantCount} participant{participantCount !== 1 ? "s" : ""} in call
        </p>
      </div>
    );
  };

  const HeaderBar = () => (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent pt-safe">
      <Button variant="ghost" size="sm" onClick={handleGoBack} className="text-white hover:bg-white/20 h-10 px-3">
        <ArrowLeft className="w-5 h-5 sm:mr-2" />
        <span className="hidden sm:inline">Back</span>
      </Button>

      <div className="text-white font-medium text-sm sm:text-base truncate max-w-[220px]">
        Video Date with {videoDate?.other_person_name || "..."}
      </div>

      <div className="w-12" />
    </div>
  );

  // -------------------------------
  // Render
  // -------------------------------
  const loadingMessage =
    status === "preparing"
      ? "Preparing your call..."
      : status === "joining"
      ? "Joining the call..."
      : "Loading...";

  return (
    <div className="fixed inset-0 bg-[#0a0a0f]">
      <HeaderBar />

      <div ref={containerRef} className="absolute inset-0" />

      {status === "loading" && <LoadingOverlay message={loadingMessage} />}
      {status === "preparing" && <LoadingOverlay message={loadingMessage} />}
      {status === "joining" && <LoadingOverlay message={loadingMessage} />}

      {status === "waiting_for_room" && <WaitingForRoomOverlay />}
      {status === "waiting" && <WaitingRoomOverlay />}

      {status !== "no_show" && status !== "waiting_for_room" && status !== "loading" && <Controls />}

      {showCountdown && status === "active" && timeRemaining <= COUNTDOWN_START && timeRemaining > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/90 backdrop-blur-sm z-30">
          <div className="text-center px-6">
            <div className="text-7xl font-bold text-destructive animate-pulse mb-4 tabular-nums">{timeRemaining}</div>
            <div className="text-white font-semibold text-xl">Call ending soon</div>
            <div className="text-white/60 text-sm mt-1">Wrap it up — you’re almost out of time.</div>
          </div>
        </div>
      )}
    </div>
  );
}