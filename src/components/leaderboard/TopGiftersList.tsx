import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import LeaderboardBadge from './LeaderboardBadge';
import { TopGifter } from '@/hooks/useTopGifters';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface TopGiftersListProps {
  gifters: TopGifter[];
  showAll?: boolean;
  compact?: boolean;
}

export default function TopGiftersList({ gifters, showAll = false, compact = false }: TopGiftersListProps) {
  const displayGifters = showAll ? gifters : gifters.slice(0, 3);

  if (displayGifters.length === 0) {
    return (
      <div className="text-center py-6 text-white/40">
        <p className="text-sm">No supporters yet</p>
        <p className="text-xs mt-1">Be the first to send a gift!</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      {displayGifters.map((gifter, index) => (
        <div
          key={gifter.gifterId}
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl transition-all duration-300",
            "animate-fade-in",
            gifter.rank === 1 && "bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20",
            gifter.rank === 2 && "bg-gradient-to-r from-slate-400/10 to-slate-500/5 border border-slate-400/20",
            gifter.rank === 3 && "bg-gradient-to-r from-amber-700/10 to-orange-700/5 border border-amber-700/20",
            gifter.rank > 3 && "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]"
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Rank Badge */}
          <LeaderboardBadge 
            rank={gifter.rank} 
            badge={gifter.badge} 
            size={compact ? 'sm' : 'md'} 
          />

          {/* Avatar */}
          <Avatar className={cn(
            "border",
            compact ? "w-8 h-8" : "w-10 h-10",
            gifter.rank === 1 && "border-amber-500/50",
            gifter.rank === 2 && "border-slate-400/50",
            gifter.rank === 3 && "border-amber-700/50",
            gifter.rank > 3 && "border-white/10"
          )}>
            <AvatarImage src={gifter.gifterPhoto || undefined} />
            <AvatarFallback className={cn(
              "text-sm",
              gifter.rank === 1 && "bg-amber-500/20 text-amber-400",
              gifter.rank === 2 && "bg-slate-400/20 text-slate-300",
              gifter.rank === 3 && "bg-amber-700/20 text-amber-600",
              gifter.rank > 3 && "bg-white/10 text-white/50"
            )}>
              {gifter.gifterName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Name and Badge Label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-medium truncate",
                compact ? "text-sm" : "text-base",
                gifter.rank === 1 && "text-amber-400",
                gifter.rank === 2 && "text-slate-300",
                gifter.rank === 3 && "text-amber-600",
                gifter.rank > 3 && "text-white/80"
              )}>
                {gifter.gifterName}
              </span>
            </div>
            {!compact && gifter.badge && (
              <span className={cn(
                "text-xs",
                gifter.rank === 1 && "text-amber-400/70",
                gifter.rank === 2 && "text-slate-400/70",
                gifter.rank === 3 && "text-amber-600/70",
                gifter.rank > 3 && "text-white/40"
              )}>
                {gifter.rank === 1 ? 'Crown Bearer' : 
                 gifter.rank <= 3 ? 'Diamond Supporter' : 
                 'Top Supporter'}
              </span>
            )}
          </div>

          {/* Credits Display */}
          <div className="text-right">
            <div className={cn(
              "font-semibold tabular-nums",
              compact ? "text-sm" : "text-base",
              gifter.rank === 1 && "text-amber-400",
              gifter.rank === 2 && "text-slate-300",
              gifter.rank === 3 && "text-amber-600",
              gifter.rank > 3 && "text-white/70"
            )}>
              {gifter.totalCredits.toLocaleString()}
            </div>
            {!compact && (
              <span className="text-xs text-white/30">credits</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
