import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInMinutes, isPast } from 'date-fns';
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
import { Video, Clock, Gem, DollarSign, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getFunctionErrorMessage } from '@/lib/supabaseFunctionError';

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
}

export default function VideoDateCard({ 
  videoDate, 
  otherPerson, 
  isSeeker,
  onCancelled 
}: VideoDateCardProps) {
  const navigate = useNavigate();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const scheduledStart = new Date(videoDate.scheduled_start);
  const now = new Date();
  const minutesUntilStart = differenceInMinutes(scheduledStart, now);
  const canJoin = minutesUntilStart <= 5 && minutesUntilStart >= -videoDate.scheduled_duration;
  const isUpcoming = !isPast(scheduledStart) || minutesUntilStart >= -videoDate.scheduled_duration;

  const getTimeDisplay = () => {
    if (minutesUntilStart <= 0 && minutesUntilStart >= -videoDate.scheduled_duration) {
      return 'Happening now!';
    }
    if (minutesUntilStart <= 60 && minutesUntilStart > 0) {
      return `Starting in ${minutesUntilStart} minutes`;
    }
    const isToday = format(scheduledStart, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    const isTomorrow = format(scheduledStart, 'yyyy-MM-dd') === format(new Date(now.getTime() + 86400000), 'yyyy-MM-dd');
    
    if (isToday) {
      return `Today at ${format(scheduledStart, 'h:mm a')}`;
    }
    if (isTomorrow) {
      return `Tomorrow at ${format(scheduledStart, 'h:mm a')}`;
    }
    return format(scheduledStart, "EEEE, MMM d 'at' h:mm a");
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
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
        "overflow-hidden transition-all hover:shadow-lg",
        canJoin && "ring-2 ring-primary animate-pulse-soft"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <Avatar className="w-14 h-14 ring-2 ring-primary/20">
              <AvatarImage 
                src={otherPerson.profile_photos?.[0]} 
                alt={otherPerson.name || 'User'} 
              />
              <AvatarFallback className="bg-primary/20 text-primary text-lg">
                {otherPerson.name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-primary shrink-0" />
                <h3 className="font-semibold truncate">
                  Video Date with {otherPerson.name || 'User'}
                </h3>
              </div>

              <p className={cn(
                "text-sm mb-2",
                canJoin ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {getTimeDisplay()}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{videoDate.scheduled_duration} minutes</span>
                </div>

                {isSeeker ? (
                  <div className="flex items-center gap-1">
                    <Gem className="w-3.5 h-3.5 text-primary" />
                    <span>{videoDate.credits_reserved} credits reserved</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-teal">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>You'll earn ${videoDate.earner_amount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Badge */}
            {canJoin && (
              <Badge className="bg-primary text-primary-foreground shrink-0">
                Live Now
              </Badge>
            )}
          </div>

          {/* Actions */}
          {isUpcoming && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <Button
                onClick={handleJoinCall}
                disabled={!canJoin}
                className={cn(
                  "flex-1",
                  canJoin 
                    ? "bg-primary hover:bg-primary/90" 
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Video className="w-4 h-4 mr-2" />
                {canJoin ? 'Join Call' : `Available in ${Math.max(0, minutesUntilStart - 5)} min`}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Video Date?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this video date with {otherPerson.name}?
              {isSeeker && ' Your reserved credits will be refunded.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Date</AlertDialogCancel>
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
