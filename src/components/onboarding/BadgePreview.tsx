import { Crown, Diamond, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the badge configuration
const BADGES = [
  {
    name: "Crown Bearer",
    description: "#1 on Weekly leaderboard",
    icon: Crown,
    // Theme Colors: Gold/Amber
    iconColor: "text-amber-400",
    containerColor: "bg-amber-500/10 border-amber-500/20",
    glowColor: "shadow-[0_0_15px_rgba(251,191,36,0.2)]",
  },
  {
    name: "Diamond Supporter",
    description: "#2-3 on Weekly leaderboard",
    icon: Diamond,
    // Theme Colors: Cyan/Diamond
    iconColor: "text-cyan-400",
    containerColor: "bg-cyan-500/10 border-cyan-500/20",
    glowColor: "shadow-[0_0_15px_rgba(34,211,238,0.2)]",
  },
  {
    name: "Top Supporter",
    description: "Top 10 on Weekly leaderboard",
    icon: Star,
    // Theme Colors: Purple (Matches site secondary)
    iconColor: "text-purple-400",
    containerColor: "bg-purple-500/10 border-purple-500/20",
    glowColor: "shadow-[0_0_15px_rgba(168,85,247,0.2)]",
  },
];

export function BadgePreview() {
  return (
    <div 
      className="grid gap-3 p-1"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {BADGES.map((badge, index) => (
        <div
          key={badge.name}
          className={cn(
            "flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
            // Dark Theme Glassmorphism Card
            "bg-white/[0.03] border border-white/5",
            "hover:bg-white/[0.05] hover:border-white/10 hover:scale-[1.01]",
            // Animation
            "animate-in fade-in slide-in-from-bottom-2",
            `duration-500 delay-${index * 100}`
          )}
        >
          {/* Icon Container */}
          <div 
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              "border backdrop-blur-sm transition-transform group-hover:scale-110",
              badge.containerColor,
              badge.glowColor
            )}
          >
            <badge.icon className={cn("w-6 h-6", badge.iconColor)} />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white tracking-tight text-sm sm:text-base mb-1">
              {badge.name}
            </h4>
            <p className="text-white/40 text-xs sm:text-sm leading-relaxed">
              {badge.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}