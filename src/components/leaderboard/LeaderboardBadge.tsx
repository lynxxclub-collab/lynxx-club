import { Crown, Gem, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardBadgeProps {
  rank: number;
  badge: 'crown' | 'diamond' | 'supporter' | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const BADGE_STYLES = `
  @keyframes crown-glow {
    0%, 100% { box-shadow: 0 0 10px rgba(251, 191, 36, 0.2); }
    50% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.6); }
  }
`;

export default function LeaderboardBadge({ rank, badge, size = 'md', showLabel = false }: LeaderboardBadgeProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  const textSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  };

  if (badge === 'crown') {
    return (
      <div className="flex items-center gap-1.5">
        <div 
          className={cn(
            "relative flex items-center justify-center rounded-full border border-amber-500/50",
            "bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500",
            "animate-crown-glow",
            sizeClasses[size]
          )}
        >
          <Crown className={cn("text-amber-900 fill-amber-900/20", iconSizes[size])} />
        </div>
        {showLabel && (
          <span 
            className={cn("font-bold text-amber-400 tracking-wide", textSizes[size])}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Crown Bearer
          </span>
        )}
      </div>
    );
  }

  if (badge === 'diamond') {
    // Rank 2 = Silver, Rank 3 = Bronze logic
    const isSilver = rank === 2;
    const bgGradient = isSilver 
      ? "bg-gradient-to-br from-slate-200 via-gray-300 to-slate-400 border-slate-300/50" 
      : "bg-gradient-to-br from-amber-600 via-orange-600 to-amber-800 border-orange-500/50";
    
    const iconColor = isSilver ? "text-slate-700" : "text-amber-100";
    const textColor = isSilver ? "text-slate-300" : "text-orange-400"; // Fixed: Lighter colors for dark mode

    return (
      <div className="flex items-center gap-1.5">
        <div 
          className={cn(
            "relative flex items-center justify-center rounded-full border",
            bgGradient,
            sizeClasses[size]
          )}
        >
          <Gem className={cn(iconColor, iconSizes[size])} />
        </div>
        {showLabel && (
          <span 
            className={cn("font-medium tracking-wide", textColor, textSizes[size])}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {isSilver ? 'Silver Elite' : 'Bronze Supporter'}
          </span>
        )}
      </div>
    );
  }

  if (badge === 'supporter') {
    return (
      <div className="flex items-center gap-1.5">
        <div className={cn(
          "flex items-center justify-center rounded-full border border-white/10",
          "bg-white/5 text-white/60", // Slightly more visible bg
          sizeClasses[size]
        )}>
          <span className={cn("font-bold", textSizes[size])}>{rank}</span>
        </div>
        {showLabel && (
          <span 
            className={cn("text-white/60", textSizes[size])}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Top Supporter
          </span>
        )}
      </div>
    );
  }

  // Default rank display
  return (
    <div className={cn(
      "flex items-center justify-center rounded-full",
      "bg-white/5 border border-white/5", // Very subtle default
      sizeClasses[size]
    )}>
      <span className={cn("font-medium text-white/50", textSizes[size])}>{rank}</span>
    </div>
  );
}
```
