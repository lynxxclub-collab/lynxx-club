import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Monitor,
  MonitorOff,
  Settings,
  Maximize,
  Minimize,
  MessageSquare,
  Clock,
  AlertTriangle,
  Loader2,
  Volume2,
  VolumeX,
  RotateCcw,
} from "lucide-react";
import { format, differenceInSeconds, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  playJoinSound,
  playWarningSound,
  playSuccessSound,
  playErrorSound,
  playSoundIfEnabled,
} from "@/lib/audio-utils";

interface VideoDateInfo {
  id: string;
  seeker_id: string;
  earner_id: string;
  scheduled_start: string;
  scheduled_duration: number;
  credits_reserved: number;
  earner_amount: number;
  status: string;
  daily_room_url: string;
  daily_room_name: string;
  other_user?: {
    id: string;
    name: string;
    profile_photos: string[];
  };
}

declare global {
  interface Window {
    DailyIframe: any;
  }
}

export default function VideoCall() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [videoDate, setVideoDate] = useState<VideoDateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callEnded, setCallEnded] = useState(false);

  // Call state
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [participantJoined, setParticipantJoined] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);

  // Refs
  const callFrameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef<Set<number>>(new Set());

  const isEarner = profile?.user_type === "earner";

  // Fetch video date info
  useEffect(() => {
    const fetchVideoDate = async () => {
      if (!id || !user) return;

      try {
        const { data, error } = await supabase.from("video_dates").select("*").eq("id", id).single();

        if (error) throw error;

        // Verify user is part of this call
        if (data.seeker_id !== user.id && data.earner_id !== user.id) {
          toast.error("You are not authorized for this call");
          navigate("/video-dates");
          return;
        }

        // Get other user info
        const otherId = isEarner ? data.seeker_id : data.earner_id;
        const { data: otherUser } = await supabase
          .from("profiles")
          .select("id, name, profile_photos")
          .eq("id", otherId)
          .single();

        setVideoDate({ ...data, other_user: otherUser } as VideoDateInfo);
      } catch (error: any) {
        console.error("Error:", error);
        toast.error("Failed to load video call");
        navigate("/video-dates");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoDate();
  }, [id, user, isEarner, navigate]);

  // Load Daily.co script
  useEffect(() => {
    if (window.DailyIframe) return;

    const script = document.createElement("script");
    script.src = "https://unpkg.com/@daily-co/daily-js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (!inCall || !videoDate) return;

    const updateTimer = () => {
      const endTime = addMinutes(new Date(videoDate.scheduled_start), videoDate.scheduled_duration);
      const remaining = differenceInSeconds(endTime, new Date());

      setTimeRemaining(remaining);

      // Warning at 5 minutes
      if (remaining <= 300 && remaining > 295 && !warningShownRef.current.has(300)) {
        warningShownRef.current.add(300);
        setShowTimeWarning(true);
        playSoundIfEnabled(playWarningSound);
        toast.warning("5 minutes remaining", { duration: 5000 });
      }

      // Warning at 1 minute
      if (remaining <= 60 && remaining > 55 && !warningShownRef.current.has(60)) {
        warningShownRef.current.add(60);
        playSoundIfEnabled(playWarningSound);
        toast.warning("1 minute remaining!", { duration: 5000 });
      }

      // Call ended
      if (remaining <= 0) {
        handleEndCall(true);
      }
    };

    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [inCall, videoDate]);

  const formatTime = (seconds: number): string => {
    if (seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const joinCall = async () => {
    if (!videoDate?.daily_room_url || !window.DailyIframe) {
      toast.error("Video room not ready. Please try again.");
      return;
    }

    setJoining(true);

    try {
      // Update status to in_progress
      await supabase.from("video_dates").update({ status: "in_progress" }).eq("id", videoDate.id);

      // Create Daily.co call frame
      callFrameRef.current = window.DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "12px",
        },
        showLeaveButton: false,
        showFullscreenButton: false,
      });

      // Set up event listeners
      callFrameRef.current.on("joined-meeting", () => {
        setInCall(true);
        setJoining(false);
        playSoundIfEnabled(playJoinSound);
      });

      callFrameRef.current.on("participant-joined", () => {
        setParticipantJoined(true);
        playSoundIfEnabled(playJoinSound);
        toast.success(`${videoDate.other_user?.name} joined the call`);
      });

      callFrameRef.current.on("participant-left", () => {
        setParticipantJoined(false);
        toast.info(`${videoDate.other_user?.name} left the call`);
      });

      callFrameRef.current.on("left-meeting", () => {
        setInCall(false);
        setCallEnded(true);
      });

      callFrameRef.current.on("error", (error: any) => {
        console.error("Daily.co error:", error);
        playSoundIfEnabled(playErrorSound);
        toast.error("Video call error");
      });

      // Join the call
      await callFrameRef.current.join({
        url: videoDate.daily_room_url,
        userName: profile?.name || "User",
      });
    } catch (error: any) {
      console.error("Error joining call:", error);
      playSoundIfEnabled(playErrorSound);
      toast.error("Failed to join call");
      setJoining(false);
    }
  };

  const handleEndCall = async (timedOut: boolean = false) => {
    try {
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }

      // Update video date status
      await supabase
        .from("video_dates")
        .update({
          status: "completed",
          actual_end: new Date().toISOString(),
        })
        .eq("id", id);

      playSoundIfEnabled(playSuccessSound);
      setInCall(false);
      setCallEnded(true);
      setShowEndDialog(false);

      if (timedOut) {
        toast.info("Video date completed!");
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  const toggleCamera = () => {
    if (callFrameRef.current) {
      callFrameRef.current.setLocalVideo(!isCameraOn);
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMic = () => {
    if (callFrameRef.current) {
      callFrameRef.current.setLocalAudio(!isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const toggleScreenShare = async () => {
    if (!callFrameRef.current) return;

    try {
      if (isScreenSharing) {
        await callFrameRef.current.stopScreenShare();
      } else {
        await callFrameRef.current.startScreenShare();
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (error) {
      console.error("Screen share error:", error);
      toast.error("Failed to share screen");
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!videoDate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Video Date Not Found</h2>
          <p className="text-muted-foreground mb-4">This video date may have been cancelled or doesn't exist.</p>
          <Button onClick={() => navigate("/video-dates")}>Back to Video Dates</Button>
        </Card>
      </div>
    );
  }

  if (callEnded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Call Ended</h2>
          <p className="text-muted-foreground mb-6">Your video date with {videoDate.other_user?.name} has ended.</p>

          <div className="space-y-3">
            <Button
              onClick={() => navigate(`/rate/${videoDate.other_user?.id}?videoDate=${videoDate.id}`)}
              className="w-full"
            >
              Rate Your Experience
            </Button>
            <Button variant="outline" onClick={() => navigate("/video-dates")} className="w-full">
              Back to Video Dates
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Pre-call lobby */}
      {!inCall && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="p-8 max-w-lg w-full bg-gray-900 border-gray-800">
            <div className="text-center mb-8">
              <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary">
                <AvatarImage src={videoDate.other_user?.profile_photos?.[0]} />
                <AvatarFallback className="text-2xl bg-primary">{videoDate.other_user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold mb-1">{videoDate.other_user?.name}</h2>
              <p className="text-gray-400">{videoDate.scheduled_duration} minute video date</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Scheduled</span>
                <span>{format(new Date(videoDate.scheduled_start), "h:mm a")}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-400">Duration</span>
                <span>{videoDate.scheduled_duration} minutes</span>
              </div>
              {isEarner && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-400">You'll earn</span>
                  <span className="text-emerald-400">${videoDate.earner_amount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Pre-call settings */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isCameraOn ? "secondary" : "destructive"}
                    size="icon"
                    onClick={() => setIsCameraOn(!isCameraOn)}
                    className="rounded-full w-14 h-14"
                  >
                    {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isCameraOn ? "Turn off camera" : "Turn on camera"}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMicOn ? "secondary" : "destructive"}
                    size="icon"
                    onClick={() => setIsMicOn(!isMicOn)}
                    className="rounded-full w-14 h-14"
                  >
                    {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMicOn ? "Mute mic" : "Unmute mic"}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={audioEnabled ? "secondary" : "outline"}
                    size="icon"
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className="rounded-full w-14 h-14"
                  >
                    {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{audioEnabled ? "Mute sounds" : "Unmute sounds"}</TooltipContent>
              </Tooltip>
            </div>

            <Button
              onClick={joinCall}
              disabled={joining}
              className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
            >
              {joining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Joining...
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5 mr-2" />
                  Join Video Call
                </>
              )}
            </Button>

            <Button variant="ghost" onClick={() => navigate("/video-dates")} className="w-full mt-3 text-gray-400">
              Cancel
            </Button>
          </Card>
        </div>
      )}

      {/* In-call view */}
      {inCall && (
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={videoDate.other_user?.profile_photos?.[0]} />
                <AvatarFallback>{videoDate.other_user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{videoDate.other_user?.name}</h3>
                <p className="text-xs text-gray-400">
                  {participantJoined ? (
                    <span className="text-emerald-400">● Connected</span>
                  ) : (
                    <span className="text-amber-400">● Waiting to join...</span>
                  )}
                </p>
              </div>
            </div>

            {/* Timer */}
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full",
                timeRemaining && timeRemaining <= 60
                  ? "bg-rose-500/20 text-rose-400 animate-pulse"
                  : timeRemaining && timeRemaining <= 300
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-gray-800",
              )}
            >
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">
                {timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}
              </span>
            </div>
          </div>

          {/* Video container */}
          <div ref={containerRef} className="flex-1 bg-gray-950 relative" />

          {/* Controls */}
          <div className="p-4 bg-gray-900/80 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isCameraOn ? "secondary" : "destructive"}
                    size="icon"
                    onClick={toggleCamera}
                    className="rounded-full w-12 h-12"
                  >
                    {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isCameraOn ? "Turn off camera" : "Turn on camera"}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMicOn ? "secondary" : "destructive"}
                    size="icon"
                    onClick={toggleMic}
                    className="rounded-full w-12 h-12"
                  >
                    {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMicOn ? "Mute" : "Unmute"}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isScreenSharing ? "default" : "secondary"}
                    size="icon"
                    onClick={toggleScreenShare}
                    className="rounded-full w-12 h-12"
                  >
                    {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isScreenSharing ? "Stop sharing" : "Share screen"}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" onClick={toggleFullscreen} className="rounded-full w-12 h-12">
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</TooltipContent>
              </Tooltip>

              <div className="w-px h-8 bg-gray-700 mx-2" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setShowEndDialog(true)}
                    className="rounded-full w-14 h-14"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>End call</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      )}

      {/* End call dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle>End Video Call?</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this video date with {videoDate.other_user?.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Continue Call
            </Button>
            <Button variant="destructive" onClick={() => handleEndCall(false)}>
              <PhoneOff className="w-4 h-4 mr-2" />
              End Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time warning */}
      {showTimeWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-amber-500/90 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-bounce">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">5 minutes remaining</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTimeWarning(false)}
            className="text-white hover:bg-white/20"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
