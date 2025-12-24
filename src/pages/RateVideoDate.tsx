import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StarRatingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
}

function StarRating({ label, value, onChange, required }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
          >
            <Star
              className={cn(
                "w-8 h-8 transition-colors",
                (hovered || value) >= star
                  ? "fill-gold text-gold"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

interface VideoDateInfo {
  id: string;
  seeker_id: string;
  earner_id: string;
  other_person: {
    id: string;
    name: string;
    profile_photos: string[];
    date_of_birth: string;
  };
}

export default function RateVideoDate() {
  const { videoDateId } = useParams<{ videoDateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [videoDate, setVideoDate] = useState<VideoDateInfo | null>(null);

  // Rating states
  const [overallRating, setOverallRating] = useState(0);
  const [conversationQuality, setConversationQuality] = useState(0);
  const [respectBoundaries, setRespectBoundaries] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [wouldDateAgain, setWouldDateAgain] = useState<boolean | null>(null);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    if (!videoDateId || !user) {
      navigate('/video-dates');
      return;
    }

    async function loadVideoDate() {
      try {
        // Check if already rated
        const { data: existingRating } = await supabase
          .from('ratings')
          .select('id')
          .eq('video_date_id', videoDateId)
          .eq('rater_id', user!.id)
          .maybeSingle();

        if (existingRating) {
          setAlreadyRated(true);
          setLoading(false);
          return;
        }

        // Get video date info
        const { data: vd, error } = await supabase
          .from('video_dates')
          .select('id, seeker_id, earner_id')
          .eq('id', videoDateId)
          .single();

        if (error || !vd) {
          toast.error('Video date not found');
          navigate('/video-dates');
          return;
        }

        // Get other person's profile
        const otherUserId = vd.seeker_id === user!.id ? vd.earner_id : vd.seeker_id;
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('id, name, profile_photos, date_of_birth')
          .eq('id', otherUserId)
          .single();

        setVideoDate({
          ...vd,
          other_person: otherProfile || {
            id: otherUserId,
            name: 'User',
            profile_photos: [],
            date_of_birth: ''
          }
        });
      } catch (error) {
        console.error('Error loading video date:', error);
        toast.error('Failed to load video date');
      } finally {
        setLoading(false);
      }
    }

    loadVideoDate();
  }, [videoDateId, user, navigate]);

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async () => {
    if (!user || !videoDate || overallRating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('ratings').insert({
        rater_id: user.id,
        rated_id: videoDate.other_person.id,
        video_date_id: videoDate.id,
        overall_rating: overallRating,
        conversation_quality: conversationQuality || null,
        respect_boundaries: respectBoundaries || null,
        punctuality: punctuality || null,
        would_interact_again: wouldDateAgain,
        review_text: reviewText.trim().slice(0, 500) || null
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already rated this video date');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Thank you for your feedback!');
      navigate('/video-dates');
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      toast.error(error.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigate('/video-dates');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-6 w-32 mx-auto" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (alreadyRated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-display font-bold">Already Rated</h1>
          <p className="text-muted-foreground">You have already rated this video date.</p>
          <Button onClick={() => navigate('/video-dates')}>
            Back to Video Dates
          </Button>
        </div>
      </div>
    );
  }

  if (!videoDate) {
    return null;
  }

  const age = calculateAge(videoDate.other_person.date_of_birth);
  const photo = videoDate.other_person.profile_photos?.[0];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-display font-bold">How was your video date?</h1>
          
          {/* Profile photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20">
              <img
                src={photo || '/placeholder.svg'}
                alt={videoDate.other_person.name}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-lg font-medium">
              {videoDate.other_person.name}{age ? `, ${age}` : ''}
            </p>
          </div>
        </div>

        {/* Rating Form */}
        <div className="space-y-6 bg-card rounded-xl p-6 border border-border">
          <StarRating
            label="Overall rating"
            value={overallRating}
            onChange={setOverallRating}
            required
          />

          <div className="border-t border-border pt-6">
            <p className="text-sm text-muted-foreground mb-4">Rate these aspects:</p>
            
            <div className="space-y-5">
              <StarRating
                label="Conversation quality"
                value={conversationQuality}
                onChange={setConversationQuality}
              />

              <StarRating
                label="Respect & boundaries"
                value={respectBoundaries}
                onChange={setRespectBoundaries}
              />

              <StarRating
                label="Punctuality (was on time?)"
                value={punctuality}
                onChange={setPunctuality}
              />
            </div>
          </div>

          {/* Would date again */}
          <div className="border-t border-border pt-6 space-y-3">
            <Label className="text-sm">Would you date again?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={wouldDateAgain === true ? "default" : "outline"}
                size="sm"
                onClick={() => setWouldDateAgain(true)}
                className={wouldDateAgain === true ? "bg-teal hover:bg-teal/90" : ""}
              >
                Yes
              </Button>
              <Button
                type="button"
                variant={wouldDateAgain === null ? "outline" : wouldDateAgain === false ? "outline" : "outline"}
                size="sm"
                onClick={() => setWouldDateAgain(null)}
                className={wouldDateAgain === null ? "border-primary text-primary" : ""}
              >
                Maybe
              </Button>
              <Button
                type="button"
                variant={wouldDateAgain === false ? "default" : "outline"}
                size="sm"
                onClick={() => setWouldDateAgain(false)}
                className={wouldDateAgain === false ? "bg-destructive hover:bg-destructive/90" : ""}
              >
                No
              </Button>
            </div>
          </div>

          {/* Review text */}
          <div className="border-t border-border pt-6 space-y-2">
            <Label className="text-sm">
              Optional review
              <span className="text-muted-foreground ml-2">({reviewText.length}/500)</span>
            </Label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value.slice(0, 500))}
              placeholder="Share your experience..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="flex-1"
            disabled={submitting}
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={submitting || overallRating === 0}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Rating
          </Button>
        </div>
      </div>
    </div>
  );
}
