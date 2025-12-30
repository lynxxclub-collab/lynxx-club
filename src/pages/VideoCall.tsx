import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getFunctionErrorMessage } from "@/lib/supabaseFunctionError";
import { playJoinSound, playWarningSound } from "@/lib/audioNotifications";
import { ArrowLeft, Mic, MicOff, Video, VideoOff, PhoneOff, Clock, Users, Loader2, AlertTriangle, Circle, PictureInPicture2 } from "lucide-react";
import DeviceCheckScreen, { SelectedDevices } from "@/components/video/DeviceCheckScreen";
import RecordingConsentModal from "@/components/video/RecordingConsentModal";
import RecordingIndicator from "@/components/video/RecordingIndicator";
import VideoQualitySettings, { QUALITY_PRESETS } from "@/components/video/VideoQualitySettings";

// =============================================================================
// CONSTANTS
// =============================================================================

const GRACE_PERIOD_SECONDS = 5 * 60;
const WARNING_TIME_5_MIN = 300;
const WARNING_TIME_1_MIN = 60;
const COUNTDOWN_START = 30;

// =============================================================================
// TYPES
// =============================================================================

interface VideoDateDetails {
  id: string;
  scheduled_duration: number;
  daily_room_url: string | null;
  seeker_id: string;
  earner_id: string;
  status: string;
  other_person_name: string;
  seeker_meeting_token: string | null;
  earner_meeting_token: string | null;
  recording_consent_seeker?: boolean;
  recording_consent_earner?: boolean;
}

type CallStatus = "device_check" | "loading" | "regenerating_tokens" | "waiting" | "active" | "ending" | "ended" | "no_show";

interface CallState {
  status: CallStatus;
  timeRemaining: number;
  graceTimeRemaining: number;
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

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const getInitials = (name: string | undefined): string => {
  return name?.charAt(0).toUpperCase() || "U";
};

// =============================================================================
// CUSTOM HOOKS
// =============================================================================

const useCountdownTimer = (initialTime: number, onTick?: (remaining: number) => void, onComplete?: () => void) => {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);

  const start = useCallback(() => {
    if (timerRef.current) return;
    setIsRunning(true);

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        onTick?.(newTime);

        if (newTime <= 0) {
          stop();
          onComplete?.();
          return 0;
        }
        return newTime;
      });
    }, 1000);
  }, [onTick, onComplete]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const reset = useCallback(
    (newTime: number) => {
      stop();
      setTimeRemaining(newTime);
    },
    [stop],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return { timeRemaining, isRunning, start, stop, reset };
};

