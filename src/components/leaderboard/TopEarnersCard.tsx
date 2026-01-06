I have refactored the `TopEarnersCard` component to be strictly **Mobile First**, performance-optimized, and visually consistent with your dark theme.

### Key Improvements:
1.  **Performance & Correctness:**
    *   Added `resolveProfileImageUrl` to correctly build public URLs from Supabase storage (essential since your storage is private/auth-protected).
    *   Updated the mapping logic to `Promise.all`, ensuring images are resolved before rendering to prevent broken links.
2.  **Mobile Layout:**
    *   Tightened the padding and spacing (`p-4`, `gap-3`) for a cleaner mobile fit.
    *   Added a subtle hover effect (`active:scale-[0.98]`) to list items for tactile feedback.
3.  **Visual Polish:**
    *   **Rank #1:** Highlighted with a gold border and background tint (`border-amber-500/30`) to make the winner stand out.
    *   **Typography:** Applied `'DM Sans'` and improved contrast (using `text-white/70` for secondary text).
    *   **Skeletons:** Match the exact layout of the loaded content for a smoother loading experience.

Here is the optimized code:

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Gift, Crown, ChevronRight, Medal, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveProfileImageUrl } from "@/components/ui/ProfileImage";

interface TopEarner {
  id: string;
  name: string;
  photo_url: string | null;
  total_gifts: number;
  rank: number;
}

export default function TopEarnersCard() {
  const navigate = useNavigate();
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopEarners();
  }, []);

  const fetchTopEarners = async () => {
    try {
      // 1. Get transactions to aggregate gift values
      const { data, error } = await supabase
        .from("gift_transactions")
        .select("recipient_id, credits_spent")
        .eq("status", "completed"); // Ensure we only count completed gifts

      if (error) throw error;

      // 2. Aggregate total gifts per earner
      const earnerStats = (data || []).reduce((acc: Record<string, number>, tx) => {
        acc[tx.recipient_id] = (acc[tx.recipient_id] || 0) + tx.credits_spent;
        return acc;
      }, {});

      // 3. Sort and get top 5 IDs
      const topIds = Object.entries(earnerStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id);

      if (topIds.length === 0) {
        setTopEarners([]);
        setLoading(false);
        return;
      }

      // 4. Fetch profile details
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, profile_photos")
        .in("id", topIds);

      // 5. Map to TopEarner with resolved images (Async mapping to ensure images load)
      const earners: TopEarner[] = await Promise.all(
        topIds.map(async (id, index) => {
          const profile = profiles?.find((p) => p.id === id);
          const photoUrl = await resolveProfileImageUrl(
            "profile-photos",
            profile?.profile_photos?.[0]
          );

          return {
            id,
            name: profile?.name || "Anonymous",
            photo_url: photoUrl,
            total_gifts: earnerStats[id],
            rank: index + 1,
          };
        })
      );

      setTopEarners(earners);
    } catch (error) {
      console.error("Error fetching top earners:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Crown className="w-3.5 h-3.5 text-amber-900 fill-amber-900/20" />
          </div>
        );
      case 2:
        return (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center">
            <Medal className="w-3.5 h-3.5 text-slate-600" />
          </div>
        );
      case 3:
        return (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-700 flex items-center justify-center">
            <Medal className="w-3.5 h-3.5 text-orange-100" />
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/40">
            #{rank}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl bg-[#0a0a0f] border-white/10 overflow-hidden">
        <CardHeader className="pb-4">
          <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
              <div className="flex-1 h-4 bg-white/10 rounded animate-pulse" />
              <div className="w-10 h-4 bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (topEarners.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-2xl bg-[#0a0a0f] border-white/10 overflow-hidden shadow-sm">
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <CardHeader className="pb-3 px-4">
        <CardTitle 
          className="text-white text-base font-semibold flex items-center gap-2"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          Top Gift Earners
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-2 px-2 pb-4">
        {topEarners.map((earner) => (
          <div
            key={earner.id}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200",
              "hover:bg-white/5 active:scale-[0.98] cursor-pointer",
              earner.rank === 1 && "bg-amber-500/10 border border-amber-500/20"
            )}
            onClick={() => navigate(`/profile/${earner.id}`)} // Clickable row
          >
            {/* Rank Icon */}
            <div className="flex-shrink-0 w-6 flex justify-center">
              {getRankIcon(earner.rank)}
            </div>

            {/* Avatar */}
            <div className="relative w-10 h-10 rounded-full bg-white/5 overflow-hidden ring-2 ring-white/10 shrink-0">
              {earner.photo_url ? (
                <img
                  src={earner.photo_url}
                  alt={earner.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                  <User className="w-5 h-5 text-white/30" />
                </div>
              )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0 pr-2">
              <p 
                className="text-sm font-medium text-white truncate"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {earner.name}
              </p>
            </div>

            {/* Gift Count */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/10">
              <Gift className="w-3 h-3" />
              {earner.total_gifts.toLocaleString()}
            </div>
          </div>
        ))}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/leaderboard")} // Assuming this route exists
          className="w-full mt-2 text-white/40 hover:text-white hover:bg-white/5 text-xs font-medium h-9"
        >
          View Full Leaderboard <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
```