import { useState } from "react";
import { Play, Sparkles, Coins } from "lucide-react";
import GiftAnimation from "@/components/gifts/GiftAnimation";
import { cn } from "@/lib/utils";

// Using a static list here for the preview demo, 
// but in production you might fetch the top 12 from 'gift_catalog'
const PREVIEW_GIFTS = [
  { id: "rose", emoji: "🌹", name: "Rose", credits: 50, animationType: "standard" as const },
  { id: "balloon", emoji: "🎈", name: "Balloon", credits: 60, animationType: "standard" as const },
  { id: "heart", emoji: "💝", name: "Heart Box", credits: 75, animationType: "standard" as const },
  { id: "confetti", emoji: "🎊", name: "Confetti", credits: 100, animationType: "standard" as const },
  { id: "champagne", emoji: "🍾", name: "Champagne", credits: 100, animationType: "standard" as const },
  { id: "trophy", emoji: "🏆", name: "Trophy", credits: 125, animationType: "premium" as const },
  { id: "teddy", emoji: "🧸", name: "Teddy Bear", credits: 150, animationType: "standard" as const },
  { id: "fireworks", emoji: "🎆", name: "Fireworks", credits: 175, animationType: "premium" as const },
  { id: "diamond", emoji: "💎", name: "Diamond", credits: 200, animationType: "premium" as const },
  { id: "rocket", emoji: "🚀", name: "Rocket", credits: 225, animationType: "premium" as const },
  { id: "lightning", emoji: "⚡", name: "Lightning", credits: 250, animationType: "ultra" as const },
  { id: "crown", emoji: "👑", name: "Crown", credits: 300, animationType: "ultra" as const },
];

export function GiftPreviewButton() {
  const [showingGift, setShowingGift] = useState<typeof PREVIEW_GIFTS[0] | null>(null);

  const handlePreview = (gift: typeof PREVIEW_GIFTS[0]) => {
    setShowingGift(gift);
    // Fallback timeout, though onComplete usually handles this
    setTimeout(() => setShowingGift(null), 3500);
  };

  return (
    <div 
      className="space-y-4 w-full"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
        {PREVIEW_GIFTS.map((gift) => (
          <button
            key={gift.id}
            onClick={() => handlePreview(gift)}
            disabled={showingGift !== null}
            className={cn(
              "group relative flex items-center justify-between gap-2 p-3 rounded-xl",
              "bg-white/[0.03] border border-white/10",
              "hover:bg-rose-500/10 hover:border-rose-500/30",
              "active:scale-[0.96] transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {/* Left: Emoji + Name */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform duration-200">
                {gift.emoji}
              </span>
              <span className="text-xs sm:text-sm font-medium text-white/80 truncate group-hover:text-white transition-colors">
                {gift.name}
              </span>
            </div>

            {/* Right: Sparkles + Credits */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Sparkles className={cn(
                "w-3 h-3 transition-colors",
                gift.animationType === 'ultra' ? "text-fuchsia-400" :
                gift.animationType === 'premium' ? "text-cyan-400" : "text-amber-400"
              )} />
              <span className="text-[10px] font-bold text-white/40 group-hover:text-white/60">
                {gift.credits}
              </span>
            </div>
          </button>
        ))}
      </div>
      
      {/* Helper Text */}
      <p className="text-white/30 text-xs flex items-center gap-2 justify-center pt-2">
        <Play className="w-3 h-3" />
        Tap any gift to preview its animation
      </p>

      {/* Animation Overlay */}
      {showingGift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
           {/* Darken background slightly for focus */}
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
           <GiftAnimation
              emoji={showingGift.emoji}
              animationType={showingGift.animationType}
              onComplete={() => setShowingGift(null)}
           />
        </div>
      )}
    </div>
  );
}