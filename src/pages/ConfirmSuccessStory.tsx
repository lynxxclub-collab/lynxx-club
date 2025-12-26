import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageSquare, Video, Gift, Star, User, ArrowLeft, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { requireValidUUID } from '@/lib/sanitize';

interface StoryDetails {
  id: string;
  initiator_id: string;
  partner_id: string;
  status: string;
  how_met: string | null;
  story_text: string;
  partner_confirmation_expires_at: string;
  initiator: {
    id: string;
    name: string;
    profile_photos: string[];
  };
  conversationStats: {
    totalMessages: number;
    videoDates: number;
    firstMessageDate: string;
  };
}

export default function ConfirmSuccessStory() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [story, setStory] = useState<StoryDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<'confirmed' | 'denied' | null>(null);

  useEffect(() => {
    if (!storyId || !user) return;
    fetchStoryDetails();
  }, [storyId, user]);

  async function fetchStoryDetails() {
    if (!storyId || !user) return;
    setLoading(true);

    try {
      // Get story details
      const { data: storyData, error: storyError } = await supabase
        .from('success_stories')
        .select('*')
        .eq('id', storyId)
        .single();

      if (storyError || !storyData) {
        setError('Story not found');
        setLoading(false);
        return;
      }

      // Verify user is the partner
      if (storyData.partner_id !== user.id) {
        setError('You are not authorized to confirm this story');
        setLoading(false);
        return;
      }

      // Check if expired
      if (new Date() > new Date(storyData.partner_confirmation_expires_at)) {
        setError('This confirmation request has expired');
        setLoading(false);
        return;
      }

      // Check if already responded
      if (storyData.status !== 'pending_partner_confirmation') {
        setError('This request has already been processed');
        setLoading(false);
        return;
      }

      // Get initiator profile
      const { data: initiatorProfile } = await supabase
        .from('profiles')
        .select('id, name, profile_photos')
        .eq('id', storyData.initiator_id)
        .single();

      // Validate UUIDs before using in queries
      const validInitiatorId = requireValidUUID(storyData.initiator_id, 'initiator ID');
      const validUserId = requireValidUUID(user.id, 'user ID');
      
      // Get conversation stats
      const { data: conversation } = await supabase
        .from('conversations')
        .select('total_messages, created_at')
        .or(`and(seeker_id.eq.${validInitiatorId},earner_id.eq.${validUserId}),and(seeker_id.eq.${validUserId},earner_id.eq.${validInitiatorId})`)
        .limit(1)
        .maybeSingle();

      // Get video date count
      const { count: videoDatesCount } = await supabase
        .from('video_dates')
        .select('*', { count: 'exact', head: true })
        .or(`and(seeker_id.eq.${validInitiatorId},earner_id.eq.${validUserId}),and(seeker_id.eq.${validUserId},earner_id.eq.${validInitiatorId})`)
        .eq('status', 'completed');

      setStory({
        ...storyData,
        initiator: initiatorProfile || { id: storyData.initiator_id, name: 'User', profile_photos: [] },
        conversationStats: {
          totalMessages: conversation?.total_messages || 0,
          videoDates: videoDatesCount || 0,
          firstMessageDate: conversation?.created_at || storyData.created_at
        }
      });
    } catch (err) {
      console.error('Error fetching story:', err);
      setError('Failed to load story details');
    } finally {
      setLoading(false);
    }
  }

  const handleConfirm = async (confirmed: boolean) => {
    if (!story || !user) return;

    setSubmitting(true);
    try {
      if (confirmed) {
        // Partner confirms
        const { error } = await supabase
          .from('success_stories')
          .update({
            status: 'partner_confirmed',
            partner_confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', story.id);

        if (error) throw error;
        setResult('confirmed');
        toast.success('Thank you for confirming!');
      } else {
        // Partner denies - update story status
        const { error: updateError } = await supabase
          .from('success_stories')
          .update({
            status: 'rejected_partner_denied',
            updated_at: new Date().toISOString()
          })
          .eq('id', story.id);

        if (updateError) throw updateError;

        // Create fraud flag (this will use service role via RLS)
        const { error: flagError } = await supabase
          .from('fraud_flags')
          .insert({
            user_id: story.initiator_id,
            flag_type: 'partner_denied',
            severity: 'HIGH',
            reason: 'Partner denied success story claim',
            details: { story_id: story.id, partner_id: user.id }
          });

        if (flagError) {
          console.error('Error creating fraud flag:', flagError);
          // Don't throw - the main operation succeeded
        }

        setResult('denied');
        toast.success('Thank you for your honesty');
      }
    } catch (err: any) {
      console.error('Error processing confirmation:', err);
      toast.error(err.message || 'Failed to process your response');
    } finally {
      setSubmitting(false);
    }
  };

  const daysRemaining = story 
    ? Math.max(0, differenceInDays(new Date(story.partner_confirmation_expires_at), new Date()))
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 flex-1" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold">{error}</h1>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Confirmed result screen
  if (result === 'confirmed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto">
              <Heart className="w-10 h-10 text-white fill-white" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-display font-bold">Confirmed! 🎉</h1>
              <p className="text-muted-foreground">
                You and {story?.initiator.name} can now complete the survey to earn your $25 gift cards.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => navigate(`/success-story/survey/${storyId}`)}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                size="lg"
              >
                Complete Survey Now
              </Button>
              <p className="text-xs text-muted-foreground">
                You can also complete it later from your Settings page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Denied result screen
  if (result === 'denied') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <X className="w-10 h-10 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-display font-bold">Request Declined</h1>
              <p className="text-muted-foreground">
                Thank you for your honesty. We've notified the other user.
              </p>
              <p className="text-sm text-muted-foreground">
                This helps keep Lynxx Club trustworthy for everyone.
              </p>
            </div>

            <Button onClick={() => navigate('/')} variant="outline" size="lg" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!story) return null;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
            <h1 className="text-2xl font-display font-bold">Success Story Confirmation</h1>
          </div>
        </div>

        {/* Initiator Card */}
        <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="w-24 h-24 border-4 border-pink-500/30">
                <AvatarImage src={story.initiator.profile_photos?.[0]} />
                <AvatarFallback>
                  <User className="w-10 h-10" />
                </AvatarFallback>
              </Avatar>
              
              <div>
                <p className="text-lg font-semibold">{story.initiator.name}</p>
                <p className="text-muted-foreground">
                  says you found love together on Lynxx Club!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversation Stats */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Your conversation:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>{story.conversationStats.totalMessages} messages exchanged</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Video className="w-4 h-4 text-gold" />
                <span>{story.conversationStats.videoDates} video date{story.conversationStats.videoDates !== 1 ? 's' : ''} completed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>First message: {formatDistanceToNow(new Date(story.conversationStats.firstMessageDate), { addSuffix: true })}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="bg-teal/5 border-teal/20">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">If you confirm:</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Gift className="w-4 h-4 text-teal" />
                <span>Both earn $25 Amazon gift card</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-gold" />
                <span>Both get 6 months Alumni Access</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Heart className="w-4 h-4 text-pink-500" />
                <span>Share your story (optional)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Question */}
        <div className="text-center py-4">
          <p className="text-lg font-medium">Is this accurate?</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => handleConfirm(true)}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
            size="lg"
          >
            <Check className="w-4 h-4 mr-2" />
            Yes, Confirm! ❤️
          </Button>
          
          <Button
            onClick={() => handleConfirm(false)}
            disabled={submitting}
            variant="outline"
            size="lg"
            className="w-full border-destructive text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4 mr-2" />
            No, This Isn't True
          </Button>
        </div>

        {/* Expiry notice */}
        <p className="text-center text-sm text-muted-foreground">
          <Clock className="w-4 h-4 inline mr-1" />
          Request expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
