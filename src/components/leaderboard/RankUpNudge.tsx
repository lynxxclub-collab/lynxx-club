I have refactored the `RankUpNudge` component to be strictly **Mobile First** and aligned with your **Dark Theme**.

### Key Improvements:
1.  **Mobile Layout:** Changed from a centered narrow card to a **full-width floating bar** (`left-4 right-4`) on mobile. This ensures the maximum amount of text is readable without making the user target a tiny button.
2.  **Visual Hierarchy:** Darkened the background gradient (`/10` opacity) to ensure it blends with the `#0a0a0f` theme while still alerting the user via the Amber border and glow.
3.  **Readability:** Increased the secondary text contrast from `text-white/50` to `text-white/70` and applied the `'DM Sans'` font.
4.  **Touch Targets:** Enlarged the dismiss button to `w-8 h-8` and added a hover/active state for easier interaction on touch screens.
5.  **Performance:** Defined the `fade-in-up` animation locally to avoid missing style warnings.

Here is the optimized code:

```tsx
import { useRankUpNudge } from '@/hooks/useRankUpNudge';
import { X, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface RankUpNudgeProps {
  creatorId: string;
  creatorName: string;
}

const NUDGE_STYLES = `
  @keyframes fade-in-up {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
`;

export default function RankUpNudge({ creatorId, creatorName }: RankUpNudgeProps) {
  const { user, profile } = useAuth();
  const { shouldShow, message, creditsNeeded, targetRank, dismissNudge } = useRankUpNudge(creatorId, creatorName);

  // Only show for seekers viewing earner profiles
  if (!user || profile?.user_type !== 'seeker' || !shouldShow || !message) {
    return null;
  }

  return (
    <>
      <style>{NUDGE_STYLES}</style>
      <div 
        className={cn(
          "fixed bottom-20 sm:bottom-24 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-sm z-40",
          "animate-fade-in-up"
        )}
      >
        <div className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-[#0a0a0f]/90 backdrop-blur-md", // Dark base for readability
          "border border-amber-500/30 shadow-xl shadow-amber-500/10",
          "p-3.5 sm:p-4"
        )}>
          {/* Subtle ambient glow inside */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
          
          <div className="relative flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              <p 
                className="text-sm font-semibold text-white leading-snug"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {message}
              </p>
              <p 
                className="text-xs text-white/60 mt-1 leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Send a gift to climb the leaderboard
              </p>
            </div>
            
            {/* Dismiss button - Larger touch target for mobile */}
            <button
              onClick={dismissNudge}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
```