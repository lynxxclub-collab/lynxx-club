import { useState, useEffect, useRef } from "react";
import DailyIframe, { DailyCall, DailyEvent } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Video, Phone, X, Mic, MicOff, VideoOff, Video as VideoOn } from "lucide-react";
import { toast } from "sonner";

interface VideoCallWaitingRoomProps {
  videoDateId: string;
  callType: "video" | "audio";
  onLeave: () => void;
}

export default function VideoCallWaitingRoom({ videoDateId, callType, onLeave }: VideoCallWaitingRoomProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const callObjectRef = useRef<DailyCall | null>(null);

  useEffect(() => {
    let mounted = true;
    let daily: DailyCall | null = null;

    const initializeCall = async () => {
      try {
        // Fetch video date details
        const { data: videoDate, error: fetchError } = await supabase
          .from("video_dates")
          .select("*")
          .eq("id", videoDateId)
          .single();

        if (fetchError || !videoDate) {
          throw new Error("Video date not found");
        }

        if (!videoDate.daily_room_url) {
          throw new Error("Room URL not available");
        }

        // Determine which token to use (both are the same shared token)
        const isSeeker = user?.id === videoDate.seeker_id;
        const token = isSeeker ? videoDate.seeker_meeting_token : videoDate.earner_meeting_token;

        if (!token) {
          throw new Error("Access token not available");
        }

        // Create Daily call object
        daily = DailyIframe.createCallObject({
          url: videoDate.daily_room_url,
          token: token,
          showLeaveButton: false,
          showFullscreenButton: true,
          userName: isSeeker ? "Seeker" : "Earner",
        });

        if (!mounted) return;

        callObjectRef.current = daily;
        setCallObject(daily);

        // Set up event listeners
        daily
          .on("joining-meeting", () => {
            console.log("Joining meeting...");
            setIsWaiting(true);
          })
          .on("joined-meeting", () => {
            console.log("Joined meeting successfully");
            setIsInCall(true);
            setIsWaiting(false);
            setLoading(false);
            
            // Update status to 'waiting' in database
            updateVideoDateStatus("waiting");
          })
          .on("participant-joined", (event) => {
            console.log("Participant joined:", event);
            updateParticipantCount(daily);
            
            // If both parties are present, update status to 'in_progress'
            const participants = daily?.participants();
            if (participants && Object.keys(participants).length >= 2) {
              setIsWaiting(false);
              updateVideoDateStatus("in_progress");
              toast.success("Call started!");
            }
          })
          .on("participant-left", (event) => {
            console.log("Participant left:", event);
            updateParticipantCount(daily);
            
            // If someone leaves, we might need to update status
            const participants = daily?.participants();
            if (participants && Object.keys(participants).length < 2) {
              setIsWaiting(true);
            }
          })
          .on("left-meeting", () => {
            console.log("Left meeting");
            setIsInCall(false);
            handleCallEnd();
          })
          .on("error", (error) => {
            console.error("Daily error:", error);
            setError(error.errorMsg || "An error occurred");
            toast.error(error.errorMsg || "Connection error");
          });

        // Join the call
        await daily.join();

        // If video call, show video
        if (callType === "video" && videoRef.current) {
          // Wait a bit for tracks to be ready
          setTimeout(() => {
            if (videoRef.current && daily) {
              const iframe = daily.iframe();
              if (iframe && videoRef.current) {
                videoRef.current.appendChild(iframe);
              }
            }
          }, 500);
        }
      } catch (err: any) {
        console.error("Error initializing call:", err);
        setError(err.message);
        setLoading(false);
        toast.error(err.message || "Failed to join call");
      }
    };

    initializeCall();

    return () => {
      mounted = false;
      if (daily) {
        daily.destroy();
      }
    };
  }, [videoDateId, callType, user]);

  const updateParticipantCount = (daily: DailyCall | null) => {
    if (!daily) return;
    const participants = daily.participants();
    const count = participants ? Object.keys(participants).length : 0;
    setParticipantCount(count);
  };

  const updateVideoDateStatus = async (status: string) => {
    try {
      const updates: any = { status };
      
      // If starting the call, record the actual start time
      if (status === "in_progress") {
        updates.actual_start = new Date().toISOString();
      }
      
      await supabase.from("video_dates").update(updates).eq("id", videoDateId);
    } catch (err) {
      console.error("Error updating video date status:", err);
    }
  };

  const handleCallEnd = () => {
    if (callObjectRef.current) {
      callObjectRef.current.destroy();
      callObjectRef.current = null;
    }
    onLeave();
  };

  const toggleMute = () => {
    if (!callObject) return;
    callObject.setLocalAudio(!isMuted);
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (!callObject || callType === "audio") return;
    callObject.setLocalVideo(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  const leaveCall = async () => {
    if (callObject) {
      await callObject.leave();
      callObject.destroy();
    }
    handleCallEnd();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0f] text-white p-6">
        <div className="max-w-md text-center">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-white/60 mb-6">{error}</p>
          <Button onClick={onLeave} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0f] text-white">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Connecting to call...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#0a0a0f]">
      {/* Video Container */}
      <div
        ref={videoRef}
        className={`w-full h-full ${callType === "audio" ? "hidden" : ""}`}
      />

      {/* Audio-only UI */}
      {callType === "audio" && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <Phone className="w-16 h-16 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Audio Call</h2>
            <p className="text-white/60">
              {isWaiting ? "Waiting for other participant..." : "Call in progress"}
            </p>
          </div>
        </div>
      )}

      {/* Waiting Overlay */}
      {isWaiting && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 max-w-md">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Waiting Room</h3>
            <p className="text-white/60 mb-4">
              Waiting for the other participant to join...
            </p>
            <p className="text-sm text-white/40">
              Participants in room: {participantCount}
            </p>
          </div>
        </div>
      )}

      {/* Call Controls */}
      {isInCall && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center gap-4">
            {/* Mute Button */}
            <Button
              onClick={toggleMute}
              size="lg"
              variant="outline"
              className={`rounded-full w-14 h-14 ${
                isMuted ? "bg-red-500 hover:bg-red-600" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            {/* Video Toggle (only for video calls) */}
            {callType === "video" && (
              <Button
                onClick={toggleVideo}
                size="lg"
                variant="outline"
                className={`rounded-full w-14 h-14 ${
                  isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <VideoOn className="w-6 h-6" />}
              </Button>
            )}

            {/* Leave Button */}
            <Button
              onClick={leaveCall}
              size="lg"
              className="rounded-full w-14 h-14 bg-red-500 hover:bg-red-600"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
