import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Mic, MicOff, Video, VideoOff, PhoneOff, Clock, Users, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getFunctionErrorMessage } from '@/lib/supabaseFunctionError';

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

export default function VideoCall() {
  const { videoDateId } = useParams<{ videoDateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const callFrameRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [videoDate, setVideoDate] = useState<VideoDateDetails | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleCallEnd = useCallback(async () => {
    if (callEnded) return;
    setCallEnded(true);

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const actualEnd = new Date().toISOString();

    try {
      // Leave and destroy call first
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }

      // Process payment if this is a valid video date
      if (videoDateId) {
        toast.loading('Processing payment...', { id: 'processing' });

        // Use getUser() first to force session refresh
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !currentUser) {
          toast.error('Session expired', { id: 'processing' });
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            toast.error('Session expired', { id: 'processing' });
          } else {
            const result = await supabase.functions.invoke('charge-video-date', {
              body: { videoDateId, actualEnd },
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });

            const errorMessage = getFunctionErrorMessage(result, 'Failed to process payment');
            if (errorMessage) {
              console.error('Charge error:', errorMessage);
              toast.error(errorMessage, { id: 'processing' });
            } else {
              toast.success(`Call ended. ${result.data?.credits_charged} credits charged.`, { id: 'processing' });
            }
          }
        }
      }
      
      // Navigate to rating page
      navigate(`/rate/${videoDateId}`);
    } catch (error) {
      console.error('Error ending call:', error);
      toast.error('Error processing call end');
      navigate('/video-dates');
    }
  }, [callEnded, videoDateId, navigate]);

  useEffect(() => {
    if (!videoDateId || !user) {
      navigate('/video-dates');
      return;
    }

    async function setupCall() {
      setLoading(true);
      
      try {
        // Get video date details
        const { data: vd, error } = await supabase
          .from('video_dates')
          .select('*')
          .eq('id', videoDateId)
          .single();

        if (error || !vd) {
          toast.error('Video date not found');
          navigate('/video-dates');
          return;
        }

        if (!vd.daily_room_url) {
          toast.error('Video room not available');
          navigate('/video-dates');
          return;
        }

        // Determine the meeting token for this user
        const isSeeker = vd.seeker_id === user.id;
        const meetingToken = isSeeker ? vd.seeker_meeting_token : vd.earner_meeting_token;
        
        if (!meetingToken) {
          toast.error('Meeting token not available');
          navigate('/video-dates');
          return;
        }

        // Get other person's name
        const otherUserId = isSeeker ? vd.earner_id : vd.seeker_id;
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', otherUserId)
          .single();

        setVideoDate({
          ...vd,
          other_person_name: otherProfile?.name || 'User'
        });

        // Set initial time
        setTimeRemaining(vd.scheduled_duration * 60);

        // Create Daily call frame
        if (containerRef.current && !callFrameRef.current) {
          console.log('Creating Daily.co frame...');
          
          callFrameRef.current = DailyIframe.createFrame(containerRef.current, {
            iframeStyle: {
              position: 'absolute',
              width: '100%',
              height: '100%',
              border: '0',
              borderRadius: '0'
            },
            showLeaveButton: false,
            showFullscreenButton: false,
          });

          // Event listeners
          callFrameRef.current.on('joined-meeting', () => {
            console.log('Joined meeting successfully');
            setLoading(false);
            setHasJoined(true);
            const participants = callFrameRef.current?.participants();
            setParticipantCount(Object.keys(participants || {}).length);
          });

          callFrameRef.current.on('participant-joined', () => {
            const participants = callFrameRef.current?.participants();
            setParticipantCount(Object.keys(participants || {}).length);
          });

          callFrameRef.current.on('participant-left', () => {
            const participants = callFrameRef.current?.participants();
            const count = Object.keys(participants || {}).length;
            setParticipantCount(count);
            
            // If other participant left, show message
            if (count <= 1) {
              toast.info('The other participant has left the call');
            }
          });

          callFrameRef.current.on('left-meeting', () => {
            console.log('Left meeting');
          });

          callFrameRef.current.on('error', (error) => {
            console.error('Daily.co error:', error);
            toast.error('Video call error occurred');
          });

          // Join the room with meeting token
          console.log('Joining room:', vd.daily_room_url);
          await callFrameRef.current.join({ 
            url: vd.daily_room_url,
            token: meetingToken
          });

          // Update status to 'in_progress' and set actual_start
          await supabase
            .from('video_dates')
            .update({ 
              status: 'in_progress',
              actual_start: new Date().toISOString()
            })
            .eq('id', videoDateId);

          // Start countdown timer
          timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
              if (prev <= 1) {
                handleCallEnd();
                return 0;
              }
              // Warning at 5 minutes
              if (prev === 300) {
                toast.warning('5 minutes remaining');
              }
              // Warning at 1 minute
              if (prev === 60) {
                toast.warning('1 minute remaining');
              }
              return prev - 1;
            });
          }, 1000);
        }
      } catch (error) {
        console.error('Error setting up call:', error);
        toast.error('Failed to join video call');
        navigate('/video-dates');
      }
    }

    setupCall();

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (callFrameRef.current) {
        callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [videoDateId, user, navigate, handleCallEnd]);

  const handleMute = () => {
    if (callFrameRef.current) {
      callFrameRef.current.setLocalAudio(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const handleVideoToggle = () => {
    if (callFrameRef.current) {
      callFrameRef.current.setLocalVideo(videoOff);
      setVideoOff(!videoOff);
    }
  };

  const isWaitingForOther = hasJoined && participantCount <= 1;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCallEnd}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          End Call
        </Button>
        
        <div className="text-white font-medium">
          Video Date with {videoDate?.other_person_name || '...'}
        </div>
        
        <div className="w-24" /> {/* Spacer for centering */}
      </div>

      {/* Video Container */}
      <div ref={containerRef} className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-white/80">Connecting to video call...</p>
            </div>
          </div>
        )}
        
        {/* Waiting Room Overlay */}
        {isWaitingForOther && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="text-center max-w-md mx-auto px-6">
              <Avatar className="w-24 h-24 mx-auto mb-6 border-4 border-primary/30">
                <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                  {videoDate?.other_person_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="text-2xl font-semibold text-white mb-2">
                Waiting for {videoDate?.other_person_name || 'participant'}
              </h2>
              
              <p className="text-white/60 mb-6">
                They'll join any moment now. Make sure your camera and microphone are ready!
              </p>
              
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Waiting...</span>
              </div>
              
              <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <Users className="w-4 h-4" />
                  <span>You're the first one here</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black/90 to-transparent">
        {/* Timer */}
        <div className={cn(
          "flex items-center justify-center gap-2 mb-4 text-lg font-mono",
          timeRemaining <= 60 ? "text-destructive animate-pulse" : "text-white"
        )}>
          <Clock className="w-5 h-5" />
          <span>Time Remaining: {formatTime(timeRemaining)}</span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          {/* Mute Button */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleMute}
            className={cn(
              "rounded-full w-16 h-16 border-2",
              isMuted 
                ? "bg-destructive/20 border-destructive text-destructive hover:bg-destructive/30" 
                : "bg-white/10 border-white/30 text-white hover:bg-white/20"
            )}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          {/* Video Button */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleVideoToggle}
            className={cn(
              "rounded-full w-16 h-16 border-2",
              videoOff 
                ? "bg-destructive/20 border-destructive text-destructive hover:bg-destructive/30" 
                : "bg-white/10 border-white/30 text-white hover:bg-white/20"
            )}
          >
            {videoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>

          {/* End Call Button */}
          <Button
            size="lg"
            onClick={handleCallEnd}
            className="rounded-full w-16 h-16 bg-destructive hover:bg-destructive/90"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>

        {/* Participant indicator */}
        {participantCount > 0 && (
          <p className="text-center text-white/60 text-sm mt-3">
            {participantCount} participant{participantCount !== 1 ? 's' : ''} in call
          </p>
        )}
      </div>
    </div>
  );
}
