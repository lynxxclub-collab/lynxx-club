import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Gift, Crown, ChevronRight, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

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
      // Get top earners by gift count received
      const { data, error } = await supabase
        .from("gift_transactions")
        .select("recipient_id, credits_spent")
        .eq("status", "completed");

      if (error) throw error;

      // Aggregate by recipient
      const earnerStats = (data || []).reduce((acc: Record<string, number>, tx) => {
        acc[tx.recipient_id] = (acc[tx.recipient_id] || 0) + tx.credits_spent;
        return acc;
      }, {});

      // Get top 5
      const topIds = Object.entries(earnerStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id);

      if (topIds.length === 0) {
        setTopEarners([]);
        setLoading(false);
        return;
      }

      // Fetch profile info
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, profile_photos")
        .in("id", topIds);

      const earners: TopEarner[] = topIds.map((id, index) => {
        const profile = profiles?.find((p) => p.id === id);
        return {
          id,
          name: profile?.name || "Anonymous",
          photo_url: profile?.profile_photos?.[0] || null,
          total_gifts: earnerStats[id],
          rank: index + 1,
        };
      });

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
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-300" />;
      case 3:
        return <Medal className="w-4 h-4 text-amber-600" />;
      default:
        return <span className="text-xs text-white/50">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl bg-white/[0.02] border-white/10 animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 w-40 bg-white/10 rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10" />
                <div className="flex-1 h-4 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (topEarners.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-2xl bg-white/[0.02] border-white/10 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-rose-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          Top Gift Earners
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topEarners.map((earner) => (
          <div
            key={earner.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-xl transition-colors",
              earner.rank === 1 && "bg-amber-500/10 border border-amber-500/20"
            )}
          >
            <div className="w-6 flex justify-center">{getRankIcon(earner.rank)}</div>
            <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden ring-2 ring-white/10">
              {earner.photo_url ? (
                <img
                  src={earner.photo_url}
                  alt={earner.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">
                  {earner.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{earner.name}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <Gift className="w-3 h-3" />
              {earner.total_gifts.toLocaleString()}
            </div>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/creator-gifting-onboarding")}
          className="w-full mt-2 text-white/50 hover:text-white hover:bg-white/5 text-xs"
        >
          View Full Leaderboard <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
