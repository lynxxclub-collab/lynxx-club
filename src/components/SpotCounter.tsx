// File: src/components/SpotCounter.tsx
// Reusable component to display available spots with real-time updates

import { useSpotCounts } from "@/hooks/useSpotCounts";
import { Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpotCounterProps {
  type: "seeker" | "earner";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function SpotCounter({ type, className, size = "md" }: SpotCounterProps) {
  const { seekerSpotsRemaining, earnerSpotsRemaining, loading } = useSpotCounts();

  const spotsRemaining = type === "seeker" ? seekerSpotsRemaining : earnerSpotsRemaining;
  const total = type === "seeker" ? 100 : 50;
  const percentage = (spotsRemaining / total) * 100;

  // Determine color based on spots remaining
  const getColorClass = () => {
    if (percentage > 50) return "text-green-400";
    if (percentage > 20) return "text-yellow-400";
    return "text-red-400";
  };

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="w-4 h-4 animate-spin text-white/40" />
        <span className={cn("text-white/60", sizeClasses[size])}>Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Users className={cn("w-4 h-4", getColorClass())} />
      <span className={cn("font-medium", getColorClass(), sizeClasses[size])}>
        {spotsRemaining} / {total}
      </span>
      <span className={cn("text-white/60", sizeClasses[size])}>spots remaining</span>
    </div>
  );
}
