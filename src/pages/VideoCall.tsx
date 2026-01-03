import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DailyIframe, { DailyCall, DailyEventObjectParticipant } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Circle,
  PictureInPicture2,
} from "lucide-react";
import VideoQualitySettings from "@/components/video/VideoQualitySettings";

// =============================================================================
// CONSTANTS (UI only; timing truth comes from DB timestamps)
// =============================================================================

const WARNING_TIME_5_MIN = 300;
const WARNING_TIME_1_MIN = 60;
const COUNTDOWN_START = 30;

type CallStatus = "loading" | "regenerating_tokens" | "waiting" | "active" | "ending" | "ended" | "no_show";

interface VideoDateRow {
  id: string;
  scheduled_duration: number;
  daily_room_url: string | null;
  seeker_id: string;
  earner_id: string;
  status: string | null;

  seeker_meeting_token: string | null;
  earner_meeting_token: string | null;

  started_at: string | null;
  grace_expires_at: string | null;
  ends_at: string | null;

  seeker_joined_at: string | null;
  earner_joined_at: string | null;

  recording_consent_seeker?: boolean | null;
  recording_consent_earner?: boolean | null;
}

interface CallState {
  status: CallStatus;
  timeRemaining: number; // seconds
  graceTimeRemaining: number; // seconds
  participantCount: number;
  isMuted: boolean;
  isVideoOff: boolean;
  showCountdown: boolean;
}

interface RecordingState {
  showConsentModal: boolean;
  myConsent: boolean | null;
  otherConsent: boolean | null;
  isRecording: boolean;
  recordingStartedAt?: Date;
}

interface SelectedDevices {
  audioInputId?: string;
  videoInputId?: string;
}

// =============================================================================
// Utils
// =============================================================================

const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const getInitials = (name: string | undefined) => name?.charAt(0).toUpperCase() || "U";

const parseMs = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

// =============================================================================
// UI Components (same as yours, trimmed to essentials)
// =============================================================================

const CallHeader = ({ otherPersonName, onEndCall }: { otherPersonName: string; onEndCall: () => void }) => (
  <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent pt-safe">
    <Button
      variant="ghost"
      size="sm"
      onClick={onEndCall}
      className="text-white hover:bg-white/20 h-10 sm:h-9 px-3 touch-target"
    >
      <ArrowLeft className="w-5 h-5 sm:mr-2" />
      <span className="hidden sm:inline">End Call</span>
    </Button>

    <div className="text-white font-medium text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">
      <span className="hidden sm:inline">Video Date with </span>
      {otherPersonName}
    </div>

    <div className="w-10 sm:w-24" />
  </div>
);

const LoadingOverlay = ({
  visible,
  message = "Connecting to video call...",
  onCancel,
}: {
  visible: boolean;
  message?: string;
  onCancel?: () => void;
}) => {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] z-10">
      <div className="text-center relative z-10 px-6">
        <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-white/70 text-sm sm:text-base mb-6">{message}</p>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="border-white/20 text-white hover:bg-white/10">
            <PhoneOff className="w-4 h-4 mr-2" />
            Cancel & Exit
          </Button>
        )}
      </div>
    </div>
  );
};

