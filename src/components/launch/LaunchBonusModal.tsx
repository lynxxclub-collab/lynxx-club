import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Gift } from "lucide-react";

interface LaunchBonusModalProps {
  open: boolean;
  onClose: () => void;
  bonusType: "seeker" | "earner";
}

export default function LaunchBonusModal({ open, onClose, bonusType }: LaunchBonusModalProps) {
  const isSeekerBonus = bonusType === "seeker";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0f] border-white/10 p-0 overflow-hidden">
        {/* Top gradient bar */}
        <div
          className={`h-1 w-full bg-gradient-to-r ${isSeekerBonus ? "from-purple-500 via-rose-500 to-purple-500" : "from-amber-500 via-orange-500 to-amber-500"}`}
        />

        {/* Confetti/celebration effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className={`absolute -top-20 -left-20 w-40 h-40 rounded-full blur-[80px] ${isSeekerBonus ? "bg-purple-500/20" : "bg-amber-500/20"}`}
          />
          <div
            className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] ${isSeekerBonus ? "bg-rose-500/20" : "bg-orange-500/20"}`}
          />
        </div>

        <div className="relative p-6 text-center">
          <DialogHeader className="space-y-4">
            {/* Icon */}
            <div className="mx-auto relative">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center ${isSeekerBonus ? "bg-gradient-to-br from-purple-500/20 to-rose-500/20 border border-purple-500/30" : "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30"}`}
              >
                {isSeekerBonus ? (
                  <Gift className="w-10 h-10 text-purple-400" />
                ) : (
                  <Star className="w-10 h-10 text-amber-400" />
                )}
              </div>
              <div
                className={`absolute inset-0 blur-xl -z-10 ${isSeekerBonus ? "bg-purple-500/30" : "bg-amber-500/30"}`}
              />
            </div>

            {/* Title */}
            <DialogTitle className="text-2xl text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              {isSeekerBonus ? (
                <>
                  🎉 Welcome{" "}
                  <span className="bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent">
                    Bonus!
                  </span>
                </>
              ) : (
                <>
                  🌟 Featured{" "}
                  <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    Earner!
                  </span>
                </>
              )}
            </DialogTitle>

            {/* Description */}
            <DialogDescription className="text-base text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {isSeekerBonus ? (
                <>
                  As one of our <span className="text-purple-400 font-semibold">first 100 Seekers</span>, you've
                  received <span className="text-purple-400 font-semibold">100 bonus credits</span> ($10 value)!
                </>
              ) : (
                <>
                  As one of our <span className="text-amber-400 font-semibold">first 50 Earners</span>, your profile
                  will be <span className="text-amber-400 font-semibold">featured for 30 days</span>!
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Perk card */}
          <div
            className={`mt-6 p-4 rounded-xl border ${isSeekerBonus ? "bg-purple-500/10 border-purple-500/20" : "bg-amber-500/10 border-amber-500/20"}`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className={`w-5 h-5 ${isSeekerBonus ? "text-purple-400" : "text-amber-400"}`} />
              <span className="font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Early Adopter Perk
              </span>
            </div>
            <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {isSeekerBonus
                ? "That's 20 messages or one 15-minute video date!"
                : "You'll appear at the top of search results, getting more visibility."}
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={onClose}
            className={`mt-6 w-full h-12 font-semibold rounded-xl shadow-lg transition-all duration-300 ${
              isSeekerBonus
                ? "bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-400 hover:to-rose-400 text-white shadow-purple-500/20"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/20"
            }`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Let's Go!
          </Button>
        </div>

        {/* Font import */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
