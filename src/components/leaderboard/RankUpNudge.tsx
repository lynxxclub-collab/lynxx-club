import { useRankUpNudge } from '@/hooks/useRankUpNudge';
import { X, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface RankUpNudgeProps {
  creatorId: string;
  creatorName: string;
}

export default function RankUpNudge({ creatorId, creatorName }: RankUpNudgeProps) {
  const { user, profile } = useAuth();
  const { shouldShow, message, creditsNeeded, targetRank, dismissNudge } = useRankUpNudge(creatorId, creatorName);

  // Only show for seekers viewing earner profiles
  if (!user || profile?.user_type !== 'seeker' || !shouldShow || !message) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)]",
      "animate-fade-in-up"
    )}>
      <div className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-r from-amber-500/20 to-orange-500/10",
        "border border-amber-500/30",
        "backdrop-blur-xl shadow-lg shadow-amber-500/10",
        "p-4"
      )}>
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
        
        <div className="relative flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              {message}
            </p>
            <p className="text-xs text-white/50 mt-1">
              Send a gift to climb the leaderboard
            </p>
          </div>
          
          {/* Dismiss button */}
          <button
            onClick={dismissNudge}
            className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