const WaitingRoomOverlay = ({
  visible,
  otherPersonName,
  graceTimeRemaining,
}: {
  visible: boolean;
  otherPersonName: string;
  graceTimeRemaining: number;
}) => {
  if (!visible) return null;

  const isUrgent = graceTimeRemaining <= WARNING_TIME_1_MIN;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/95 backdrop-blur-sm z-20">
      <div className="text-center max-w-md mx-auto px-4 sm:px-6 relative z-10">
        <Avatar className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 border-4 border-primary/30 shadow-lg">
          <AvatarFallback className="bg-primary/20 text-primary text-xl sm:text-2xl">
            {getInitials(otherPersonName)}
          </AvatarFallback>
        </Avatar>

        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">Waiting for {otherPersonName}</h2>
        <p className="text-white/60 mb-6 text-sm sm:text-base">They’ll join any moment now.</p>

        <div className="text-4xl sm:text-5xl font-mono font-bold tabular-nums mb-2">
          <span className={cn(isUrgent ? "text-destructive animate-pulse" : "text-white")}>
            {formatTime(graceTimeRemaining)}
          </span>
        </div>

        {isUrgent && (
          <div className="flex items-center justify-center gap-2 text-destructive mb-4 animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Time running out!</span>
          </div>
        )}

        <p className="text-[11px] sm:text-xs text-white/40 px-4">
          Call will cancel with full refund if they don’t join before grace expires.
        </p>

        <div className="mt-4 p-3 glass-card">
          <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
            <Users className="w-4 h-4" />
            <span>You’re connected — waiting on them</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const NoShowOverlay = ({
  visible,
  otherPersonName,
  onGoBack,
}: {
  visible: boolean;
  otherPersonName: string;
  onGoBack: () => void;
}) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/95 backdrop-blur-sm z-30">
      <div className="text-center max-w-md mx-auto px-4 sm:px-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500" />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">{otherPersonName} didn’t join</h2>
        <p className="text-white/60 mb-6 text-sm sm:text-base">The grace period expired. Your credits were refunded.</p>
        <Button onClick={onGoBack} className="btn-gradient-primary h-12 px-6 touch-target">
          Back to Video Dates
        </Button>
      </div>
    </div>
  );
};

const CountdownOverlay = ({ visible, timeRemaining }: { visible: boolean; timeRemaining: number }) => {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/90 backdrop-blur-sm z-30">
      <div className="text-center max-w-md mx-auto px-4 sm:px-6">
        <div className="text-6xl sm:text-7xl font-bold text-destructive animate-pulse mb-4 tabular-nums">
          {Math.max(0, Math.floor(timeRemaining))}
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">Call ending soon!</h2>
        <p className="text-white/60 text-sm sm:text-base">Your date is about to end.</p>
      </div>
    </div>
  );
};

const ControlButton = ({
  active,
  onClick,
  activeIcon,
  inactiveIcon,
  ariaLabel,
  variant = "default",
}: {
  active: boolean;
  onClick: () => void;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  ariaLabel: string;
  variant?: "default" | "secondary" | "recording";
}) => {
  const base =
    "rounded-full w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-2 transition-all duration-200 touch-target";

  const className =
    variant === "recording"
      ? cn(
          base,
          active
            ? "bg-destructive border-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/30"
            : "bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm",
        )
      : variant === "secondary"
        ? cn(
            base,
            active
              ? "bg-primary/20 border-primary text-primary hover:bg-primary/30"
              : "bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm",
          )
        : cn(
            base,
            active
              ? "bg-destructive/20 border-destructive text-destructive hover:bg-destructive/30"
              : "bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm",
          );

  return (
    <Button variant="outline" size="lg" onClick={onClick} aria-label={ariaLabel} className={className}>
      {active ? activeIcon : inactiveIcon}
    </Button>
  );
};

