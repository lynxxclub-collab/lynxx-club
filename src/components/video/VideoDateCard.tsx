import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInMinutes, isPast } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Video, Clock, Gem, DollarSign, X, Loader2, Headphones, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getFunctionErrorMessage } from '@/lib/supabaseFunctionError';
import { getSignedProfilePhotoUrl } from '@/lib/profilePhotoUrls';

interface VideoDateCardProps {
  videoDate: {
    id: string;
    scheduled_start: string;
    scheduled_duration: number;
    credits_reserved: number;
    earner_amount: number;
    status: string;
    daily_room_url: string | null;
    seeker_id: string;
    earner_id: string;
  };
  otherPerson: {
    id: string;
    name: string | null;
    profile_photos: string[] | null;
  };
  isSeeker: boolean;
  onCancelled?: () => void;
  onStatusChange?: (newStatus: string) => void;
}

export default function VideoDateCard({ 
  videoDate: initialVideoDate, 
  otherPerson, 
  isSeeker,
  onCancelled,
  onStatusChange 
}: VideoDateCardProps) {
  const navigate = useNavigate();
  const [videoDate, setVideoDate] = useState(initialVideoDate);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Load signed URL for avatar
  useEffect(() => {
    const loadAvatarUrl = async () => {
      if (otherPerson.profile_photos?.[0]) {
        const url = await getSignedProfilePhotoUrl(otherPerson.profile_photos[0]);
        setAvatarUrl(url);
      }
    };
    loadAvatarUrl();
  }, [otherPerson.profile_photos]);

  // Real-time subscription for video date status changes
  useEffect(() => {
    const channel = supabase
      .channel(`video-date-${videoDate.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_dates',
          filter: `id=eq.${videoDate.id}`
        },
        (payload) => {
          const newData = payload.new as typeof videoDate;
          setVideoDate(prev => ({ ...prev, ...newData }));
          if (newData.status !== videoDate.status) {
            onStatusChange?.(newData.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoDate.id, onStatusChange]);

  const scheduledStart = new Date(videoDate.scheduled_start);
  const now = new Date();
  const minutesUntilStart = differenceInMinutes(scheduledStart, now);
  const canJoin = minutesUntilStart <= 5 && minutesUntilStart >= -videoDate.scheduled_duration && videoDate.status === 'scheduled';
  const isUpcoming = (!isPast(scheduledStart) || minutesUntilStart >= -videoDate.scheduled_duration) && videoDate.status === 'scheduled';
  const isLive = minutesUntilStart <= 0 && minutesUntilStart >= -videoDate.scheduled_duration && videoDate.status === 'scheduled';

  const getTimeDisplay = () => {
    if (videoDate.status === 'cancelled') {
      return 'Cancelled';
    }
    if (videoDate.status === 'completed') {
      return 'Completed';
    }
    if (isLive) {
      return 'Happening now!';
    }
    if (minutesUntilStart <= 60 && minutesUntilStart > 0) {
      return `Starting in ${minutesUntilStart} minutes`;
    }
    const todayEST = formatInTimeZone(now, 'America/New_York', 'yyyy-MM-dd');
    const scheduledEST = formatInTimeZone(scheduledStart, 'America/New_York', 'yyyy-MM-dd');
    const tomorrowEST = formatInTimeZone(new Date(now.getTime() + 86400000), 'America/New_York', 'yyyy-MM-dd');
    
    if (scheduledEST === todayEST) {
      return `Today at ${formatInTimeZone(scheduledStart, 'America/New_York', 'h:mm a')} EST`;
    }
    if (scheduledEST === tomorrowEST) {
      return `Tomorrow at ${formatInTimeZone(scheduledStart, 'America/New_York', 'h:mm a')} EST`;
    }
    return formatInTimeZone(scheduledStart, 'America/New_York', "EEEE, MMM d 'at' h:mm a") + ' EST';
  };

  const getStatusBadge = () => {
    if (videoDate.status === 'cancelled') {
      return <Badge variant="destructive" className="shrink-0">Cancelled</Badge>;
    }
    if (videoDate.status === 'completed') {
      return <Badge className="bg-teal/20 text-teal border-teal/30 shrink-0">Completed</Badge>;
    }
    if (isLive) {
      return (
        <Badge className="bg-gradient-to-r from-rose-500 to-purple-500 text-white border-0 shrink-0 animate-pulse">
          Live Now
        </Badge>
      );
    }
    if (videoDate.status === 'pending') {
      return <Badge variant="secondary" className="shrink-0">Pending</Badge>;
    }
    return null;
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expired. Please log in again.');
        return;
      }
      
      const result = await supabase.functions.invoke('cancel-video-date', {
        body: { videoDateId: videoDate.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const errorMessage = getFunctionErrorMessage(result, 'Failed to cancel video date');
      if (errorMessage) {
        toast.error(errorMessage);
        return;
      }

      toast.success('Video date cancelled');
      onCancelled?.();
    } catch (error: any) {
      console.error('Cancel error:', error);
      toast.error(error.message || 'Failed to cancel video date');
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const handleJoinCall = () => {
    if (videoDate.daily_room_url) {
      navigate(`/video-call/${videoDate.id}`);
    } else {
      toast.error('Video room not available yet');
    }
  };

  return (
    <>
      <Card className={cn(
        "glass-card overflow-hidden transition-all duration-300 border-border/20",
        canJoin && "ring-2 ring-primary glow-rose",
        isLive && "border-primary/50"
      )}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Avatar with gradient ring */}
            <div className={cn(
              "relative rounded-full p-0.5",
              isLive 
                ? "bg-gradient-to-r from-rose-500 to-purple-500" 
                : "bg-gradient-to-r from-primary/50 to-purple/50"
            )}>
              <Avatar className="w-14 h-14 border-2 border-background">
                <AvatarImage 
                  src={avatarUrl || undefined} 
                  alt={otherPerson.name || 'User'} 
                />
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-purple/30 text-foreground text-lg font-display">
                  {otherPerson.name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                <h3 className="font-semibold text-foreground truncate">
                  Call with {otherPerson.name || 'User'}
                </h3>
              </div>

              <p className={cn(
                "text-sm mb-2 font-medium",
                isLive ? "text-gradient-rose-purple" : 
                videoDate.status === 'cancelled' ? "text-destructive" :
                videoDate.status === 'completed' ? "text-teal" :
                "text-muted-foreground"
              )}>
                {getTimeDisplay()}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple/70" />
                  <span>{videoDate.scheduled_duration} minutes</span>
                </div>

                {isSeeker ? (
                  <div className="flex items-center gap-1.5">
                    <Gem className="w-3.5 h-3.5 text-primary" />
                    <span className="text-primary/80">{videoDate.credits_reserved} credits</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-teal" />
                    <span className="text-teal">+${videoDate.earner_amount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Badge */}
            {getStatusBadge()}
          </div>

          {/* Actions */}
          {isUpcoming && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-border/20">
              <Button
                onClick={handleJoinCall}
                disabled={!canJoin}
                className={cn(
                  "flex-1 font-semibold transition-all duration-300",
                  canJoin 
                    ? "btn-gradient-rose" 
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary/70"
                )}
              >
                <Video className="w-4 h-4 mr-2" />
                {canJoin ? 'Join Call' : `Available in ${Math.max(0, minutesUntilStart - 5)} min`}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Show message button for completed/cancelled */}
          {(videoDate.status === 'completed' || videoDate.status === 'cancelled') && (
            <div className="mt-4 pt-4 border-t border-border/20">
              <Button
                variant="outline"
                className="w-full border-border/30 hover:bg-secondary/50"
                onClick={() => navigate(`/messages`)}
              >
                Message {otherPerson.name}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="glass-card border-border/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">Cancel Video Date?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to cancel this video date with {otherPerson.name}?
              {isSeeker && ' Your reserved credits will be refunded.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={cancelling}
              className="border-border/30 hover:bg-secondary/50"
            >
              Keep Date
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cancel Date
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
