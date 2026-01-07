import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, PhoneOff, Users, Clock, AlertTriangle, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Constants
const GRACE_PERIOD_SECONDS = 5 * 60; // 5 minutes
const EARLY_JOIN_MINUTES = 10; // Can join 10 min before scheduled time
const WARNING_5_MIN = 5 * 60; // 5 minutes in seconds
const WARNING_2_MIN = 2 * 60; // 2 minutes in seconds

interface VideoDateData {
  id: string;
  seeker_id: string;
  earner_id: string;
  status: string;
  daily_room_url: string | null;
  daily_room_name: string | null;
  seeker_meeting_token: string | null;
  earner_meeting_token: string | null;
  scheduled_start: string;
  scheduled_duration: number;
  seeker_joined_at: string | null;
  earner_joined_at: string | null;
  earner_amount: number;
}

interface ProfileData {
  id: string;
  display_name: string | null;
  name: string | null;
  profile_photos: string[] | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoCall() {
  const { id: videoDateId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Refs
  const frameRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const warningsShownRef = useRef({ five: false, two: false });

  // State
  const [loading, setLoading] = useState(true);
  const [videoDate, setVideoDate] = useState<VideoDateData | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileData | null>(null);
  const [otherProfile, setOtherProfile] = useState<ProfileData | null>(null);
  const [status, setStatus] = useState<"loading" | "connecting" | "waiting" | "active" | "ending">("loading");
  const [otherPartyJoined, setOtherPartyJoined] = useState(false);
  const [graceRemaining, setGraceRemaining] = useState<number | null>(null);
  const [callRemaining, setCallRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState<string | null>(null);
  const [bothJoinedInGrace, setBothJoinedInGrace] = useState(false);

  // Derived values
  const isSeeker = useMemo(() => videoDate?.seeker_id === user?.id, [videoDate, user]);
  const isEarner = useMemo(() => videoDate?.earner_id === user?.id, [videoDate, user]);
  const myToken = useMemo(() => {
    if (!videoDate) return null;
    return isSeeker ? videoDate.seeker_meeting_token : videoDate.earner_meeting_token;
  }, [videoDate, isSeeker]);

  const otherPartyName = useMemo(() => {
    return otherProfile?.display_name || otherProfile?.name || "Your date";
  }, [otherProfile]);

  const myDisplayName = useMemo(() => {
    return myProfile?.display_name || myProfile?.name || (isSeeker ? "Seeker" : "Earner");
  }, [myProfile, isSeeker]);

  // Calculate scheduled end time
  const scheduledEnd = useMemo(() => {
    if (!videoDate) return null;
    const start = new Date(videoDate.scheduled_start);
    return new Date(start.getTime() + videoDate.scheduled_duration * 60 * 1000);
  }, [videoDate]);

  // Load video date and profiles
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        if (!user) {
          toast.error("Please log in");
          navigate("/login");
          return;
        }

        if (!videoDateId) {
          toast.error("Invalid video date");
          navigate("/video-dates");
          return;
        }

        // Fetch video date
        const { data: vdData, error: vdError } = await supabase
          .from("video_dates")
          .select("*")
          .eq("id", videoDateId)
          .single();

        if (vdError || !vdData) {
          throw new Error("Video date not found");
        }

        // Verify user is part of this date
        if (vdData.seeker_id !== user.id && vdData.earner_id !== user.id) {
          toast.error("You are not part of this video date");
          navigate("/video-dates");
          return;
        }

        // Check status
        if (["cancelled", "cancelled_no_show", "declined", "no_show"].includes(vdData.status)) {
          toast.error("This video date has been cancelled");
          navigate("/video-dates");
          return;
        }

        if (vdData.status === "completed") {
          toast.info("This video date has already ended");
          navigate("/video-dates");
          return;
        }

        // Check if room exists
        if (!vdData.daily_room_url) {
          toast.error("Room not ready. Please wait for the date to be confirmed.");
          navigate("/video-dates");
          return;
        }

        if (!mounted) return;
        setVideoDate(vdData);

        // Determine roles
        const myId = user.id;
        const otherId = vdData.seeker_id === myId ? vdData.earner_id : vdData.seeker_id;

        // Fetch profiles
        const { data: myData } = await supabase
          .from("profiles")
          .select("id, display_name, name, profile_photos")
          .eq("id", myId)
          .single();

        const { data: otherData } = await supabase
          .from("profiles")
          .select("id, display_name, name, profile_photos")
          .eq("id", otherId)
          .single();

        if (!mounted) return;
        setMyProfile(myData);
        setOtherProfile(otherData);

        // Check if other party already joined
        const iAmSeeker = vdData.seeker_id === myId;
        if (iAmSeeker && vdData.earner_joined_at) {
          setOtherPartyJoined(true);
        } else if (!iAmSeeker && vdData.seeker_joined_at) {
          setOtherPartyJoined(true);
        }

        // Check if both have joined
        if (vdData.seeker_joined_at && vdData.earner_joined_at) {
          setBothJoinedInGrace(true);
        }

        setLoading(false);
        setStatus("connecting");

      } catch (e: any) {
        console.error("Load error:", e);
        toast.error(e.message || "Failed to load video date");
        navigate("/video-dates");
      }
    }

    loadData();
    return () => { mounted = false; };
  }, [user, videoDateId, navigate]);

  // Timer logic - grace period starts at scheduled_start, NOT when joining
  useEffect(() => {
    if (!videoDate || !scheduledEnd) return;
    if (status === "ending") return;

    const interval = setInterval(async () => {
      const now = Date.now();
      const scheduledStart = new Date(videoDate.scheduled_start).getTime();
      const endTime = scheduledEnd.getTime();
      const graceEndTime = scheduledStart + GRACE_PERIOD_SECONDS * 1000;

      // Calculate remaining times
      const graceRemainingMs = graceEndTime - now;
      const callRemainingMs = endTime - now;

      // Grace period countdown (only show after scheduled start)
      if (now >= scheduledStart && !bothJoinedInGrace) {
        setGraceRemaining(Math.max(0, Math.floor(graceRemainingMs / 1000)));
      } else {
        setGraceRemaining(null);
      }

      // Call time remaining
      setCallRemaining(Math.max(0, Math.floor(callRemainingMs / 1000)));

      // Check if call should end (past scheduled end time)
      if (now >= endTime && status === "active") {
        await endCall("Call time has ended. Thank you!");
        return;
      }

      // Check if grace period expired without both joining
      if (now >= graceEndTime && !bothJoinedInGrace && status !== "ending") {
        // Fetch latest data to confirm
        const { data: freshData } = await supabase
          .from("video_dates")
          .select("seeker_joined_at, earner_joined_at, status")
          .eq("id", videoDate.id)
          .single();

        if (freshData) {
          const bothJoined = freshData.seeker_joined_at && freshData.earner_joined_at;
          
          if (!bothJoined && !["completed", "cancelled", "cancelled_no_show"].includes(freshData.status)) {
            // Cancel and refund (only seeker triggers to prevent double)
            if (isSeeker) {
              await handleNoShow();
            }
            return;
          } else if (bothJoined) {
            setBothJoinedInGrace(true);
          }
        }
      }

      // Warning notifications during active call
      if (status === "active" && callRemainingMs > 0) {
        const callRemainingSeconds = Math.floor(callRemainingMs / 1000);
        
        // 5 minute warning
        if (callRemainingSeconds <= WARNING_5_MIN && callRemainingSeconds > WARNING_5_MIN - 5 && !warningsShownRef.current.five) {
          warningsShownRef.current.five = true;
          setShowWarning("5 minutes remaining!");
          toast.warning("⚠️ 5 minutes remaining in your call!", { duration: 5000 });
        }
        
        // 2 minute warning
        if (callRemainingSeconds <= WARNING_2_MIN && callRemainingSeconds > WARNING_2_MIN - 5 && !warningsShownRef.current.two) {
          warningsShownRef.current.two = true;
          setShowWarning("2 minutes remaining!");
          toast.warning("⚠️ 2 minutes remaining in your call!", { duration: 5000 });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [videoDate, scheduledEnd, status, bothJoinedInGrace, isSeeker]);

  // Clear warning banner after 5 seconds
  useEffect(() => {
    if (showWarning) {
      const timeout = setTimeout(() => setShowWarning(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [showWarning]);

  // Handle no-show scenario
  const handleNoShow = useCallback(async () => {
    if (!videoDate) return;
    setStatus("ending");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await supabase.functions.invoke("refund-video-date", {
        body: { videoDateId: videoDate.id, reason: "no_show" },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined,
      });

      toast.info("Video date cancelled - grace period expired. Refund initiated.");
    } catch (e: any) {
      console.error("No-show error:", e);
    }

    // Cleanup and navigate
    try {
      await frameRef.current?.leave();
      frameRef.current?.destroy();
    } catch {}
    frameRef.current = null;
    
    navigate("/video-dates");
  }, [videoDate, navigate]);

  // End call normally
  const endCall = useCallback(async (message?: string) => {
    setStatus("ending");
    
    try {
      await frameRef.current?.leave();
      frameRef.current?.destroy();
    } catch {}
    frameRef.current = null;

    if (message) {
      toast.info(message);
    }

    // Navigate to rating page or back to list
    if (videoDateId) {
      navigate(`/rate/${videoDateId}`);
    } else {
      navigate("/video-dates");
    }
  }, [navigate, videoDateId]);

  // Join the Daily call
  const joinCall = useCallback(async () => {
    if (!videoDate || !myToken || !containerRef.current) return;
    if (!videoDate.daily_room_url) return;
    if (frameRef.current) return; // Already joined

    setStatus("connecting");

    try {
      // Check timing
      const now = Date.now();
      const scheduledStart = new Date(videoDate.scheduled_start).getTime();
      const scheduledEndTime = scheduledStart + videoDate.scheduled_duration * 60 * 1000;

      // Too early?
      const earlyJoinTime = scheduledStart - EARLY_JOIN_MINUTES * 60 * 1000;
      if (now < earlyJoinTime) {
        const waitMinutes = Math.ceil((earlyJoinTime - now) / 60000);
        toast.error(`Too early! You can join in ${waitMinutes} minutes.`);
        navigate("/video-dates");
        return;
      }

      // Already ended?
      if (now >= scheduledEndTime) {
        toast.error("This video date has already ended.");
        navigate("/video-dates");
        return;
      }

      // Create Daily iframe
      const frame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          position: "absolute",
          width: "100%",
          height: "100%",
          border: "0",
        },
        showLeaveButton: false, // We'll use our own button
        showFullscreenButton: true,
      });

      frameRef.current = frame;

      // Event handlers
      frame.on("joined-meeting", async () => {
        console.log("Joined meeting");
        
        // Record join time
        const joinField = isSeeker ? "seeker_joined_at" : "earner_joined_at";
        await supabase
          .from("video_dates")
          .update({ 
            [joinField]: new Date().toISOString(),
            status: "waiting"
          })
          .eq("id", videoDate.id);

        // Check participant count
        const participants = frame.participants();
        const count = Object.keys(participants).length;
        
        if (count > 1) {
          setStatus("active");
          setOtherPartyJoined(true);
          setBothJoinedInGrace(true);
          
          // Update to in_progress
          await supabase
            .from("video_dates")
            .update({ status: "in_progress" })
            .eq("id", videoDate.id);
            
          toast.success("Call connected!");
        } else {
          setStatus("waiting");
          toast.info("Connected! Waiting for " + otherPartyName + "...");
        }
      });

      frame.on("participant-joined", async (event) => {
        if (!event?.participant?.local) {
          console.log("Other participant joined");
          setOtherPartyJoined(true);
          setBothJoinedInGrace(true);
          setStatus("active");
          
          // Update to in_progress
          await supabase
            .from("video_dates")
            .update({ status: "in_progress" })
            .eq("id", videoDate.id);
          
          toast.success(`${otherPartyName} has joined!`);
        }
      });

      frame.on("participant-left", (event) => {
        if (!event?.participant?.local) {
          console.log("Other participant left");
          setOtherPartyJoined(false);
          toast.info(`${otherPartyName} has left the call.`);
          
          // If both had joined, keep status as active (they might reconnect)
          // Only change to waiting if we're still in grace period
        }
      });

      frame.on("left-meeting", () => {
        console.log("Left meeting");
        setStatus("ending");
      });

      frame.on("error", (e: any) => {
        console.error("Daily error:", e);
        toast.error("Video call error. Please try again.");
        navigate("/video-dates");
      });

      // Actually join
      await frame.join({
        url: videoDate.daily_room_url,
        token: myToken,
        userName: myDisplayName,
        startVideoOff: false,
        startAudioOff: false,
      });

    } catch (e: any) {
      console.error("Join error:", e);
      toast.error(e.message || "Failed to join call");
      navigate("/video-dates");
    }
  }, [videoDate, myToken, isSeeker, myDisplayName, otherPartyName, navigate]);

  // Auto-join once ready
  useEffect(() => {
    if (status === "connecting" && videoDate && myToken && !frameRef.current) {
      joinCall();
    }
  }, [status, videoDate, myToken, joinCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        frameRef.current?.leave();
        frameRef.current?.destroy();
      } catch {}
      frameRef.current = null;
    };
  }, []);

  // Realtime subscription for video date updates
  useEffect(() => {
    if (!videoDateId) return;

    const channel = supabase
      .channel(`video_call_${videoDateId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "video_dates",
          filter: `id=eq.${videoDateId}`,
        },
        (payload) => {
          const updated = payload.new as VideoDateData;
          setVideoDate(updated);

          // Check if other party joined
          if (isSeeker && updated.earner_joined_at) {
            setOtherPartyJoined(true);
          } else if (isEarner && updated.seeker_joined_at) {
            setOtherPartyJoined(true);
          }

          // Check if both joined
          if (updated.seeker_joined_at && updated.earner_joined_at) {
            setBothJoinedInGrace(true);
          }

          // Handle external cancellation
          if (["cancelled", "cancelled_no_show", "no_show"].includes(updated.status)) {
            toast.error("This video date has been cancelled.");
            endCall();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoDateId, isSeeker, isEarner, endCall]);

  // Render
  const isLoading = loading || status === "loading" || status === "connecting";

  return (
    <div className="fixed inset-0 bg-[#0a0a0f]">
      {/* Video container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Warning Banner */}
      {showWarning && status === "active" && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 px-6 py-3 bg-yellow-500 text-black rounded-full animate-bounce shadow-lg">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-bold text-lg">⚠️ {showWarning}</span>
          </div>
        </div>
      )}

      {/* Call Timer (during active call) */}
      {status === "active" && callRemaining !== null && (
        <div className="absolute top-4 right-4 z-50">
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold shadow-lg",
              callRemaining <= WARNING_2_MIN
                ? "bg-red-500 text-white animate-pulse"
                : callRemaining <= WARNING_5_MIN
                ? "bg-yellow-500 text-black"
                : "bg-white/10 text-white backdrop-blur-sm"
            )}
          >
            <Clock className="w-5 h-5" />
            {formatTime(callRemaining)}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] z-40">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-rose-400 mb-4" />
            <p className="text-white/70 text-lg">Connecting to video call...</p>
          </div>
        </div>
      )}

      {/* Waiting State */}
      {status === "waiting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/95 backdrop-blur-sm z-30">
          <div className="text-center px-6 max-w-md">
            {/* Other person's avatar */}
            {otherProfile && (
              <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-rose-500/30">
                <AvatarImage src={otherProfile.profile_photos?.[0]} />
                <AvatarFallback className="bg-rose-500/20 text-rose-300 text-3xl">
                  {otherPartyName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex items-center justify-center gap-2 text-white mb-3">
              <Users className="w-5 h-5" />
              <span className="font-semibold text-xl">Waiting for {otherPartyName}...</span>
            </div>

            {/* Grace Period Countdown */}
            {graceRemaining !== null && graceRemaining > 0 && (
              <>
                <div
                  className={cn(
                    "text-4xl font-mono tabular-nums my-4",
                    graceRemaining <= 60 ? "text-rose-400 animate-pulse" : "text-white"
                  )}
                >
                  <Clock className="inline w-6 h-6 mr-2 opacity-70" />
                  {formatTime(graceRemaining)}
                </div>

                <p className="text-white/60 text-sm">
                  Grace period: If they don't join in time, the call is cancelled and{" "}
                  {isSeeker ? "you will be" : "the seeker is"} refunded.
                </p>
              </>
            )}

            <Button
              onClick={() => endCall("You left the call.")}
              className="mt-6 bg-rose-600 hover:bg-rose-500 text-white px-6 py-3"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Leave Call
            </Button>
          </div>
        </div>
      )}

      {/* Controls (during active call) */}
      {status === "active" && (
        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center z-50">
          <div className="flex items-center gap-4 px-6 py-3 bg-black/50 backdrop-blur-md rounded-full">
            {/* Other party status */}
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <div className={cn(
                "w-3 h-3 rounded-full",
                otherPartyJoined ? "bg-green-500" : "bg-yellow-500 animate-pulse"
              )} />
              {otherPartyJoined ? otherPartyName : `Waiting for ${otherPartyName}`}
            </div>

            <div className="w-px h-6 bg-white/20" />

            <Button
              onClick={() => endCall()}
              className="bg-rose-600 hover:bg-rose-500 text-white rounded-full px-6"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              End Call
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
