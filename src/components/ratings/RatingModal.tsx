import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ratedUserId: string;
  ratedUserName: string;
  conversationId?: string;
}

interface StarRatingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function StarRating({ label, value, onChange }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="p-1 transition-transform hover:scale-110"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
          >
            <Star
              className={cn(
                "w-6 h-6 transition-colors",
                (hovered || value) >= star
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RatingModal({
  open,
  onOpenChange,
  ratedUserId,
  ratedUserName,
  conversationId
}: RatingModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [conversationQuality, setConversationQuality] = useState(0);
  const [respectBoundaries, setRespectBoundaries] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [wouldInteractAgain, setWouldInteractAgain] = useState<boolean | null>(null);
  const [reviewText, setReviewText] = useState('');

  const handleSubmit = async () => {
    if (!user || overallRating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('ratings').insert({
        rater_id: user.id,
        rated_id: ratedUserId,
        conversation_id: conversationId || null,
        overall_rating: overallRating,
        conversation_quality: conversationQuality || null,
        respect_boundaries: respectBoundaries || null,
        punctuality: punctuality || null,
        would_interact_again: wouldInteractAgain,
        review_text: reviewText.trim() || null
      });

      if (error) throw error;

      toast.success('Rating submitted successfully!');
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOverallRating(0);
    setConversationQuality(0);
    setRespectBoundaries(0);
    setPunctuality(0);
    setWouldInteractAgain(null);
    setReviewText('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            How was your interaction with {ratedUserName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <StarRating
            label="Overall Rating *"
            value={overallRating}
            onChange={setOverallRating}
          />

          <StarRating
            label="Conversation Quality"
            value={conversationQuality}
            onChange={setConversationQuality}
          />

          <StarRating
            label="Respect & Boundaries"
            value={respectBoundaries}
            onChange={setRespectBoundaries}
          />

          <StarRating
            label="Punctuality"
            value={punctuality}
            onChange={setPunctuality}
          />

          <div className="space-y-2">
            <Label className="text-sm">Would you interact again?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={wouldInteractAgain === true ? "default" : "outline"}
                size="sm"
                onClick={() => setWouldInteractAgain(true)}
              >
                Yes
              </Button>
              <Button
                type="button"
                variant={wouldInteractAgain === false ? "default" : "outline"}
                size="sm"
                onClick={() => setWouldInteractAgain(false)}
              >
                No
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Review (optional)</Label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={loading || overallRating === 0}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Rating
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}