import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Gift } from "lucide-react";

interface LaunchBonusModalProps {
  open: boolean;
  onClose: () => void;
  bonusType: 'seeker' | 'earner';
}

export default function LaunchBonusModal({ open, onClose, bonusType }: LaunchBonusModalProps) {
  const isSeekerBonus = bonusType === 'seeker';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-teal/20 flex items-center justify-center">
            {isSeekerBonus ? (
              <Gift className="w-10 h-10 text-primary" />
            ) : (
              <Star className="w-10 h-10 text-gold" />
            )}
          </div>
          <DialogTitle className="text-2xl font-display">
            {isSeekerBonus ? '🎉 Welcome Bonus!' : '🌟 Featured Earner!'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isSeekerBonus ? (
              <>
                As one of our <span className="text-primary font-semibold">first 100 Seekers</span>, 
                you've received <span className="text-primary font-semibold">100 bonus credits</span> ($10 value)!
              </>
            ) : (
              <>
                As one of our <span className="text-gold font-semibold">first 50 Earners</span>, 
                your profile will be <span className="text-gold font-semibold">featured for 30 days</span>!
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className={`mt-4 p-4 rounded-xl ${isSeekerBonus ? 'bg-primary/10 border border-primary/20' : 'bg-gold/10 border border-gold/20'}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className={`w-5 h-5 ${isSeekerBonus ? 'text-primary' : 'text-gold'}`} />
            <span className="font-semibold">Early Adopter Perk</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isSeekerBonus
              ? "That's 20 messages or one 15-minute video date!"
              : "You'll appear at the top of search results, getting more visibility."
            }
          </p>
        </div>

        <Button 
          onClick={onClose} 
          className={`mt-6 w-full ${isSeekerBonus ? 'bg-primary hover:bg-primary/90' : 'bg-gold hover:bg-gold/90 text-background'}`}
        >
          Let's Go!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
