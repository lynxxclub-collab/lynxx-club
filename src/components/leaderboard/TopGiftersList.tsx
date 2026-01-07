import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import LeaderboardBadge from './LeaderboardBadge';
import { TopGifter } from '@/hooks/useTopGifters';
import { cn } from '@/lib/utils';

interface TopGiftersListProps {
  gifters: TopGifter[];
  showAll?: boolean;
  compact?: boolean;
}

const LIST_STYLES = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export default function TopGiftersList({ gifters, showAll = false, compact = false }: TopGiftersListProps) {
  const displayGifters = showAll ? gifters : gifters.slice(0, 3);

  if (displayGifters.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-3">
          <span className="text-2xl">🏆</span>
        </div>
        <p className="text-sm font-medium text-white/60">No supporters yet</p>
        <p className="text-xs text-white/30 mt-1">Be the first to send a gift!</p>
      </div>
    );
  }

  return (
    <>
      <style>{LIST_STYLES}</style>
      <div className={cn("space-y-2", compact && "space-y-1.5")}>
        {displayGifters.map((gifter, index) => (
          <div
            key={gifter.gifterId}
            className={cn(
              "flex items-center gap-3 p-2.5 sm:p-3 rounded-xl transition-all duration-300 animate-fade-in",
              "active:scale-[0.99]", // Touch feedback
              gifter.rank === 1 && "bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 shadow-sm shadow-amber-500/5",
              gifter.rank === 2 && "bg-gradient-to-r from-slate-400/10 to-slate-500/5 border border-slate-400/20",
              gifter.rank === 3 && "bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/20",
              gifter.rank > 3 && "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]"
            )}
            style={{ 
              fontFamily: "'DM Sans', sans-serif",
              animationDelay: `${index * 50}ms` 
            }}
          >
            {/* Rank Badge */}
            <LeaderboardBadge 
              rank={gifter.rank} 
              badge={gifter.badge} 
              size={compact ? 'sm' : 'md'} 
            />

            {/* Avatar */}
            <Avatar className={cn(
              "shrink-0",
              compact ? "w-9 h-9" : "w-10 h-10",
              gifter.rank === 1 && "ring-2 ring-amber-500/50",
              gifter.rank === 2 && "ring-2 ring-slate-400/50",
              gifter.rank === 3 && "ring-2 ring-orange-500/50",
              gifter.rank > 3 && "ring-1 ring-white/5"
            )}>
              <AvatarImage src={gifter.gifterPhoto || undefined} alt={gifter.gifterName} />
              <AvatarFallback className={cn(
                "font-bold text-sm",
                gifter.rank === 1 && "bg-amber-500/20 text-amber-400 border border-amber-500/20",
                gifter.rank === 2 && "bg-slate-400/20 text-slate-300 border border-slate-400/20",
                gifter.rank === 3 && "bg-orange-500/20 text-orange-400 border border-orange-500/20",
                gifter.rank > 3 && "bg-white/5 text-white/50"
              )}>
                {gifter.gifterName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name and Badge Label */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-semibold truncate block",
                  compact ? "text-sm" : "text-base",
                  gifter.rank === 1 && "text-amber-400",
                  gifter.rank === 2 && "text-slate-200", // Brightened for dark mode
                  gifter.rank === 3 && "text-orange-400", // Brightened from amber-600
                  gifter.rank > 3 && "text-white"
                )}>
                  {gifter.gifterName}
                </span>
              </div>
              {!compact && gifter.badge && (
                <span className={cn(
                  "text-[10px] uppercase font-bold tracking-wider",
                  gifter.rank === 1 && "text-amber-500/80",
                  gifter.rank === 2 && "text-slate-400/80",
                  gifter.rank === 3 && "text-orange-500/80",
                  gifter.rank > 3 && "text-white/40"
                )}>
                  {gifter.rank === 1 ? 'Crown Bearer' : 
                   gifter.rank <= 3 ? 'Elite Supporter' : 
                   'Top Supporter'}
                </span>
              )}
            </div>

            {/* Credits Display */}
            <div className="text-right shrink-0">
              <div className={cn(
                "font-bold tabular-nums leading-none",
                compact ? "text-sm" : "text-base",
                gifter.rank === 1 && "text-amber-400",
                gifter.rank === 2 && "text-slate-200",
                gifter.rank === 3 && "text-orange-400",
                gifter.rank > 3 && "text-white/80"
              )}>
                {gifter.totalCredits.toLocaleString()}
              </div>
              {!compact && (
                <span className="text-[10px] text-white/30 font-medium uppercase tracking-wide">
                  Credits
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
```
