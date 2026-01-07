import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, AlertTriangle, Video, Phone } from "lucide-react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

interface VideoDateData {
  id: string;
  seeker_id: string;
  earner_id: string;
  call_type: string;
  status: string;
  daily_room_url: string | null;
  seeker_meeting_token: string | null;
  earner_meeting_token: string | null;
  scheduled_at: string;
  scheduled_end_at: string;
  duration_minutes: number;
  seeker_joined_at: string | null;
  earner_joined_at: string | null;
}

interface ProfileData {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
const EARLY_JOIN_MS = 10 * 60 * 1000; // Can join 10 min early

export default function VideoDateJoin() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const callFrameRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const warningShownRef = useRef<{ five: boolean; two: boolean }>({ five: false, two: false });

  const videoDateId = useMemo(() => params.get("id"), [params]);

  // State
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [videoDate, setVideoDate] = useState<VideoDateData | null>(null);
  const [seekerProfile, setSeekerProfile] = useState<ProfileData | null>(null);
  const [earnerProfile, setEarnerProfile] = useState<ProfileData | null>(null);
  const [graceTimeRemaining, setGraceTimeRemaining] = useState<number | null>(null);
  const [callTimeRemaining, setCallTimeRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState<string | null>(null);
  const [otherPartyJoined, setOtherPartyJoined] = useState(false);
  const [bothJoinedDuringGrace, setBothJoinedDuringGrace] = useState(false);

  // Determine user role
  const isSeeker = useMemo(() => videoDate?.seeker_id === user?.id, [videoDate, user]);
  const isEarner = useMemo(() => videoDate?.earner_id === user?.id, [videoDate, user]);
  
  const myProfile = isSeeker ? seekerProfile : earnerProfile;
  const otherProfile = isSeeker ? earnerProfile : seekerProfile;
  const otherPartyName = otherProfile?.display_name || (isSeeker ? "Earner" : "Seeker");

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Load video date and profiles
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        if (!user) {
          toast.error("Please log in again.");
          navigate("/login");
          return;
        }
        if (!videoDateId) {
          toast.error("Missing video date id.");
          navigate("/video-dates");
          return;
        }

        setLoading(true);

        // Fetch video date
        const { data: vdData, error: vdError } = await supabase
          .from("video_dates")
          .select("*")
          .eq("id", videoDateId)
          .single();

        if (vdError) throw vdError;
        if (!vdData) throw new Error("Video date not found");

        // Verify user is part of this video date
        if (vdData.seeker_id !== user.id && vdData.earner_id !== user.id) {
          toast.error("You are not part of this video date.");
          navigate("/video-dates");
          return;
        }

        // Check if room exists (created when earner accepts)
        if (!vdData.daily_room_url || !vdData.seeker_meeting_token || !vdData.earner_meeting_token) {
          toast.error("Room not ready. Please wait for the date to be confirmed.");
          navigate("/video-dates");
          return;
        }

        // Check status
        if (vdData.status === "cancelled" || vdData.status === "cancelled_no_show") {
          toast.error("This video date has been cancelled.");
          navigate("/video-dates");
          return;
        }

        if (vdData.status === "completed") {
          toast.error("This video date has already ended.");
          navigate("/video-dates");
          return;
        }

        if (!mounted) return;
        setVideoDate(vdData);

        // Fetch both profiles separately for accurate display names
        const { data: seekerData } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("id", vdData.seeker_id)
          .single();

        const { data: earnerData } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("id", vdData.earner_id)
          .single();

        if (!mounted) return;
        setSeekerProfile(seekerData);
        setEarnerProfile(earnerData);

      } catch (e: any) {
        console.error("Load error:", e);
        toast.error(e?.message || "Failed to load video date");
        navigate("/video-dates");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, [user, videoDateId, navigate]);

