import { useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import GiftAnimation from "@/components/gifts/GiftAnimation";
import { cn } from "@/lib/utils";

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
    setTimeout(() => setShowingGift(null), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
        {PREVIEW_GIFTS.slice(0, 12).map((gift) => (
          <Button
            key={gift.id}
            variant="outline"
            onClick={() => handlePreview(gift)}
            disabled={showingGift !== null}
            className={cn(
              "w-full justify-center",
              "border-white/10 bg-white/5 hover:bg-white/10",
              "text-white hover:text-white",
              "transition-all"
            )}
          >
            <span className="text-xl mr-2">{gift.emoji}</span>
            <span>{gift.name}</span>
            <Sparkles className="w-3 h-3 ml-2 text-amber-400" />
          </Button>
        ))}
      </div>
      
      <p className="text-white/40 text-xs flex items-center gap-2">
        <Play className="w-3 h-3" />
        Tap any gift to preview its animation
      </p>

      {showingGift && (
        <GiftAnimation
          emoji={showingGift.emoji}
          animationType={showingGift.animationType}
          onComplete={() => setShowingGift(null)}
        />
      )}
    </div>
  );
}
