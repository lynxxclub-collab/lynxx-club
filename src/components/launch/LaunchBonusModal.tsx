TypeScript is trying to compile the **backticks + “tsx”** as code, so it explodes on line 1.

## ✅ Fix (copy/paste): remove the fences and use this exact file

Replace the *entire* contents of `src/components/launch/LaunchBonusModal.tsx` with this **without** the ``` lines:

```tsx
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
  bonusType: "seeker" | "earner";
}

export default function LaunchBonusModal({
  open,
  onClose,
  bonusType,
}: LaunchBonusModalProps) {
  const isSeekerBonus = bonusType === "seeker";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0f] border-white/10 p-0 overflow-hidden gap-0">
        {/* Top gradient bar */}
        <div
          className={`h-1.5 w-full bg-gradient-to-r ${
            isSeekerBonus
              ? "from-purple-500 via-rose-500 to-purple-500"
              : "from-amber-500 via-orange-500 to-amber-500"
          }`}
        />

        {/* Ambient background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div
            className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[100px] ${
              isSeekerBonus ? "bg-purple-500/20" : "bg-rose-500/20"
            }`}
          />
          <div
            className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[100px] ${
              isSeekerBonus ? "bg-rose-500/20" : "bg-orange-500/20"
            }`}
          />
        </div>

        <div className="relative p-4 sm:p-8 text-center">
          <DialogHeader className="space-y-4 sm:space-y-6">
            {/* Icon */}
            <div className="mx-auto relative w-fit">
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  isSeekerBonus
                    ? "bg-gradient-to-br from-purple-500/10 to-rose-500/10 border border-purple-500/30 shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]"
                    : "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]"
                }`}
              >
                {isSeekerBonus ? (
                  <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
                ) : (
                  <Star className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 fill-amber-400/20" />
                )}
              </div>

              {/* Subtle pulse effect behind icon */}
              <div
                className={`absolute inset-0 rounded-2xl blur-xl opacity-50 animate-pulse ${
                  isSeekerBonus ? "bg-purple-500/30" : "bg-amber-500/30"
                }`}
                style={{ animationDuration: "3s" }}
              />
            </div>

            {/* Title */}
            <DialogTitle
              className="text-2xl sm:text-3xl font-bold text-white leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
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
            <DialogDescription
              className="text-base text-white/60 leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {isSeekerBonus ? (
                <>
                  As one of our{" "}
                  <span className="text-purple-400 font-semibold">
                    first 100 Seekers
                  </span>
                  , you've received{" "}
                  <span className="text-purple-400 font-semibold">
                    100 bonus credits
                  </span>{" "}
                  ($10 value)!
                </>
              ) : (
                <>
                  As one of our{" "}
                  <span className="text-amber-400 font-semibold">
                    first 50 Earners
                  </span>
                  , your profile will be{" "}
                  <span className="text-amber-400 font-semibold">
                    featured for 30 days
                  </span>
                  !
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Perk Card */}
          <div
            className={`mt-6 sm:mt-8 p-4 sm:p-5 rounded-xl border backdrop-blur-sm ${
              isSeekerBonus
                ? "bg-purple-500/5 border-purple-500/20"
                : "bg-amber-500/5 border-amber-500/20"
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles
                className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  isSeekerBonus ? "text-purple-400" : "text-amber-400"
                }`}
              />
              <span
                className="text-sm sm:text-base font-semibold text-white uppercase tracking-wide"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Early Adopter Perk
              </span>
            </div>
            <p
              className="text-sm text-white/50 leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {isSeekerBonus
                ? "That's 20 messages or one 15-minute video date!"
                : "You'll appear at the top of search results, getting more visibility."}
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={onClose}
            className={`mt-6 sm:mt-8 w-full h-12 sm:h-14 text-base sm:text-lg font-bold rounded-xl shadow-lg transition-all duration-300 active:scale-95 ${
              isSeekerBonus
                ? "bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white shadow-purple-500/20 hover:shadow-purple-500/40"
                : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-500/20 hover:shadow-amber-500/40"
            }`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Let&apos;s Go!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
