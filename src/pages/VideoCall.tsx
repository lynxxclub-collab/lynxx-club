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
import { ArrowLeft, Mic, MicOff, Video, VideoOff, PhoneOff, Clock, Users, Loader2, AlertTriangle } from "lucide-react";

// =============================================================================
// CONSTANTS
// =============================================================================

const GRACE_PERIOD_SECONDS = 10 * 60; // 10 minutes - increased for no-show protection
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
}

type CallStatus = "loading" | "regenerating_tokens" | "waiting" | "active" | "ending" | "ended" | "no_show";

interface CallState {
  status: CallStatus;
  timeRemaining: number;
  graceTimeRemaining: number;
  participantCount: number;
  isMuted: boolean;
  isVideoOff: boolean;
  showCountdown: boolean;
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

/**
 * Hook to manage countdown timer logic
 */
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

/**
 * Hook to fetch and manage video date details
 */
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

        // Check if tokens are missing - we'll need to regenerate
        if (!meetingToken) {
          console.log("Meeting token missing, will regenerate");
          setNeedsTokenRegeneration(true);
        }

        // Fetch other person's profile
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

  return { videoDate, loading, error, needsTokenRegeneration, updateTokens };
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface CallHeaderProps {
  otherPersonName: string;
  onEndCall: () => void;
}

const CallHeader = ({ otherPersonName, onEndCall }: CallHeaderProps) => (
  <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
    <Button variant="ghost" size="sm" onClick={onEndCall} className="text-white hover:bg-white/20">
      <ArrowLeft className="w-5 h-5 mr-2" />
      End Call
    </Button>

    <div className="text-white font-medium">Video Date with {otherPersonName}</div>

    <div className="w-24" />
  </div>
);

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

const LoadingOverlay = ({ visible, message = "Connecting to video call..." }: LoadingOverlayProps) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-white/80">{message}</p>
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

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
      <div className="text-center max-w-md mx-auto px-6">
        <Avatar className="w-24 h-24 mx-auto mb-6 border-4 border-primary/30">
          <AvatarFallback className="bg-primary/20 text-primary text-3xl">
            {getInitials(otherPersonName)}
          </AvatarFallback>
        </Avatar>

        <h2 className="text-2xl font-semibold text-white mb-2">Waiting for {otherPersonName}</h2>

        <p className="text-white/60 mb-4">
          They'll join any moment now. Make sure your camera and microphone are ready!
        </p>

        <div className="flex items-center justify-center gap-2 text-primary mb-4">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Waiting...</span>
        </div>

        {/* Grace Period Timer */}
        <div
          className={cn(
            "p-4 rounded-lg border transition-colors",
            isUrgent ? "bg-destructive/10 border-destructive/30" : "bg-white/5 border-white/10",
          )}
        >
          <div className="flex items-center justify-center gap-2 text-sm mb-1">
            {isUrgent ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : (
              <Clock className="w-4 h-4 text-white/60" />
            )}
            <span className={isUrgent ? "text-destructive" : "text-white/60"}>Grace period</span>
          </div>
          <div
            className={cn(
              "text-2xl font-mono font-bold tabular-nums",
              isUrgent ? "text-destructive animate-pulse" : "text-white",
            )}
          >
            {formatTime(graceTimeRemaining)}
          </div>
          <p className="text-xs text-white/40 mt-1">Call will cancel with full refund if they don't join</p>
        </div>

