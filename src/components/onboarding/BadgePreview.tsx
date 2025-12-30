import { Crown, Diamond, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const BADGES = [
  {
    name: "Crown Bearer",
    description: "#1 on Weekly leaderboard",
    icon: Crown,
    gradient: "from-amber-400 to-yellow-500",
    glow: "shadow-amber-500/30",
    bgColor: "bg-amber-500/20",
  },
  {
    name: "Diamond Supporter",
    description: "#2-3 on Weekly leaderboard",
    icon: Diamond,
    gradient: "from-cyan-400 to-blue-400",
    glow: "shadow-cyan-500/30",
    bgColor: "bg-cyan-500/20",
  },
  {
    name: "Top Supporter",
    description: "Top 10 on Weekly leaderboard",
    icon: Star,
    gradient: "from-purple-400 to-pink-400",
    glow: "shadow-purple-500/30",
    bgColor: "bg-purple-500/20",
  },
];

export function BadgePreview() {
  return (
    <div className="grid gap-3">
      {BADGES.map((badge, index) => (
        <div
          key={badge.name}
          className={cn(
            "flex items-center gap-4 p-4 rounded-xl",
            "bg-white/5 border border-white/10",
            "animate-fade-in"
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div 
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              badge.bgColor,
              `shadow-lg ${badge.glow}`
            )}
          >
            <badge.icon className={cn("w-6 h-6 bg-gradient-to-br bg-clip-text", badge.gradient)} 
              style={{ color: badge.gradient.includes('amber') ? '#fbbf24' : badge.gradient.includes('cyan') ? '#22d3ee' : '#a855f7' }}
            />
          </div>
          <div className="flex-1">
            <h4 className={cn(
              "font-semibold bg-gradient-to-r bg-clip-text text-transparent",
              badge.gradient
            )}>
              {badge.name}
            </h4>
            <p className="text-white/50 text-sm">{badge.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
