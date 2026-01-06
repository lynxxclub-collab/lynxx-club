import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div 
      className="space-y-2.5 w-full"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Header Labels */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-white/60">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
          {Math.round(progress)}% Complete
        </span>
      </div>

      {/* Progress Bar Track */}
      <div className="relative h-2 w-full bg-[#08080b] rounded-full overflow-hidden border border-white/10 shadow-inner">
        {/* Animated Fill */}
        <div
          className={cn(
            "absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out",
            // Matched theme gradient: Amber -> Rose -> Purple
            "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500",
            "shadow-[0_0_12px_rgba(244,63,94,0.6)]" // Glow effect
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}