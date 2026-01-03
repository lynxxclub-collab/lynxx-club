import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Gift } from "lucide-react";

type BonusType = "seeker" | "earner";

interface LaunchBonusModalProps {
  open: boolean;
  onClose: () => void;
  bonusType: BonusType;
}

export default function LaunchBonusModal({
  open,
  onClose,
  bonusType,
}: LaunchBonusModalProps) {
  const isSeekerBonus = bonusType === "seeker";

  // shadcn Dialog calls onOpenChange(nextOpen:boolean)
  // We only want to call onClose when it becomes false.
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onClose();
  };

  const title = isSeekerBonus ? (
    <>
      🎉 Welcome{" "}
      <span className="bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent">
        Bonus
      </span>
      !
    </>
  ) : (
    <>
      🌟 Featured{" "}
      <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
        Earner
      </span>
      !
    </>
  );

  const description = isSeekerBonus ? (
    <>
      You’re one of our{" "}
      <span className="text-purple-300 font-semibold">first 100 Seekers</span> —
      we just added{" "}
      <span className="text-purple-300 font-semibold">100 bonus credits</span>{" "}
      to your account.
    </>
  ) : (
    <>
      You’re one of our{" "}
      <span className="text-amber-300 font-semibold">first 50 Earners</span> —
      your profile will be{" "}
      <span className="text-amber-300 font-semibold">featured for 30 days</span>.
    </>
  );

  const perkBody = isSeekerBonus
    ? "Use them for messages, images, or your first video date."
    : "You’ll show higher in discovery so more seekers can find you.";

  const gradientBar = isSeekerBonus
    ? "from-purple-500 via-rose-500 to-purple-500"
    : "from-amber-500 via-orange-500 to-amber-500";

  const glowLeft = isSeekerBonus ? "bg-purple-500/20" : "bg-rose-500/20";
  const glowRight = isSeekerBonus ? "bg-rose-500/20" : "bg-orange-500/20";

  const iconWrap = isSeekerBonus
    ? "bg-gradient-to-br from-purple-500/20 to-rose-500/20 border border-purple-500/30"
    : "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30";

  const iconColor = isSeekerBonus ? "text-purple-400" : "text-amber-400";

  const perkCard = isSeekerBonus
    ? "bg-purple-500/10 border-purple-500/20"
    : "bg-rose-500/10 border-amber-500/20";

  const buttonClass = isSeekerBonus
    ? "bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-400 hover:to-rose-400 text-white shadow-purple-500/20"
    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/20";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-[#0a0a0f] border-white/10 p-0 overflow-hidden"
        // prevent accidental closing if you want:
        // onPointerDownOutside={(e) => e.preventDefault()}
        // onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Top gradient bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${gradientBar}`} />

        {/* Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full blur-[80px] ${glowLeft}`} />
          <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] ${glowRight}`} />
        </div>

        <div className="relative p-6 text-center">
          <DialogHeader className="space-y-4">
            {/* Icon */}
            <div className="mx-auto relative">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${iconWrap}`}>
                {isSeekerBonus ? (
                  <Gift className={`w-10 h-10 ${iconColor}`} />
                ) : (
                  <Star className={`w-10 h-10 ${iconColor}`} />
                )}
              </div>
              <div className={`absolute inset-0 blur-xl -z-10 ${isSeekerBonus ? "bg-purple-500/30" : "bg-rose-500/30"}`} />
            </div>

            {/* Title */}
            <DialogTitle className="text-2xl text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              {title}
            </DialogTitle>

            {/* Description */}
            <DialogDescription className="text-base text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {description}
            </DialogDescription>
          </DialogHeader>

          {/* Perk card */}
          <div className={`mt-6 p-4 rounded-xl border ${perkCard}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className={`w-5 h-5 ${iconColor}`} />
              <span className="font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Early Adopter Perk
              </span>
            </div>
            <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {perkBody}
            </p>
          </div>

          {/* CTA */}
          <Button
            onClick={onClose}
            className={`mt-6 w-full h-12 font-semibold rounded-xl shadow-lg transition-all duration-300 ${buttonClass}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Let’s go
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}