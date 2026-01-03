// src/components/onboarding/EarnerCard.tsx
import React from "react";
import { Check, Wallet, ArrowRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type EarnerCardProps = {
  selected: boolean;
  loading: boolean;
  isCapped: boolean;
  spotsRemaining: number;
  onSelect: () => void;
  className?: string;
};

export function EarnerCard({
  selected,
  loading,
  isCapped,
  spotsRemaining,
  onSelect,
  className,
}: EarnerCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      className={cn(
        "relative p-6 rounded-xl border-2 transition-all duration-300 text-left group",
        selected
          ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20"
          : "border-white/10 bg-white/[0.02] hover:border-purple-500/50 hover:bg-white/[0.05]",
        className,
      )}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="mb-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-rose-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
          <Wallet className="w-8 h-8 text-white" />
        </div>

        <h3 className="text-xl font-display font-semibold mb-2 text-white">I Want to Earn</h3>

        <p className="text-white/60 text-sm leading-relaxed">
          Get paid to chat and go on dates. Set your rates and earn on your terms.
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-white/60">
          <ArrowRight className="w-3 h-3 text-purple-400" />
          Earn money per message
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <ArrowRight className="w-3 h-3 text-purple-400" />
          Set your own rates
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <ArrowRight className="w-3 h-3 text-purple-400" />
          Withdraw anytime
        </div>
      </div>

      {isCapped ? (
        <div className="mt-4 px-3 py-1.5 bg-purple-500/20 rounded-full text-xs text-purple-300 font-medium inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Application required
        </div>
      ) : (
        <div className="mt-4 px-3 py-1.5 bg-purple-500/20 rounded-full text-xs text-purple-300 font-medium inline-block">
          ⭐ {spotsRemaining} spots left — get featured!
        </div>
      )}
    </button>
  );
}

export default EarnerCard;