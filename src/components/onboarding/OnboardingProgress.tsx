import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const progress = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="font-medium bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
          {Math.round(progress)}% Complete
        </span>
      </div>

      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            "bg-gradient-to-r from-rose-500 to-purple-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
