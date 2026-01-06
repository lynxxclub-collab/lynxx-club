import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2, Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ratedUserId: string;
  ratedUserName: string;
  conversationId?: string;
  videoDateId?: string;
}

export default function RatingModal({
  open,
  onOpenChange,
  ratedUserId,
  ratedUserName,
  conversationId,
  videoDateId,
}: RatingModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);

    try {
      // Build the rating object with correct column names
      const ratingInsert = {
        rater_id: user.id,
        rated_id: ratedUserId,
        overall_rating: rating,
        review_text: comment.trim() || null,
        conversation_id: conversationId || null,
        video_date_id: videoDateId || null,
      };

      const { error } = await supabase.from("ratings").insert(ratingInsert);

      if (error) {
        if (error.code === "23505") {
          toast.error("You have already rated this user");
        } else {
          throw error;
        }
      } else {
        toast.success("Rating submitted!");
        onOpenChange(false);
        setRating(0);
        setComment("");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;
  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md p-0 overflow-hidden border-white/10 bg-[#0f0f12]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="px-6 pt-6 pb-2">
          <DialogHeader className="text-center space-y-2">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Sparkles className="w-10 h-10 text-amber-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white tracking-tight">Rate Your Experience</DialogTitle>
            <DialogDescription className="text-white/60 text-base">
              How was your conversation with <span className="text-white font-medium">{ratedUserName}</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-8">
            {/* Star Rating */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-transform active:scale-90"
                  >
                    <Star
                      className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 transition-colors duration-200",
                        star <= displayRating 
                          ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                          : "text-white/10",
                      )}
                    />
                  </button>
                ))}
              </div>
              <p
                className={cn(
                  "text-sm font-bold uppercase tracking-wider h-5 transition-opacity",
                  displayRating > 0 ? "opacity-100 text-amber-400" : "opacity-0",
                )}
              >
                {ratingLabels[displayRating]}
              </p>
            </div>

            {/* Comment */}
            <div className="space-y-3">
              <Label htmlFor="comment" className="text-white/90 text-sm font-medium">
                Share your experience (optional)
              </Label>
              <Textarea
                id="comment"
                placeholder="What made this conversation memorable?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[100px] resize-none bg-[#0a0a0f] border-white/10 text-white placeholder:text-white/20 focus:border-amber-500/50 focus:ring-amber-500/20 transition-all"
                maxLength={500}
              />
              <div className="flex justify-end">
                <p className={cn("text-xs font-medium", comment.length >= 500 ? "text-amber-400" : "text-white/30")}>
                  {comment.length}/500
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 flex-col gap-3 sm:flex-row bg-[#08080b] border-t border-white/5">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="w-full sm:w-auto h-12 border-white/10 text-white/70 hover:text-white hover:bg-white/5 font-medium"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className={cn(
              "w-full sm:w-auto h-12 text-white font-bold transition-all duration-300",
              "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400",
              "shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Rating
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}