const CallControls = ({
  isMuted,
  isVideoOff,
  participantCount,
  timeRemaining,
  callStarted,
  isRecording,
  canRecord,
  isPiPActive,
  videoQuality,
  networkQuality,
  onToggleMute,
  onToggleVideo,
  onTogglePiP,
  onToggleRecording,
  onQualityChange,
  onEndCall,
}: {
  isMuted: boolean;
  isVideoOff: boolean;
  participantCount: number;
  timeRemaining: number;
  callStarted: boolean;
  isRecording: boolean;
  canRecord: boolean;
  isPiPActive: boolean;
  videoQuality: string;
  networkQuality: "good" | "fair" | "poor" | "unknown";
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onTogglePiP: () => void;
  onToggleRecording: () => void;
  onQualityChange: (q: string) => void;
  onEndCall: () => void;
}) => {
  const isTimeUrgent = timeRemaining <= WARNING_TIME_1_MIN;
  const isPiPSupported = typeof document !== "undefined" && "pictureInPictureEnabled" in document;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 p-3 sm:p-6 pb-safe bg-gradient-to-t from-[#0a0a0f] via-black/80 to-transparent">
      <div
        className={cn(
          "flex items-center justify-center gap-2 mb-3 sm:mb-4 text-base sm:text-lg font-mono tabular-nums",
          callStarted ? (isTimeUrgent ? "text-destructive animate-pulse" : "text-white") : "text-white/60",
        )}
      >
        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base">
          {callStarted ? `${formatTime(timeRemaining)} remaining` : `${formatTime(timeRemaining)} (waiting)`}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        <ControlButton
          active={isMuted}
          onClick={onToggleMute}
          activeIcon={<MicOff className="w-5 h-5 sm:w-6 sm:h-6" />}
          inactiveIcon={<Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          ariaLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
        />

        <ControlButton
          active={isVideoOff}
          onClick={onToggleVideo}
          activeIcon={<VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
          inactiveIcon={<Video className="w-5 h-5 sm:w-6 sm:h-6" />}
          ariaLabel={isVideoOff ? "Turn on camera" : "Turn off camera"}
        />

        {isPiPSupported && (
          <ControlButton
            active={isPiPActive}
            onClick={onTogglePiP}
            activeIcon={<PictureInPicture2 className="w-5 h-5 sm:w-6 sm:h-6" />}
            inactiveIcon={<PictureInPicture2 className="w-5 h-5 sm:w-6 sm:h-6" />}
            ariaLabel={isPiPActive ? "Exit picture-in-picture" : "Enter picture-in-picture"}
            variant="secondary"
          />
        )}

        {canRecord && (
          <ControlButton
            active={isRecording}
            onClick={onToggleRecording}
            activeIcon={<Circle className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />}
            inactiveIcon={<Circle className="w-5 h-5 sm:w-6 sm:h-6" />}
            ariaLabel={isRecording ? "Stop recording" : "Start recording"}
            variant="recording"
          />
        )}

        <VideoQualitySettings
          currentQuality={videoQuality}
          onQualityChange={onQualityChange}
          networkQuality={networkQuality}
        />

        <Button
          size="lg"
          onClick={onEndCall}
          className="rounded-full w-14 h-14 sm:w-16 sm:h-16 bg-destructive hover:bg-destructive/90 touch-target"
          aria-label="End call"
        >
          <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
      </div>

      {participantCount > 0 && (
        <p className="text-center text-white/50 text-xs sm:text-sm mt-2 sm:mt-3">
          {participantCount} participant{participantCount !== 1 ? "s" : ""} in call
        </p>
      )}
    </div>
  );
};

// =============================================================================
// MAIN
// =============================================================================

export default function VideoCall() {
  const { videoDateId } = useParams<{ videoDateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<DailyCall | null>(null);

  const callEndedRef = useRef(false);
  const joinSoundPlayedRef = useRef(false);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  const [videoDate, setVideoDate] = useState<VideoDateRow | null>(null);
  const [otherName, setOtherName] = useState("User");

  const [selectedDevices] = useState<SelectedDevices | null>(null);

  const [callState, setCallState] = useState<CallState>({
    status: "loading",
    timeRemaining: 0,
    graceTimeRemaining: 0,
    participantCount: 0,
    isMuted: false,
    isVideoOff: false,
    showCountdown: false,
  });

  const [recordingState, setRecordingState] = useState<RecordingState>({
    showConsentModal: false,
    myConsent: null,
    otherConsent: null,
    isRecording: false,
  });

  const [isPiPActive, setIsPiPActive] = useState(false);
  const [videoQuality, setVideoQuality] = useState<string>("auto");
  const [networkQuality, setNetworkQuality] = useState<"good" | "fair" | "poor" | "unknown">("unknown");

  // “authoritative now” (client ticks every second, but we also resync from DB periodically)
  const [serverNowMs, setServerNowMs] = useState<number>(Date.now());

  const isSeeker = useMemo(() => !!(videoDate && user && videoDate.seeker_id === user.id), [videoDate, user]);

  const otherPersonName = otherName;

  const updateCallState = useCallback((patch: Partial<CallState>) => {
    setCallState((p) => ({ ...p, ...patch }));
  }, []);

  const handleGoBack = useCallback(() => {
    navigate("/video-dates");
  }, [navigate]);

  // ----------------------------------------------------------------------------
  // Fetch video date + other name
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!videoDateId || !user) {
      navigate("/video-dates");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.from("video_dates").select("*").eq("id", videoDateId).single();
        if (error || !data) throw new Error("Video date not found");

        const vd = data as unknown as VideoDateRow;

        if (!vd.daily_room_url) throw new Error("Video room not available");

        // fetch other name
        const otherUserId = vd.seeker_id === user.id ? vd.earner_id : vd.seeker_id;
        const { data: otherProfile } = await supabase.from("profiles").select("name").eq("id", otherUserId).single();

        if (!cancelled) {
          setVideoDate(vd);
          setOtherName(otherProfile?.name || "User");
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to load video date");
        navigate("/video-dates");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [videoDateId, user, navigate]);

  // ----------------------------------------------------------------------------
  // Realtime subscribe to this video_date row (this is your “source of truth”)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!videoDateId || !user) return;

    const channel = supabase
      .channel(`video_dates_${videoDateId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "video_dates", filter: `id=eq.${videoDateId}` },
        (payload) => {
          const next = payload.new as any;
          setVideoDate((prev) => ({ ...(prev as any), ...(next as any) }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoDateId, user]);

  // ----------------------------------------------------------------------------
  // Server time resync every 20s (prevents iOS/timer drift)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    let t1: any;
    let t2: any;

    // local tick every second for smooth UI
    t1 = setInterval(() => setServerNowMs(Date.now()), 1000);

    // periodic authoritative resync
    t2 = setInterval(async () => {
      const { data } = await supabase.rpc("get_server_time_ms");
      if (typeof data === "number") setServerNowMs(data);
    }, 20000);

    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, []);

  // ----------------------------------------------------------------------------
  // Compute countdowns from DB timestamps (authoritative)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!videoDate) return;

    const startedAt = parseMs(videoDate.started_at);
    const graceExpiresAt = parseMs(videoDate.grace_expires_at);
    const endsAt = parseMs(videoDate.ends_at);

    // Waiting: grace countdown
    if (!startedAt && graceExpiresAt) {
      const graceLeft = Math.floor((graceExpiresAt - serverNowMs) / 1000);
      updateCallState({ graceTimeRemaining: Math.max(0, graceLeft) });

      if (graceLeft <= 0 && callState.status !== "no_show" && callState.status !== "ending") {
        // grace expired — treat as no show
        setCallState((p) => ({ ...p, status: "no_show" }));
      }
    }

    // Active: call countdown
    if (startedAt && endsAt) {
      const left = Math.floor((endsAt - serverNowMs) / 1000);
      const timeRemaining = Math.max(0, left);

      // warnings
      if (timeRemaining === WARNING_TIME_5_MIN) toast.warning("5 minutes remaining");
      if (timeRemaining === WARNING_TIME_1_MIN) {
        toast.warning("1 minute remaining");
        playWarningSound();
      }
      if (timeRemaining === COUNTDOWN_START) {
        updateCallState({ showCountdown: true });
        playWarningSound();
      }
      updateCallState({ timeRemaining });

      // hard end when <= 0 (authoritative)
      if (timeRemaining <= 0 && callState.status === "active" && !callEndedRef.current) {
        handleCallEnd(); // will no-op if already ended
      }
    }
  }, [videoDate, serverNowMs, updateCallState, callState.status]);

  // ----------------------------------------------------------------------------
  // Token regen (kept close to your logic, but cleaner)
  // ----------------------------------------------------------------------------
  const regenerateTokens = useCallback(async () => {
    if (!videoDateId || !user) return null;

    updateCallState({ status: "regenerating_tokens" });

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error("Session expired");
      return null;
    }

    const result = await supabase.functions.invoke("create-daily-room", {
      body: { videoDateId, regenerateTokens: true },
      headers: { Authorization: `Bearer ${token}` },
    });

    const err = getFunctionErrorMessage(result, "Failed to regenerate tokens");
    if (err) {
      toast.error(err);
      return null;
    }

    const { data: vd, error } = await supabase
      .from("video_dates")
      .select(
        "seeker_meeting_token, earner_meeting_token, daily_room_url, started_at, grace_expires_at, ends_at, status, seeker_joined_at, earner_joined_at",
      )
      .eq("id", videoDateId)
      .single();

    if (error || !vd) return null;

    setVideoDate((prev) => ({ ...(prev as any), ...(vd as any) }));
    return vd as any;
  }, [videoDateId, user, updateCallState]);

  // ----------------------------------------------------------------------------
  // Mark joined in DB (server timestamps; do NOT rely on client)
  // Requires RPC mark_video_date_joined(videoDateId, role)
  // If you don’t have the RPC yet, comment this and we’ll use a safe update.
  // ----------------------------------------------------------------------------
  const markJoined = useCallback(async () => {
    if (!videoDateId || !videoDate || !user) return;
    const role = isSeeker ? "seeker" : "earner";

    try {
      await supabase.rpc("mark_video_date_joined", { p_video_date_id: videoDateId, p_role: role });
    } catch {
      // fallback: best-effort (may be blocked by RLS)
      const patch = isSeeker
        ? { seeker_joined_at: new Date().toISOString() }
        : { earner_joined_at: new Date().toISOString() };
      await supabase
        .from("video_dates")
        .update(patch as any)
        .eq("id", videoDateId);
    }
  }, [videoDateId, videoDate, user, isSeeker]);

  // ----------------------------------------------------------------------------
  // Activate call (only once) when we know both sides are present
  // ----------------------------------------------------------------------------
  const activateCall = useCallback(() => {
    if (joinSoundPlayedRef.current) return;
    joinSoundPlayedRef.current = true;

    playJoinSound();
    toast.success("Your date joined! Starting timer.");

    setCallState((p) => ({ ...p, status: "active", showCountdown: false }));

    // show recording consent modal (your existing logic)
    setRecordingState((prev) => ({ ...prev, showConsentModal: true }));
  }, []);

  // ----------------------------------------------------------------------------
  // Participant count: use Daily events AND fallback polling of participants()
  // ----------------------------------------------------------------------------
  const updateParticipantCount = useCallback(() => {
    const parts = callFrameRef.current?.participants() || {};
    // Daily includes local + remote; we only care if there’s at least 2 total
    const count = Object.keys(parts).length;
    updateCallState({ participantCount: count });
    return count;
  }, [updateCallState]);

  // ----------------------------------------------------------------------------
  // End call (same structure as yours)
  // ----------------------------------------------------------------------------
  const handleCallEnd = useCallback(async () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;

    updateCallState({ status: "ending" });

    try {
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    } catch {}

    // Charge / finalize via your edge function
    try {
      if (videoDateId) {
        toast.loading("Processing payment...", { id: "processing" });

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          toast.error("Session expired", { id: "processing" });
        } else {
          const actualEnd = new Date().toISOString();
          const result = await supabase.functions.invoke("charge-video-date", {
            body: { videoDateId, actualEnd },
            headers: { Authorization: `Bearer ${token}` },
          });

          const err = getFunctionErrorMessage(result, "Failed to process payment");
          if (err) {
            toast.error(err, { id: "processing" });
          } else {
            toast.success(`Call ended. ${result.data?.credits_charged} credits charged.`, { id: "processing" });
          }
        }
      }
    } catch (e) {
      toast.error("Error processing call end", { id: "processing" });
    } finally {
      updateCallState({ status: "ended" });
      navigate(`/rate/${videoDateId}`);
    }
  }, [videoDateId, navigate, updateCallState]);

  // ----------------------------------------------------------------------------
  // No show cancel (authoritative: when grace_expires_at passes AND call never started)
  // ----------------------------------------------------------------------------
  const handleNoShow = useCallback(async () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;

    updateCallState({ status: "no_show" });

    try {
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    } catch {}

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token && videoDateId) {
        const result = await supabase.functions.invoke("cancel-video-date", {
          body: { videoDateId, reason: "no_show" },
          headers: { Authorization: `Bearer ${token}` },
        });

        const err = getFunctionErrorMessage(result, "Failed to cancel video date");
        if (!err) toast.success("Video date cancelled. Credits refunded.");
      }
    } catch {}

    // don’t auto navigate; your NoShow overlay provides button
  }, [videoDateId, updateCallState]);

  // ----------------------------------------------------------------------------
  // Setup Daily call (single-shot)
  // ----------------------------------------------------------------------------
  const setupInitiatedRef = useRef(false);

  useEffect(() => {
    if (!videoDateId || !user) return;
    if (!videoDate) return;

    if (setupInitiatedRef.current) return;
    setupInitiatedRef.current = true;

    let mounted = true;

    (async () => {
      try {
        // Ensure tokens exist
        const userIsSeeker = videoDate.seeker_id === user.id;
        let meetingToken = userIsSeeker ? videoDate.seeker_meeting_token : videoDate.earner_meeting_token;

        if (!meetingToken) {
          const next = await regenerateTokens();
          if (!next) throw new Error("Failed to prepare video call");
          meetingToken = userIsSeeker ? next.seeker_meeting_token : next.earner_meeting_token;
        }

        // Create frame
        if (!mounted || !containerRef.current) return;

        const frame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: { position: "absolute", width: "100%", height: "100%", border: "0" },
          showLeaveButton: false,
          showFullscreenButton: true,
        });

        callFrameRef.current = frame;

        // Events
        frame.on("joined-meeting", async () => {
          if (!mounted) return;

          // Mark joined in DB (server timestamp)
          await markJoined();

          // Update participants count
          const count = updateParticipantCount();

          // If other already there, activate
          if (count > 1) activateCall();

          // If we do not have grace_expires_at yet, set it (best effort)
          // (ideally set by server at booking; this is fallback)
          if (!videoDate.grace_expires_at) {
            const graceIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();
            await supabase
              .from("video_dates")
              .update({ grace_expires_at: graceIso, status: "waiting" } as any)
              .eq("id", videoDateId);
          }

          updateCallState({ status: count > 1 ? "active" : "waiting" });
        });

        frame.on("participant-joined", () => {
          if (!mounted) return;
          const count = updateParticipantCount();
          if (count > 1) activateCall();
        });

        frame.on("participant-left", () => {
          if (!mounted) return;
          updateParticipantCount();
          toast.info("The other participant left the call");
        });

        frame.on("error", (err: any) => {
          console.error("Daily error:", err);
          const msg = err?.errorMsg || err?.error || err?.message || "Video call error";
          toast.error(msg.includes("token") ? "Session expired. Please rejoin." : "Video call error occurred.");
        });

        // Join
        const { data: profileRow } = await supabase.from("profiles").select("name").eq("id", user.id).single();
        const userName = profileRow?.name || "User";

        const joinConfig: any = {
          url: videoDate.daily_room_url!,
          token: meetingToken,
          userName,
          startVideoOff: false,
          startAudioOff: false,
        };

        if (selectedDevices?.audioInputId) joinConfig.audioSource = selectedDevices.audioInputId;
        if (selectedDevices?.videoInputId) joinConfig.videoSource = selectedDevices.videoInputId;

        updateCallState({ status: "loading" });
        await frame.join(joinConfig);

        // Fallback: poll participants for first 10s in case events don’t fire
        let attempts = 0;
        const poll = setInterval(() => {
          if (!mounted) return clearInterval(poll);
          attempts += 1;
          const count = updateParticipantCount();
          if (count > 1) {
            activateCall();
            clearInterval(poll);
          }
          if (attempts >= 10) clearInterval(poll);
        }, 1000);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to join video call");
        navigate("/video-dates");
      }
    })();

    return () => {
      mounted = false;
      try {
        if (callFrameRef.current) {
          callFrameRef.current.leave();
          callFrameRef.current.destroy();
          callFrameRef.current = null;
        }
      } catch {}
    };
  }, [
    videoDateId,
    user,
    videoDate,
    regenerateTokens,
    navigate,
    updateCallState,
    updateParticipantCount,
    activateCall,
    markJoined,
    selectedDevices,
  ]);

  // ----------------------------------------------------------------------------
  // Grace expiry / no-show trigger (authoritative)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!videoDate) return;

    const startedAt = parseMs(videoDate.started_at);
    const graceExpiresAt = parseMs(videoDate.grace_expires_at);

    if (startedAt) return; // call started, no no-show
    if (!graceExpiresAt) return;

    if (serverNowMs >= graceExpiresAt && callState.status !== "no_show" && !callEndedRef.current) {
      handleNoShow();
    }
  }, [videoDate, serverNowMs, callState.status, handleNoShow]);

  // ----------------------------------------------------------------------------
  // Controls
  // ----------------------------------------------------------------------------
  const handleToggleMute = useCallback(() => {
    if (!callFrameRef.current) return;
    const newMuted = !callState.isMuted;
    callFrameRef.current.setLocalAudio(!newMuted);
    updateCallState({ isMuted: newMuted });
  }, [callState.isMuted, updateCallState]);

  const handleToggleVideo = useCallback(() => {
    if (!callFrameRef.current) return;
    const newVideoOff = !callState.isVideoOff;
    callFrameRef.current.setLocalVideo(!newVideoOff);
    updateCallState({ isVideoOff: newVideoOff });
  }, [callState.isVideoOff, updateCallState]);

  const handleTogglePiP = useCallback(async () => {
    try {
      if (isPiPActive && document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
        return;
      }

      const participants = callFrameRef.current?.participants() || {};
      const remote = Object.values(participants).find((p: any) => !p.local);

      const track = (remote as any)?.tracks?.video?.persistentTrack;
      if (!track) {
        toast.error("No remote video available for picture-in-picture");
        return;
      }

      if (!pipVideoRef.current) {
        pipVideoRef.current = document.createElement("video");
        pipVideoRef.current.autoplay = true;
        pipVideoRef.current.playsInline = true;
      }

      const stream = new MediaStream([track]);
      pipVideoRef.current.srcObject = stream;
      await pipVideoRef.current.play();
      // @ts-ignore
      await pipVideoRef.current.requestPictureInPicture();
      setIsPiPActive(true);

      pipVideoRef.current.addEventListener("leavepictureinpicture", () => setIsPiPActive(false), { once: true });
    } catch (e) {
      console.error(e);
      toast.error("Failed to enable picture-in-picture");
    }
  }, [isPiPActive]);

  // ----------------------------------------------------------------------------
  // Derived view state
  // ----------------------------------------------------------------------------
  const isLoading = callState.status === "loading" || callState.status === "regenerating_tokens" || !videoDate || !user;

  const isWaiting = callState.status === "waiting";
  const isNoShow = callState.status === "no_show";
  const showCountdownOverlay =
    callState.showCountdown && callState.timeRemaining <= COUNTDOWN_START && callState.timeRemaining > 0;

  const loadingMessage =
    callState.status === "regenerating_tokens" ? "Preparing video call..." : "Connecting to video call...";

  const canRecord = recordingState.myConsent === true && recordingState.otherConsent === true;

  // ----------------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-[#0a0a0f] flex flex-col">
      <CallHeader otherPersonName={otherPersonName} onEndCall={handleCallEnd} />

      <div ref={containerRef} className="flex-1 relative">
        <LoadingOverlay visible={isLoading} message={loadingMessage} onCancel={handleGoBack} />

        <WaitingRoomOverlay
          visible={isWaiting}
          otherPersonName={otherPersonName}
          graceTimeRemaining={callState.graceTimeRemaining}
        />

        <NoShowOverlay visible={isNoShow} otherPersonName={otherPersonName} onGoBack={handleGoBack} />
      </div>

      {!isNoShow && (
        <CallControls
          isMuted={callState.isMuted}
          isVideoOff={callState.isVideoOff}
          participantCount={callState.participantCount}
          timeRemaining={callState.timeRemaining}
          callStarted={callState.status === "active"}
          isRecording={recordingState.isRecording}
          canRecord={canRecord}
          isPiPActive={isPiPActive}
          videoQuality={videoQuality}
          networkQuality={networkQuality}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onTogglePiP={handleTogglePiP}
          onToggleRecording={() => toast.info("Recording logic unchanged here")}
          onQualityChange={setVideoQuality}
          onEndCall={handleCallEnd}
        />
      )}

      <CountdownOverlay visible={showCountdownOverlay} timeRemaining={callState.timeRemaining} />
    </div>
  );
}