        <div className="mt-6 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
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
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30">
      <div className="text-center max-w-md mx-auto px-6">
        <AlertTriangle className="w-16 h-16 text-gold mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-white mb-2">{otherPersonName} didn't join</h2>
        <p className="text-white/60 mb-6">
          The grace period has expired and the other participant didn't join. Your credits have been fully refunded.
        </p>
        <Button onClick={onGoBack} className="bg-primary hover:bg-primary/90">
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
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="text-7xl font-bold text-destructive animate-pulse mb-4 tabular-nums">{timeRemaining}</div>
        <h2 className="text-2xl font-semibold text-white mb-2">Call ending soon!</h2>
        <p className="text-white/60">Your video date is about to end.</p>
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
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

const CallControls = ({
  isMuted,
  isVideoOff,
  participantCount,
  timeRemaining,
  callStarted,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: CallControlsProps) => {
  const isTimeUrgent = timeRemaining <= WARNING_TIME_1_MIN;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black/90 to-transparent">
      {/* Timer Display */}
      <div
        className={cn(
          "flex items-center justify-center gap-2 mb-4 text-lg font-mono tabular-nums",
          callStarted ? (isTimeUrgent ? "text-destructive animate-pulse" : "text-white") : "text-white/60",
        )}
      >
        <Clock className="w-5 h-5" />
        <span>
          {callStarted
            ? `Time Remaining: ${formatTime(timeRemaining)}`
            : `Call duration: ${formatTime(timeRemaining)} (waiting to start)`}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-4">
        <ControlButton
          active={isMuted}
          onClick={onToggleMute}
          activeIcon={<MicOff className="w-6 h-6" />}
          inactiveIcon={<Mic className="w-6 h-6" />}
          ariaLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
        />

        <ControlButton
          active={isVideoOff}
          onClick={onToggleVideo}
          activeIcon={<VideoOff className="w-6 h-6" />}
          inactiveIcon={<Video className="w-6 h-6" />}
          ariaLabel={isVideoOff ? "Turn on camera" : "Turn off camera"}
        />

        <Button
          size="lg"
          onClick={onEndCall}
          className="rounded-full w-16 h-16 bg-destructive hover:bg-destructive/90"
          aria-label="End call"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>

      {/* Participant Count */}
      {participantCount > 0 && (
        <p className="text-center text-white/60 text-sm mt-3">
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
}

const ControlButton = ({ active, onClick, activeIcon, inactiveIcon, ariaLabel }: ControlButtonProps) => (
  <Button
    variant="outline"
    size="lg"
    onClick={onClick}
    aria-label={ariaLabel}
    className={cn(
      "rounded-full w-16 h-16 border-2 transition-colors",
      active
        ? "bg-destructive/20 border-destructive text-destructive hover:bg-destructive/30"
        : "bg-white/10 border-white/30 text-white hover:bg-white/20",
    )}
  >
    {active ? activeIcon : inactiveIcon}
  </Button>
);

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

  // Fetch video date details
  const { videoDate, loading: detailsLoading, error: detailsError, needsTokenRegeneration, updateTokens } = useVideoDateDetails(videoDateId, user?.id);

  // Call state
  const [callState, setCallState] = useState<CallState>({
    status: "loading",
    timeRemaining: 0,
    graceTimeRemaining: GRACE_PERIOD_SECONDS,
    participantCount: 0,
    isMuted: false,
    isVideoOff: false,
    showCountdown: false,
  });

  // Timer for call duration
  const callTimer = useCountdownTimer(
    callState.timeRemaining,
    (remaining) => {
      // Handle warnings
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

  // Update state helper
  const updateCallState = useCallback((updates: Partial<CallState>) => {
    setCallState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handle no-show (grace period expired)
   */
  const handleNoShow = useCallback(async () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;

    updateCallState({ status: "no_show" });
    callTimer.stop();
    graceTimer.stop();

    try {
      // Leave and destroy call
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }

      // Cancel video date with no_show reason (triggers refund)
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

  /**
   * Track actual start time when call begins
   */
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

  /**
   * Process payment and end the call
   */
  const handleCallEnd = useCallback(async () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;

    updateCallState({ status: "ending" });
    callTimer.stop();
    graceTimer.stop();

    const actualEnd = new Date().toISOString();

    try {
      // Leave and destroy call
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }

      // Process payment
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
  }, [videoDateId, navigate, updateCallState, callTimer, graceTimer]);

  /**
   * Handle participant joining
   */
  const handleParticipantJoined = useCallback(() => {
    const participants = callFrameRef.current?.participants();
    const count = Object.keys(participants || {}).length;

    updateCallState({ participantCount: count });

    // Start call when second participant joins
    if (count > 1 && !hasPlayedJoinSoundRef.current) {
      hasPlayedJoinSoundRef.current = true;
      playJoinSound();
      toast.success("Your date has joined the call! Starting timer.");

      graceTimer.stop();
      updateCallState({ status: "active" });
      callTimer.start();
      
      // Track actual start time
      trackActualStart();
    }
  }, [updateCallState, graceTimer, callTimer, trackActualStart]);

  /**
   * Handle participant leaving
   */
  const handleParticipantLeft = useCallback(() => {
    const participants = callFrameRef.current?.participants();
    const count = Object.keys(participants || {}).length;

    updateCallState({ participantCount: count });

    if (count <= 1) {
      toast.info("The other participant has left the call");
    }
  }, [updateCallState]);

  /**
   * Regenerate tokens if needed
   */
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

      // Refetch video date to get new tokens
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

  // Setup call effect
  useEffect(() => {
    if (!videoDateId || !user) {
      navigate("/video-dates");
      return;
    }

    if (detailsError) {
      toast.error(detailsError);
      navigate("/video-dates");
      return;
    }

    if (detailsLoading || !videoDate) return;

    const setupCall = async () => {
      try {
        // Check if we need to regenerate tokens first
        if (needsTokenRegeneration) {
          const success = await regenerateTokens();
          if (!success) {
            toast.error("Failed to prepare video call");
            navigate("/video-dates");
            return;
          }
          return; // useEffect will re-run with updated tokens
        }

        // Set initial time from video date duration
        const initialTime = videoDate.scheduled_duration * 60;
        callTimer.reset(initialTime);
        updateCallState({ timeRemaining: initialTime });

        // Create Daily call frame
        if (!containerRef.current || callFrameRef.current) return;

        // Get meeting token
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

        // Event listeners
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

        // Join room
        console.log("Joining room:", videoDate.daily_room_url);
        await callFrameRef.current.join({
          url: videoDate.daily_room_url!,
          token: meetingToken,
        });

        // Update status
        await supabase.from("video_dates").update({ status: "waiting" }).eq("id", videoDateId);

        // Start grace period
        graceTimer.start();
      } catch (error) {
        console.error("Error setting up call:", error);
        toast.error("Failed to join video call");
        navigate("/video-dates");
      }
    };

    setupCall();

    // Cleanup
    return () => {
      callTimer.stop();
      graceTimer.stop();

      if (callFrameRef.current) {
        callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [videoDateId, user, navigate, videoDate, detailsLoading, detailsError, needsTokenRegeneration]);

  // Sync timer values with state
  useEffect(() => {
    if (callTimer.isRunning) {
      updateCallState({ timeRemaining: callTimer.timeRemaining });
    }
  }, [callTimer.timeRemaining, callTimer.isRunning, updateCallState]);

  // Control handlers
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
  const isLoading = callState.status === "loading" || callState.status === "regenerating_tokens" || detailsLoading;
  const isWaiting = callState.status === "waiting" && callState.participantCount <= 1;
  const isNoShow = callState.status === "no_show";
  const showCountdownOverlay =
    callState.showCountdown && callState.timeRemaining <= COUNTDOWN_START && callState.timeRemaining > 0;

  const loadingMessage = callState.status === "regenerating_tokens" 
    ? "Preparing video call..." 
    : "Connecting to video call...";

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <CallHeader otherPersonName={videoDate?.other_person_name || "..."} onEndCall={handleCallEnd} />

      {/* Video Container */}
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
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onEndCall={handleCallEnd}
        />
      )}

      <CountdownOverlay visible={showCountdownOverlay} timeRemaining={callState.timeRemaining} />
    </div>
  );
}