  // Timer logic - runs every second
  useEffect(() => {
    if (!videoDate) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      const scheduledStart = new Date(videoDate.scheduled_at).getTime();
      const scheduledEnd = new Date(videoDate.scheduled_end_at).getTime();
      const graceEnd = scheduledStart + GRACE_PERIOD_MS;

      // Calculate remaining times
      const graceRemaining = Math.max(0, Math.floor((graceEnd - now) / 1000));
      const callRemaining = Math.max(0, Math.floor((scheduledEnd - now) / 1000));

      setGraceTimeRemaining(now >= scheduledStart ? graceRemaining : null);
      setCallTimeRemaining(callRemaining);

      // Check if we're past the call end time - kick users
      if (now >= scheduledEnd && inCall) {
        await endCall("Call time has ended. Thank you for using our service!");
        return;
      }

      // Grace period expiry check (only if not both joined)
      if (now >= graceEnd && !bothJoinedDuringGrace && now < scheduledEnd) {
        // Check database for join status
        const { data: freshData } = await supabase
          .from("video_dates")
          .select("seeker_joined_at, earner_joined_at, status")
          .eq("id", videoDate.id)
          .single();

        if (freshData && freshData.status === "confirmed") {
          const bothJoined = freshData.seeker_joined_at && freshData.earner_joined_at;
          
          if (!bothJoined) {
            // Cancel and refund
            await handleNoShow();
            return;
          } else {
            setBothJoinedDuringGrace(true);
          }
        }
      }

      // Warning notifications (only show once)
      if (inCall) {
        if (callRemaining <= 300 && callRemaining > 295 && !warningShownRef.current.five) {
          warningShownRef.current.five = true;
          setShowWarning("⚠️ 5 minutes remaining!");
          toast.warning("5 minutes remaining in your call!", { duration: 5000 });
        }
        if (callRemaining <= 120 && callRemaining > 115 && !warningShownRef.current.two) {
          warningShownRef.current.two = true;
          setShowWarning("⚠️ 2 minutes remaining!");
          toast.warning("2 minutes remaining in your call!", { duration: 5000 });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [videoDate, inCall, bothJoinedDuringGrace]);

  // Clear warning after display
  useEffect(() => {
    if (showWarning) {
      const timeout = setTimeout(() => setShowWarning(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [showWarning]);

  // Handle no-show scenario
  const handleNoShow = async () => {
    if (!videoDate) return;

    try {
      // Update status
      await supabase
        .from("video_dates")
        .update({ status: "cancelled_no_show" })
        .eq("id", videoDate.id);

      // Trigger refund
      const { error } = await supabase.functions.invoke("refund-video-date", {
        body: { videoDateId: videoDate.id }
      });

      if (error) console.error("Refund error:", error);

      if (inCall) {
        await endCall("Video date cancelled - grace period expired.");
      } else {
        toast.error("Video date cancelled - not all parties joined within the grace period. Refund initiated.");
        navigate("/video-dates");
      }
    } catch (e) {
      console.error("No-show handling error:", e);
    }
  };

  // End call and cleanup
  const endCall = async (reason: string) => {
    try {
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    } catch (e) {
      console.error("Error leaving call:", e);
    }
    setInCall(false);
    toast.info(reason);
    navigate("/video-dates");
  };

  // Join the video call
  const joinCall = async () => {
    if (!user || !videoDate || !containerRef.current) return;

    setJoining(true);
    try {
      const now = Date.now();
      const scheduledStart = new Date(videoDate.scheduled_at).getTime();
      const scheduledEnd = new Date(videoDate.scheduled_end_at).getTime();

      // Check if too early
      if (now < scheduledStart - EARLY_JOIN_MS) {
        const waitMinutes = Math.ceil((scheduledStart - EARLY_JOIN_MS - now) / 60000);
        toast.error(`Too early! You can join ${waitMinutes} minutes from now.`);
        return;
      }

      // Check if already ended
      if (now >= scheduledEnd) {
        toast.error("This video date has already ended.");
        navigate("/video-dates");
        return;
      }

      const token = isSeeker ? videoDate.seeker_meeting_token : videoDate.earner_meeting_token;
      if (!token || !videoDate.daily_room_url) {
        toast.error("Room credentials not available.");
        return;
      }

      // Create Daily iframe
      callFrameRef.current = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "12px",
        },
        showLeaveButton: true,
        showFullscreenButton: true,
      });

      // Event handlers
      callFrameRef.current.on("joined-meeting", async () => {
        setInCall(true);
        
        // Record join time
        const joinField = isSeeker ? "seeker_joined_at" : "earner_joined_at";
        await supabase
          .from("video_dates")
          .update({ [joinField]: new Date().toISOString() })
          .eq("id", videoDate.id);

        toast.success("You've joined the call!");
      });

      callFrameRef.current.on("participant-joined", (event) => {
        if (!event?.participant?.local) {
          setOtherPartyJoined(true);
          setBothJoinedDuringGrace(true);
          toast.success(`${otherPartyName} has joined!`);
        }
      });

      callFrameRef.current.on("participant-left", (event) => {
        if (!event?.participant?.local) {
          setOtherPartyJoined(false);
          toast.info(`${otherPartyName} has left the call.`);
        }
      });

      callFrameRef.current.on("left-meeting", () => {
        setInCall(false);
      });

      callFrameRef.current.on("error", (event) => {
        console.error("Daily error:", event);
        toast.error("Video call error occurred.");
      });

      // Join the room
      await callFrameRef.current.join({
        url: videoDate.daily_room_url,
        token: token,
        userName: myProfile?.display_name || (isSeeker ? "Seeker" : "Earner"),
      });

    } catch (e: any) {
      console.error("Join error:", e);
      toast.error(e?.message || "Failed to join call");
    } finally {
      setJoining(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
      }
    };
  }, []);

  // Subscribe to real-time updates for participant status
  useEffect(() => {
    if (!videoDateId) return;

    const channel = supabase
      .channel(`video_date_${videoDateId}`)
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

          if (updated.seeker_joined_at && updated.earner_joined_at) {
            setBothJoinedDuringGrace(true);
          }

          // Handle cancellation
          if (updated.status === "cancelled" || updated.status === "cancelled_no_show") {
            toast.error("This video date has been cancelled.");
            if (inCall) {
              endCall("Video date was cancelled.");
            } else {
              navigate("/video-dates");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoDateId, isSeeker, isEarner, inCall, navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading video date...</span>
      </div>
    );
  }

  if (!videoDate) return null;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {videoDate.call_type === "video" ? (
            <Video className="w-6 h-6 text-primary" />
          ) : (
            <Phone className="w-6 h-6 text-primary" />
          )}
          <div>
            <h1 className="text-xl font-semibold">
              {videoDate.call_type === "video" ? "Video" : "Audio"} Date with {otherPartyName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Scheduled: {new Date(videoDate.scheduled_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Time indicators */}
        <div className="flex items-center gap-2">
          {callTimeRemaining !== null && inCall && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-sm font-bold ${
                callTimeRemaining <= 120
                  ? "bg-red-100 text-red-700 animate-pulse"
                  : callTimeRemaining <= 300
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              <Clock className="w-4 h-4" />
              {formatTime(callTimeRemaining)}
            </div>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      {showWarning && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg animate-bounce">
          <AlertTriangle className="w-6 h-6 text-yellow-600" />
          <span className="font-bold text-yellow-800 text-lg">{showWarning}</span>
        </div>
      )}

      {/* Grace Period Banner */}
      {graceTimeRemaining !== null && graceTimeRemaining > 0 && !bothJoinedDuringGrace && (
        <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-orange-800">
              Grace Period: {formatTime(graceTimeRemaining)} remaining
            </span>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            Both parties must join before time expires or the date will be cancelled and refunded.
          </p>
        </div>
      )}

      {/* Video Container */}
      <div
        ref={containerRef}
        className={`w-full aspect-video bg-gray-900 rounded-xl overflow-hidden ${
          !inCall ? "hidden" : ""
        }`}
      />

      {/* Pre-call UI */}
      {!inCall && (
        <div className="space-y-4">
          <div className="p-6 bg-muted rounded-lg text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              {videoDate.call_type === "video" ? (
                <Video className="w-8 h-8 text-primary" />
              ) : (
                <Phone className="w-8 h-8 text-primary" />
              )}
            </div>
            <h2 className="text-lg font-medium mb-2">Ready to join?</h2>
            <p className="text-sm text-muted-foreground">
              You'll be connected with <strong>{otherPartyName}</strong> in a private{" "}
              {videoDate.call_type} room.
            </p>
          </div>

          <Button onClick={joinCall} disabled={joining} className="w-full" size="lg">
            {joining ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Connecting...
              </>
            ) : (
              <>
                <Video className="w-5 h-5 mr-2" />
                Join Call Now
              </>
            )}
          </Button>
        </div>
      )}

      {/* In-call status */}
      {inCall && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                otherPartyJoined ? "bg-green-500" : "bg-yellow-500 animate-pulse"
              }`}
            />
            <span className="text-sm">
              {otherPartyJoined
                ? `${otherPartyName} is in the call`
                : `Waiting for ${otherPartyName}...`}
            </span>
          </div>
          <Button variant="destructive" size="sm" onClick={() => endCall("You left the call.")}>
            Leave Call
          </Button>
        </div>
      )}

      {/* Back button */}
      {!inCall && (
        <Button variant="ghost" onClick={() => navigate("/video-dates")} className="w-full">
          Back to Video Dates
        </Button>
      )}
    </div>
  );
}
