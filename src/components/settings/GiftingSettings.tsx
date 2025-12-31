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
import { PRICING } from "@/lib/pricing";

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
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-rose-500/10 border-amber-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-white">Gifting Status</CardTitle>
                <CardDescription className="text-white/50">
                  {formattedDate ? `Completed on ${formattedDate}` : "Active"}
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-0">
              <Check className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Preferences */}
      <Card className="bg-white/[0.02] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Gifting Preferences
          </CardTitle>
          <CardDescription className="text-white/50">Customize how gifting works on your profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <Label className="text-white font-medium">Top Gifters Leaderboard</Label>
                <p className="text-white/40 text-sm">Show rankings on your profile</p>
              </div>
            </div>
            <Switch
              checked={leaderboardEnabled}
              onCheckedChange={setLeaderboardEnabled}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-purple-400" />
              <div>
                <Label className="text-white font-medium">Show Daily Rankings</Label>
                <p className="text-white/40 text-sm">Include the Daily leaderboard tab</p>
              </div>
            </div>
            <Switch
              checked={showDailyLeaderboard}
              onCheckedChange={setShowDailyLeaderboard}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-pink-400" />
              <div>
                <Label className="text-white font-medium">Auto Thank-You Reactions</Label>
                <p className="text-white/40 text-sm">Automatically react to gifts received</p>
              </div>
            </div>
            <Switch
              checked={autoThankYouEnabled}
              onCheckedChange={setAutoThankYouEnabled}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-semibold rounded-xl"
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
      <Card className="bg-white/[0.02] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-rose-400" />
            Gift Catalog
          </CardTitle>
          <CardDescription className="text-white/50">
            All available gifts fans can send you. Creators earn $0.07 per credit (70%). All gift values are calculated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingGifts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/50" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gifts.map((gift) => (
                <div
                  key={gift.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 text-center hover:border-amber-500/30 transition-colors"
                >
                  <div className="text-3xl mb-2">{gift.emoji}</div>
                  <p className="text-white font-medium text-sm">{gift.name}</p>
                  <p className="text-amber-400 text-xs">{gift.credits_cost} Credits</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/10">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Play className="w-4 h-4 text-amber-400" />
              Preview Animations
            </h4>
            <GiftPreviewButton />
          </div>
        </CardContent>
      </Card>

      {/* Badge Preview */}
      <Card className="bg-white/[0.02] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            Status Badges
          </CardTitle>
          <CardDescription className="text-white/50">Badges your top gifters can earn</CardDescription>
        </CardHeader>
        <CardContent>
          <BadgePreview />
        </CardContent>
      </Card>

      {/* Promotional Scripts */}
      <Card className="bg-white/[0.02] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Promotional Scripts
          </CardTitle>
          <CardDescription className="text-white/50">Copy these to encourage gifting naturally</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
      <Card className="bg-white/[0.02] border-white/10">
        <CardContent className="pt-6">
          <Button
            variant="outline"
            onClick={() => navigate("/creator-gifting-onboarding")}
            className="w-full border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-watch Gifting Onboarding
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
