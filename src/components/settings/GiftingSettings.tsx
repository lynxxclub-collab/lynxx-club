import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Gift, Trophy, Crown, Heart, Sparkles, Play, Loader2, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { GiftPreviewButton } from "@/components/onboarding/GiftPreviewButton";
import { CopyableScript } from "@/components/onboarding/CopyableScript";
import { BadgePreview } from "@/components/onboarding/BadgePreview";
import { cn } from "@/lib/utils";

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  credits_cost: number;
  description: string | null;
}

const SCRIPTS = [
  {
    title: "Profile Bio (soft)",
    description: "Add to your bio for passive visibility",
    script: "Gifts are the easiest way to show love here 💝 Weekly Top Gifter gets the 👑",
  },
  {
    title: "Chat Invite (friendly)",
    description: "Use when conversation is flowing",
    script: "Just vibing tonight — if you feel like spoiling, gifts hit different on here 😌💎",
  },
  {
    title: "After Receiving (reward loop)",
    description: "Thank gifters and encourage more",
    script: "Okayyy I see you 😮‍💨 thank you for that 💝 You're climbing the weekly board 👑",
  },
];

export default function GiftingSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(true);

  // Settings state
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(true);
  const [showDailyLeaderboard, setShowDailyLeaderboard] = useState(true);
  const [autoThankYouEnabled, setAutoThankYouEnabled] = useState(false);

  useEffect(() => {
    if (profile) {
      setLeaderboardEnabled(profile.leaderboard_enabled ?? true);
      setShowDailyLeaderboard(profile.show_daily_leaderboard ?? true);
      setAutoThankYouEnabled((profile as any).auto_thank_you_enabled ?? false);
    }
  }, [profile]);

  useEffect(() => {
    const fetchGifts = async () => {
      try {
        const { data, error } = await supabase
          .from("gift_catalog")
          .select("id, name, emoji, credits_cost, description")
          .eq("active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        setGifts((data as GiftItem[]) || []);
      } catch (error) {
        console.error("Error fetching gifts:", error);
      } finally {
        setLoadingGifts(false);
      }
    };

    fetchGifts();
  }, []);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          leaderboard_enabled: leaderboardEnabled,
          show_daily_leaderboard: showDailyLeaderboard,
          auto_thank_you_enabled: autoThankYouEnabled,
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Gifting settings saved!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const completedAt = (profile as any)?.gifting_onboarding_completed_at;
  const formattedDate = completedAt
    ? new Date(completedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div 
      className="space-y-6"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Status Card */}
      <Card className="bg-[#0f0f12] border-white/10 shadow-lg overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <Gift className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <CardTitle className="text-white font-bold tracking-tight">Gifting Status</CardTitle>
                <CardDescription className="text-white/50 text-sm">
                  {formattedDate ? `Completed on ${formattedDate}` : "Active"}
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 font-bold uppercase tracking-wider text-[10px]">
              <Check className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Preferences */}
      <Card className="bg-[#0f0f12] border-white/10 shadow-lg overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-lg font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            Gifting Preferences
          </CardTitle>
          <CardDescription className="text-white/50 text-sm">
            Customize how gifting works on your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Leaderboard Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <Label className="text-white font-medium text-sm">Top Gifters Leaderboard</Label>
                <p className="text-white/40 text-xs">Show rankings on your profile</p>
              </div>
            </div>
            <Switch
              checked={leaderboardEnabled}
              onCheckedChange={setLeaderboardEnabled}
              className="data-[state=checked]:bg-rose-500"
            />
          </div>

          {/* Daily Rankings Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Crown className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <Label className="text-white font-medium text-sm">Show Daily Rankings</Label>
                <p className="text-white/40 text-xs">Include the Daily leaderboard tab</p>
              </div>
            </div>
            <Switch
              checked={showDailyLeaderboard}
              onCheckedChange={setShowDailyLeaderboard}
              className="data-[state=checked]:bg-rose-500"
            />
          </div>

          {/* Auto Thank-You Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                <Heart className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <Label className="text-white font-medium text-sm">Auto Thank-You Reactions</Label>
                <p className="text-white/40 text-xs">Automatically react to gifts received</p>
              </div>
            </div>
            <Switch
              checked={autoThankYouEnabled}
              onCheckedChange={setAutoThankYouEnabled}
              className="data-[state=checked]:bg-rose-500"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "w-full h-11 text-base font-bold transition-all duration-300",
              "bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500",
              "shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Gift Catalog */}
      <Card className="bg-[#0f0f12] border-white/10 shadow-lg overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-lg font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <Gift className="w-4 h-4 text-rose-400" />
            </div>
            Gift Catalog
          </CardTitle>
          <CardDescription className="text-white/50 text-sm">
            All available gifts fans can send you. You earn 70% of all gift revenue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingGifts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gifts.map((gift) => (
                <div
                  key={gift.id}
                  className={cn(
                    "p-3 rounded-xl border text-center transition-all duration-300",
                    "bg-white/[0.02] border-white/5 hover:border-rose-500/30 hover:bg-white/[0.04]"
                  )}
                >
                  <div className="text-3xl mb-2 drop-shadow-md">{gift.emoji}</div>
                  <p className="text-white font-medium text-xs sm:text-sm truncate">{gift.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <p className="text-white/60 text-xs font-bold">{gift.credits_cost}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-white/5">
            <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <Play className="w-3 h-3 text-rose-400" />
              </div>
              Preview Animations
            </h4>
            <GiftPreviewButton />
          </div>
        </CardContent>
      </Card>

      {/* Badge Preview */}
      <Card className="bg-[#0f0f12] border-white/10 shadow-lg overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-lg font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/20">
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            Status Badges
          </CardTitle>
          <CardDescription className="text-white/50 text-sm">
            Badges your top gifters can earn
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <BadgePreview />
        </CardContent>
      </Card>

      {/* Promotional Scripts */}
      <Card className="bg-[#0f0f12] border-white/10 shadow-lg overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-lg font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/20">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            Promotional Scripts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {SCRIPTS.map((script) => (
            <CopyableScript
              key={script.title}
              title={script.title}
              description={script.description}
              script={script.script}
            />
          ))}
        </CardContent>
      </Card>

      {/* Re-watch Onboarding */}
      <Card className="bg-[#0f0f12] border-white/10 shadow-lg overflow-hidden">
        <CardContent className="pt-6 pb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/creator-gifting-onboarding")}
            className="w-full border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl h-11"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-watch Gifting Onboarding
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}