const useVideoDateDetails = (videoDateId: string | undefined, userId: string | undefined) => {
  const [videoDate, setVideoDate] = useState<VideoDateDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsTokenRegeneration, setNeedsTokenRegeneration] = useState(false);

  useEffect(() => {
    if (!videoDateId || !userId) {
      setError("Missing video date or user ID");
      setLoading(false);
      return;
    }

    const fetchVideoDate = async () => {
      try {
        const { data: vd, error: fetchError } = await supabase
          .from("video_dates")
          .select("*")
          .eq("id", videoDateId)
          .single();

        if (fetchError || !vd) {
          setError("Video date not found");
          return;
        }

        if (!vd.daily_room_url) {
          setError("Video room not available");
          return;
        }

        const userIsSeeker = vd.seeker_id === userId;
        const meetingToken = userIsSeeker ? vd.seeker_meeting_token : vd.earner_meeting_token;

        if (!meetingToken) {
          console.log("Meeting token missing, will regenerate");
          setNeedsTokenRegeneration(true);
        }

        const otherUserId = userIsSeeker ? vd.earner_id : vd.seeker_id;
        const { data: otherProfile } = await supabase.from("profiles").select("name").eq("id", otherUserId).single();

        setVideoDate({
          ...vd,
          other_person_name: otherProfile?.name || "User",
        });
      } catch (err) {
        setError("Failed to load video date");
        console.error("Error fetching video date:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoDate();
  }, [videoDateId, userId]);

  const updateTokens = (seekerToken: string, earnerToken: string) => {
    if (videoDate) {
      setVideoDate({
        ...videoDate,
        seeker_meeting_token: seekerToken,
        earner_meeting_token: earnerToken,
      });
      setNeedsTokenRegeneration(false);
    }
  };

  return { videoDate, loading, error, needsTokenRegeneration, updateTokens, setVideoDate };
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface CallHeaderProps {
  otherPersonName: string;
  onEndCall: () => void;
}

const CallHeader = ({ otherPersonName, onEndCall }: CallHeaderProps) => (
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

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

const LoadingOverlay = ({ visible, message = "Connecting to video call..." }: LoadingOverlayProps) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] z-10">
      {/* Ambient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[300px] h-[300px] rounded-full blur-[120px] bg-primary/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-glow" />
      </div>
      <div className="text-center relative z-10 px-6">
        <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-white/70 text-sm sm:text-base">{message}</p>
      </div>
    </div>
  );
};

interface WaitingRoomOverlayProps {
  visible: boolean;
  otherPersonName: string;
  graceTimeRemaining: number;
}

const WaitingRoomOverlay = ({ visible, otherPersonName, graceTimeRemaining }: WaitingRoomOverlayProps) => {
  if (!visible) return null;

  const isUrgent = graceTimeRemaining <= WARNING_TIME_1_MIN;
  const totalGraceTime = GRACE_PERIOD_SECONDS;
  const progressPercentage = (graceTimeRemaining / totalGraceTime) * 100;
  
  // Calculate circle properties for SVG
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/95 backdrop-blur-sm z-20">
      {/* Ambient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[120px] bg-rose-500/10 top-0 right-0" />
        <div className="absolute w-[300px] h-[300px] rounded-full blur-[120px] bg-purple-500/10 bottom-0 left-0" />
      </div>

      <div className="text-center max-w-md mx-auto px-4 sm:px-6 relative z-10">
        <Avatar className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 border-4 border-primary/30 shadow-lg">
          <AvatarFallback className="bg-primary/20 text-primary text-xl sm:text-2xl">
            {getInitials(otherPersonName)}
          </AvatarFallback>
        </Avatar>

        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">Waiting for {otherPersonName}</h2>
        <p className="text-white/60 mb-4 sm:mb-6 text-sm sm:text-base">They'll join any moment now!</p>

        {/* Circular countdown timer */}
        <div className="relative w-36 h-36 sm:w-48 sm:h-48 mx-auto mb-4 sm:mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={isUrgent ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn("transition-all duration-1000", isUrgent && "animate-pulse")}
            />
          </svg>
          
          {/* Timer text in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(
              "text-3xl sm:text-4xl font-mono font-bold tabular-nums",
              isUrgent ? "text-destructive animate-pulse" : "text-white"
            )}>
              {formatTime(graceTimeRemaining)}
            </span>
            <span className="text-[10px] sm:text-xs text-white/50 mt-1">grace period</span>
          </div>
        </div>

        {isUrgent && (
          <div className="flex items-center justify-center gap-2 text-destructive mb-4 animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Time running out!</span>
          </div>
        )}

        <p className="text-[11px] sm:text-xs text-white/40 px-4">
          Call will cancel with full refund if they don't join within 5 minutes
        </p>

        <div className="mt-4 p-3 glass-card">
          <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
            <Users className="w-4 h-4" />
            <span>You're the first one here</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NoShowOverlayProps {
  visible: boolean;
  otherPersonName: string;
  onGoBack: () => void;
}

const NoShowOverlay = ({ visible, otherPersonName, onGoBack }: NoShowOverlayProps) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/95 backdrop-blur-sm z-30">
      <div className="text-center max-w-md mx-auto px-4 sm:px-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500" />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">{otherPersonName} didn't join</h2>
        <p className="text-white/60 mb-6 text-sm sm:text-base">
          The grace period has expired. Your credits have been fully refunded.
        </p>
        <Button 
          onClick={onGoBack} 
          className="btn-gradient-primary h-12 px-6 touch-target"
        >
          Back to Video Dates
        </Button>
      </div>
    </div>
  );
};

interface CountdownOverlayProps {
  visible: boolean;
  timeRemaining: number;
}

const CountdownOverlay = ({ visible, timeRemaining }: CountdownOverlayProps) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/90 backdrop-blur-sm z-30">
      <div className="text-center max-w-md mx-auto px-4 sm:px-6">
        <div className="text-6xl sm:text-7xl font-bold text-destructive animate-pulse mb-4 tabular-nums">{timeRemaining}</div>
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">Call ending soon!</h2>
        <p className="text-white/60 text-sm sm:text-base">Your video date is about to end.</p>
      </div>
    </div>
  );
};

interface CallControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  participantCount: number;
  timeRemaining: number;
  callStarted: boolean;
  isRecording: boolean;
  canRecord: boolean;
  isPiPActive: boolean;
  videoQuality: string;
  networkQuality: 'good' | 'fair' | 'poor' | 'unknown';
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onTogglePiP: () => void;
  onToggleRecording: () => void;
  onQualityChange: (quality: string) => void;
  onEndCall: () => void;
}

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
}: CallControlsProps) => {
  const isTimeUrgent = timeRemaining <= WARNING_TIME_1_MIN;
  const isPiPSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 p-3 sm:p-6 pb-safe bg-gradient-to-t from-[#0a0a0f] via-black/80 to-transparent">
      {/* Timer display */}
      <div
        className={cn(
          "flex items-center justify-center gap-2 mb-3 sm:mb-4 text-base sm:text-lg font-mono tabular-nums",
          callStarted ? (isTimeUrgent ? "text-destructive animate-pulse" : "text-white") : "text-white/60",
        )}
      >
        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base">
          {callStarted
            ? `${formatTime(timeRemaining)} remaining`
            : `${formatTime(timeRemaining)} (waiting)`}
        </span>
      </div>

      {/* Control buttons - Responsive grid */}
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

interface ControlButtonProps {
  active: boolean;
  onClick: () => void;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  ariaLabel: string;
  variant?: "default" | "secondary" | "recording";
}

const ControlButton = ({ active, onClick, activeIcon, inactiveIcon, ariaLabel, variant = "default" }: ControlButtonProps) => {
  const getClassName = () => {
    const baseClasses = "rounded-full w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-2 transition-all duration-200 touch-target";
    
    if (variant === "recording") {
      return cn(
        baseClasses,
        active
          ? "bg-destructive border-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/30"
          : "bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
      );
    }
    if (variant === "secondary") {
      return cn(
        baseClasses,
        active
          ? "bg-primary/20 border-primary text-primary hover:bg-primary/30"
          : "bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
      );
    }
    return cn(
      baseClasses,
      active
        ? "bg-destructive/20 border-destructive text-destructive hover:bg-destructive/30"
        : "bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
    );
  };

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={onClick}
      aria-label={ariaLabel}
      className={getClassName()}
    >
      {active ? activeIcon : inactiveIcon}
    </Button>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function VideoCall() {
  const { videoDateId } = useParams<{ videoDateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Refs
  const callFrameRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPlayedJoinSoundRef = useRef(false);
  const callEndedRef = useRef(false);
  const actualStartTrackedRef = useRef(false);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  // Fetch video date details
  const { videoDate, loading: detailsLoading, error: detailsError, needsTokenRegeneration, updateTokens, setVideoDate } = useVideoDateDetails(videoDateId, user?.id);

  // Device selection state
  const [selectedDevices, setSelectedDevices] = useState<SelectedDevices | null>(null);

  // Call state
  const [callState, setCallState] = useState<CallState>({
    status: "device_check",
    timeRemaining: 0,
    graceTimeRemaining: GRACE_PERIOD_SECONDS,
    participantCount: 0,
    isMuted: false,
    isVideoOff: false,
    showCountdown: false,
  });

  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>({
    showConsentModal: false,
    myConsent: null,
    otherConsent: null,
    isRecording: false,
  });

  // PiP state
  const [isPiPActive, setIsPiPActive] = useState(false);

  // Video quality state
  const [videoQuality, setVideoQuality] = useState<string>('auto');
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor' | 'unknown'>('unknown');

  // Timer for call duration
  const callTimer = useCountdownTimer(
    callState.timeRemaining,
    (remaining) => {
      if (remaining === WARNING_TIME_5_MIN) {
        toast.warning("5 minutes remaining");
      }
      if (remaining === WARNING_TIME_1_MIN) {
        toast.warning("1 minute remaining");
        playWarningSound();
      }
      if (remaining === COUNTDOWN_START) {
        setCallState((prev) => ({ ...prev, showCountdown: true }));
        playWarningSound();
      }
    },
    () => handleCallEnd(),
  );

  // Timer for grace period
  const graceTimer = useCountdownTimer(
    GRACE_PERIOD_SECONDS,
    (remaining) => {
      setCallState((prev) => ({ ...prev, graceTimeRemaining: remaining }));
      if (remaining === WARNING_TIME_1_MIN) {
        toast.warning("1 minute left to wait for the other participant");
      }
    },
    () => handleNoShow(),
  );

  const updateCallState = useCallback((updates: Partial<CallState>) => {
    setCallState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleDeviceCheckComplete = useCallback((devices: SelectedDevices) => {
    setSelectedDevices(devices);
    updateCallState({ status: "loading" });
  }, [updateCallState]);

  const handleDeviceCheckCancel = useCallback(() => {
    navigate("/video-dates");
  }, [navigate]);

  const handleNoShow = useCallback(async () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;

    updateCallState({ status: "no_show" });
    callTimer.stop();
    graceTimer.stop();

    try {
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }

      if (videoDateId) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          const result = await supabase.functions.invoke("cancel-video-date", {
            body: { videoDateId, reason: "no_show" },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          const errorMessage = getFunctionErrorMessage(result, "Failed to cancel video date");
          if (errorMessage) {
            console.error("Cancel error:", errorMessage);
          } else {
            toast.success("Video date cancelled. Credits have been refunded.");
          }
        }
      }
    } catch (error) {
      console.error("Error handling no-show:", error);
    }
  }, [videoDateId, updateCallState, callTimer, graceTimer]);

  const trackActualStart = useCallback(async () => {
    if (actualStartTrackedRef.current || !videoDateId) return;
    actualStartTrackedRef.current = true;

    console.log("Tracking actual_start time");
    
    const { error } = await supabase
      .from("video_dates")
      .update({ actual_start: new Date().toISOString() })
      .eq("id", videoDateId)
      .is("actual_start", null);

    if (error) {
      console.error("Failed to track actual_start:", error);
    }
  }, [videoDateId]);

  const handleCallEnd = useCallback(async () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;

    updateCallState({ status: "ending" });
    callTimer.stop();
    graceTimer.stop();

    // Stop recording if active
    if (recordingState.isRecording && videoDateId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await supabase.functions.invoke("manage-recording", {
            body: { action: "stop", videoDateId },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        }
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
    }

    const actualEnd = new Date().toISOString();

    try {
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }

      if (videoDateId) {
        toast.loading("Processing payment...", { id: "processing" });

        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !currentUser) {
          toast.error("Session expired", { id: "processing" });
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.access_token) {
            toast.error("Session expired", { id: "processing" });
          } else {
            const result = await supabase.functions.invoke("charge-video-date", {
              body: { videoDateId, actualEnd },
              headers: { Authorization: `Bearer ${session.access_token}` },
            });

            const errorMessage = getFunctionErrorMessage(result, "Failed to process payment");

            if (errorMessage) {
              console.error("Charge error:", errorMessage);
              toast.error(errorMessage, { id: "processing" });
            } else {
              toast.success(`Call ended. ${result.data?.credits_charged} credits charged.`, { id: "processing" });
            }
          }
        }
      }

      navigate(`/rate/${videoDateId}`);
    } catch (error) {
      console.error("Error ending call:", error);
      toast.error("Error processing call end");
      navigate("/video-dates");
    }
  }, [videoDateId, navigate, updateCallState, callTimer, graceTimer, recordingState.isRecording]);

  const handleParticipantJoined = useCallback(() => {
    const participants = callFrameRef.current?.participants();
    const count = Object.keys(participants || {}).length;

    updateCallState({ participantCount: count });

    if (count > 1 && !hasPlayedJoinSoundRef.current) {
      hasPlayedJoinSoundRef.current = true;
      playJoinSound();
      toast.success("Your date has joined the call! Starting timer.");

      graceTimer.stop();
      updateCallState({ status: "active" });
      callTimer.start();
      
      trackActualStart();

      // Show recording consent modal
      setRecordingState((prev) => ({ ...prev, showConsentModal: true }));
    }
  }, [updateCallState, graceTimer, callTimer, trackActualStart]);

  const handleParticipantLeft = useCallback(() => {
    const participants = callFrameRef.current?.participants();
    const count = Object.keys(participants || {}).length;

    updateCallState({ participantCount: count });

    if (count <= 1) {
      toast.info("The other participant has left the call");
    }
  }, [updateCallState]);

  const regenerateTokens = useCallback(async () => {
    if (!videoDateId || !user) return false;

    try {
      updateCallState({ status: "regenerating_tokens" });
      console.log("Regenerating meeting tokens...");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Session expired");
        return false;
      }

      const result = await supabase.functions.invoke("create-daily-room", {
        body: { videoDateId, regenerateTokens: true },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const errorMessage = getFunctionErrorMessage(result, "Failed to regenerate tokens");
      if (errorMessage) {
        toast.error(errorMessage);
        return false;
      }

      const { data: vd } = await supabase
        .from("video_dates")
        .select("seeker_meeting_token, earner_meeting_token")
        .eq("id", videoDateId)
        .single();

      if (vd?.seeker_meeting_token && vd?.earner_meeting_token) {
        updateTokens(vd.seeker_meeting_token, vd.earner_meeting_token);
        console.log("Tokens regenerated successfully");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error regenerating tokens:", error);
      return false;
    }
  }, [videoDateId, user, updateCallState, updateTokens]);

  // Handle recording consent
  const handleRecordingConsent = useCallback(async (consent: boolean) => {
    if (!videoDateId) return;

    setRecordingState((prev) => ({ ...prev, myConsent: consent, showConsentModal: false }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const result = await supabase.functions.invoke("manage-recording", {
        body: { action: "consent", videoDateId, consent },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (result.data?.bothConsented) {
        toast.success("Both participants consented. Recording can now be started.");
      } else if (!consent) {
        toast.info("Recording declined. The call will not be recorded.");
      }
    } catch (error) {
      console.error("Error submitting consent:", error);
    }
  }, [videoDateId]);

  // Toggle recording
  const handleToggleRecording = useCallback(async () => {
    if (!videoDateId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      if (recordingState.isRecording) {
        // Stop recording
        await supabase.functions.invoke("manage-recording", {
          body: { action: "stop", videoDateId },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        setRecordingState((prev) => ({ ...prev, isRecording: false, recordingStartedAt: undefined }));
        toast.success("Recording stopped");
      } else {
        // Start recording
        const result = await supabase.functions.invoke("manage-recording", {
          body: { action: "start", videoDateId },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        const errorMessage = getFunctionErrorMessage(result, "Failed to start recording");
        if (errorMessage) {
          toast.error(errorMessage);
        } else {
          setRecordingState((prev) => ({ ...prev, isRecording: true, recordingStartedAt: new Date() }));
          toast.success("Recording started");
        }
      }
    } catch (error) {
      console.error("Error toggling recording:", error);
      toast.error("Failed to toggle recording");
    }
  }, [videoDateId, recordingState.isRecording]);

  // Toggle Picture-in-Picture
  const handleTogglePiP = useCallback(async () => {
    try {
      if (isPiPActive && document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
        return;
      }

      // Get the remote participant's video track from Daily.co
      const participants = callFrameRef.current?.participants();
      const remoteParticipant = Object.values(participants || {}).find((p) => !p.local);

      if (!remoteParticipant?.tracks?.video?.persistentTrack) {
        toast.error("No remote video available for picture-in-picture");
        return;
      }

      // Create or reuse video element
      if (!pipVideoRef.current) {
        pipVideoRef.current = document.createElement("video");
        pipVideoRef.current.autoplay = true;
        pipVideoRef.current.playsInline = true;
      }

      const stream = new MediaStream([remoteParticipant.tracks.video.persistentTrack]);
      pipVideoRef.current.srcObject = stream;
      await pipVideoRef.current.play();
      await pipVideoRef.current.requestPictureInPicture();
      setIsPiPActive(true);

      // Listen for PiP exit
      pipVideoRef.current.addEventListener("leavepictureinpicture", () => {
        setIsPiPActive(false);
      }, { once: true });
    } catch (error) {
      console.error("Error toggling PiP:", error);
      toast.error("Failed to enable picture-in-picture");
    }
  }, [isPiPActive]);

  // Subscribe to realtime consent updates
  useEffect(() => {
    if (!videoDateId || !user) return;

    const channel = supabase
      .channel(`video_date_consent_${videoDateId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "video_dates",
          filter: `id=eq.${videoDateId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          const isSeeker = videoDate?.seeker_id === user.id;

          setRecordingState((prev) => ({
            ...prev,
            otherConsent: isSeeker ? updated.recording_consent_earner : updated.recording_consent_seeker,
          }));

          // Check if both consented
          if (updated.recording_consent_seeker && updated.recording_consent_earner) {
            toast.success("Both participants consented to recording");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoDateId, user, videoDate?.seeker_id]);

  // Setup call effect
  useEffect(() => {
    if (!videoDateId || !user) {
      navigate("/video-dates");
      return;
    }

    // Wait for device check
    if (callState.status === "device_check") return;

    if (detailsError) {
      toast.error(detailsError);
      navigate("/video-dates");
      return;
    }

    if (detailsLoading || !videoDate) return;

    const setupCall = async () => {
      try {
        if (needsTokenRegeneration) {
          const success = await regenerateTokens();
          if (!success) {
            toast.error("Failed to prepare video call");
            navigate("/video-dates");
            return;
          }
          return;
        }

        const initialTime = videoDate.scheduled_duration * 60;
        callTimer.reset(initialTime);
        updateCallState({ timeRemaining: initialTime });

        if (!containerRef.current || callFrameRef.current) return;

        const userIsSeeker = videoDate.seeker_id === user.id;
        const meetingToken = userIsSeeker ? videoDate.seeker_meeting_token : videoDate.earner_meeting_token;

        if (!meetingToken) {
          console.error("No meeting token available after regeneration attempt");
          toast.error("Failed to get meeting token");
          navigate("/video-dates");
          return;
        }

        console.log("Creating Daily.co frame...");

        callFrameRef.current = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: {
            position: "absolute",
            width: "100%",
            height: "100%",
            border: "0",
            borderRadius: "0",
          },
          showLeaveButton: false,
          showFullscreenButton: false,
        });

        callFrameRef.current.on("joined-meeting", () => {
          console.log("Joined meeting successfully");
          updateCallState({ status: "waiting" });

          const participants = callFrameRef.current?.participants();
          updateCallState({ participantCount: Object.keys(participants || {}).length });
        });

        callFrameRef.current.on("participant-joined", handleParticipantJoined);
        callFrameRef.current.on("participant-left", handleParticipantLeft);
        callFrameRef.current.on("left-meeting", () => console.log("Left meeting"));
        callFrameRef.current.on("error", (error) => {
          console.error("Daily.co error:", error);
          toast.error("Video call error occurred");
        });

        // Join with selected devices
        const joinConfig: any = {
          url: videoDate.daily_room_url!,
          token: meetingToken,
        };

        if (selectedDevices?.audioInputId) {
          joinConfig.audioSource = selectedDevices.audioInputId;
        }
        if (selectedDevices?.videoInputId) {
          joinConfig.videoSource = selectedDevices.videoInputId;
        }

        console.log("Joining room:", videoDate.daily_room_url);
        await callFrameRef.current.join(joinConfig);

        await supabase.from("video_dates").update({ status: "waiting" }).eq("id", videoDateId);

        graceTimer.start();
      } catch (error) {
        console.error("Error setting up call:", error);
        toast.error("Failed to join video call");
        navigate("/video-dates");
      }
    };

    setupCall();

    return () => {
      callTimer.stop();
      graceTimer.stop();

      if (callFrameRef.current) {
        callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [videoDateId, user, navigate, videoDate, detailsLoading, detailsError, needsTokenRegeneration, callState.status, selectedDevices]);

  useEffect(() => {
    if (callTimer.isRunning) {
      updateCallState({ timeRemaining: callTimer.timeRemaining });
    }
  }, [callTimer.timeRemaining, callTimer.isRunning, updateCallState]);

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

  const handleGoBack = useCallback(() => {
    navigate("/video-dates");
  }, [navigate]);

  // Derived state
  const isDeviceCheck = callState.status === "device_check";
  const isLoading = callState.status === "loading" || callState.status === "regenerating_tokens" || detailsLoading;
  const isWaiting = callState.status === "waiting" && callState.participantCount <= 1;
  const isNoShow = callState.status === "no_show";
  const showCountdownOverlay =
    callState.showCountdown && callState.timeRemaining <= COUNTDOWN_START && callState.timeRemaining > 0;

  const loadingMessage = callState.status === "regenerating_tokens" 
    ? "Preparing video call..." 
    : "Connecting to video call...";

  const canRecord = recordingState.myConsent === true && recordingState.otherConsent === true;

  // Show device check screen
  if (isDeviceCheck) {
    return (
      <DeviceCheckScreen 
        onComplete={handleDeviceCheckComplete} 
        onCancel={handleDeviceCheckCancel} 
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0f] flex flex-col">
      <CallHeader otherPersonName={videoDate?.other_person_name || "..."} onEndCall={handleCallEnd} />

      <RecordingIndicator isRecording={recordingState.isRecording} startedAt={recordingState.recordingStartedAt} />

      <RecordingConsentModal
        open={recordingState.showConsentModal}
        onConsent={handleRecordingConsent}
        otherPersonName={videoDate?.other_person_name || "participant"}
        otherPersonConsented={recordingState.otherConsent}
      />

      <div ref={containerRef} className="flex-1 relative">
        <LoadingOverlay visible={isLoading} message={loadingMessage} />

        <WaitingRoomOverlay
          visible={isWaiting}
          otherPersonName={videoDate?.other_person_name || "participant"}
          graceTimeRemaining={callState.graceTimeRemaining}
        />

        <NoShowOverlay
          visible={isNoShow}
          otherPersonName={videoDate?.other_person_name || "participant"}
          onGoBack={handleGoBack}
        />
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
          onToggleRecording={handleToggleRecording}
          onQualityChange={setVideoQuality}
          onEndCall={handleCallEnd}
        />
      )}

      <CountdownOverlay visible={showCountdownOverlay} timeRemaining={callState.timeRemaining} />
    </div>
  );
}
