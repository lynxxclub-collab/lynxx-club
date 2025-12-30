import { Crown, Gem, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardBadgeProps {
  rank: number;
  badge: 'crown' | 'diamond' | 'supporter' | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

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
        <div className={cn(
          "relative flex items-center justify-center rounded-full",
          "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500",
          "animate-crown-glow",
          sizeClasses[size]
        )}>
          <Crown className={cn("text-amber-900", iconSizes[size])} />
        </div>
        {showLabel && (
          <span className={cn("font-semibold text-amber-400", textSizes[size])}>
            Crown Bearer
          </span>
        )}
      </div>
    );
  }

  if (badge === 'diamond') {
    return (
      <div className="flex items-center gap-1.5">
        <div className={cn(
          "relative flex items-center justify-center rounded-full",
          rank === 2 
            ? "bg-gradient-to-br from-slate-300 via-gray-200 to-slate-400" 
            : "bg-gradient-to-br from-amber-600 via-orange-700 to-amber-800",
          sizeClasses[size]
        )}>
          <Gem className={cn(
            rank === 2 ? "text-slate-700" : "text-amber-200",
            iconSizes[size]
          )} />
        </div>
        {showLabel && (
          <span className={cn(
            "font-medium",
            rank === 2 ? "text-slate-300" : "text-amber-600",
            textSizes[size]
          )}>
            Diamond Supporter
          </span>
        )}
      </div>
    );
  }

  if (badge === 'supporter') {
    return (
      <div className="flex items-center gap-1.5">
        <div className={cn(
          "flex items-center justify-center rounded-full",
          "bg-white/10 border border-white/20",
          sizeClasses[size]
        )}>
          <span className={cn("font-bold text-white/70", textSizes[size])}>{rank}</span>
        </div>
        {showLabel && (
          <span className={cn("text-white/50", textSizes[size])}>
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
      "bg-white/5 border border-white/10",
      sizeClasses[size]
    )}>
      <span className={cn("font-medium text-white/40", textSizes[size])}>{rank}</span>
    </div>
  );
}
