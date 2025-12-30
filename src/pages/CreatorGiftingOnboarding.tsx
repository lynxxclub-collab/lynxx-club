import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { GiftPreviewButton } from "@/components/onboarding/GiftPreviewButton";
import { CopyableScript } from "@/components/onboarding/CopyableScript";
import { BadgePreview } from "@/components/onboarding/BadgePreview";
import { 
  Gift, 
  Trophy, 
  Megaphone, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Loader2,
  Crown,
  Heart
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "What Gifting Is", icon: Gift },
  { id: 2, title: "Turn Gifting ON", icon: Sparkles },
  { id: 3, title: "Top Gifters Leaderboard", icon: Trophy },
  { id: 4, title: "How to Promote", icon: Megaphone },
];

const SCRIPTS = [
  {
    title: "Profile Bio (soft)",
    description: "Add to your bio for passive visibility",
    script: "Gifts are the easiest way to show love here 💝 Weekly Top Gifter gets the 👑"
  },
  {
    title: "Chat Invite (friendly)",
    description: "Use when conversation is flowing",
    script: "Just vibing tonight — if you feel like spoiling, gifts hit different on here 😌💎"
  },
  {
    title: "After Receiving (reward loop)",
    description: "Thank gifters and encourage more",
    script: "Okayyy I see you 😮‍💨 thank you for that 💝 You're climbing the weekly board 👑"
  },
];

export default function CreatorGiftingOnboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [giftingEnabled, setGiftingEnabled] = useState(true);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(true);
  const [showDailyLeaderboard, setShowDailyLeaderboard] = useState(true);
  const [autoThankYouEnabled, setAutoThankYouEnabled] = useState(false);

  useEffect(() => {
    if (profile) {
      setLeaderboardEnabled(profile.leaderboard_enabled ?? true);
      setShowDailyLeaderboard(profile.show_daily_leaderboard ?? true);
    }
  }, [profile]);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveAndActivate = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          leaderboard_enabled: leaderboardEnabled,
          show_daily_leaderboard: showDailyLeaderboard,
          auto_thank_you_enabled: autoThankYouEnabled,
          gifting_onboarding_completed: true,
          gifting_onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("You're all set! Start earning from gifts today 💎");
      // Navigate first, then refresh profile in the background
      // This prevents re-render cycles from interfering with navigation
      navigate('/dashboard');
      refreshProfile();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Failed to save settings");
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 onboarding-step-enter">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Turn Appreciation Into <span className="text-gradient-amber">Earnings</span>
              </h2>
              <p className="text-white/60">
                Virtual gifts let your fans show appreciation in a fun, animated way.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Credit-based tips with animations</h3>
                  <p className="text-white/50 text-sm">Fans purchase credits and send gifts that play beautiful animations in your chat.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">💰</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">You receive 70% of every gift</h3>
                  <p className="text-white/50 text-sm">Platform keeps 30% for processing and features. Your earnings appear in your wallet.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">6 gift tiers available</h3>
                  <p className="text-white/50 text-sm">From Rose (50 credits) to Crown (300 credits), each with unique animations.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Preview Gift Animations
              </h3>
              <GiftPreviewButton />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 onboarding-step-enter">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Activate <span className="text-gradient-amber">Virtual Gifts</span>
              </h2>
              <p className="text-white/60">
                Enable gifting so your fans can show appreciation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Gift className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <Label className="text-white text-lg font-medium">Enable Virtual Gifts</Label>
                    <p className="text-white/50 text-sm">Allow fans to send you gifts</p>
                  </div>
                </div>
                <Switch
                  checked={giftingEnabled}
                  onCheckedChange={setGiftingEnabled}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">💬</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">Where fans can gift</h3>
                  <p className="text-white/50 text-sm">Fans can send gifts from chat conversations and your profile page.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Thank-you reactions</h3>
                  <p className="text-white/50 text-sm">Quick-tap 💗 😍 🥰 or 🔥 to thank gifters instantly. Shows appreciation and encourages more gifts!</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 onboarding-step-enter">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Reward Your <span className="text-gradient-amber">Top Supporters</span>
              </h2>
              <p className="text-white/60">
                The leaderboard publicly recognizes your most generous fans.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <Label className="text-white text-lg font-medium">Enable Top Gifters Leaderboard</Label>
                    <p className="text-white/50 text-sm">Show rankings on your profile</p>
                  </div>
                </div>
                <Switch
                  checked={leaderboardEnabled}
                  onCheckedChange={setLeaderboardEnabled}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>

            {leaderboardEnabled && (
              <>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white font-medium">Show Daily Rankings</Label>
                      <p className="text-white/40 text-sm">Include the Daily leaderboard tab (optional)</p>
                    </div>
                    <Switch
                      checked={showDailyLeaderboard}
                      onCheckedChange={setShowDailyLeaderboard}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    Status Badges
                  </h3>
                  <BadgePreview />
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 onboarding-step-enter">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Encourage Gifting <span className="text-gradient-amber">Naturally</span>
              </h2>
              <p className="text-white/60">
                Copy these scripts to promote gifting without being pushy.
              </p>
            </div>

            <div className="space-y-3">
              {SCRIPTS.map((script) => (
                <CopyableScript
                  key={script.title}
                  title={script.title}
                  description={script.description}
                  script={script.script}
                />
              ))}
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Pro Tips
              </h3>
              <ul className="space-y-2 text-white/60 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  Always respond with a quick thank-you reaction
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  Mention "Top 3" goal once per day max, not every message
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  Shoutout top gifters occasionally by name
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  Never spam or pressure — keep it fun and natural
                </li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderFinalScreen = () => (
    <div className="space-y-6 onboarding-step-enter">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500/20 to-rose-500/20 flex items-center justify-center animate-pulse-glow">
          <Sparkles className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          You're <span className="text-gradient-amber">Ready!</span>
        </h2>
        <p className="text-white/60">
          Review your settings and activate gifting.
        </p>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-lg">Your Settings</CardTitle>
          <CardDescription>These can be changed anytime in Settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-rose-400" />
              <span className="text-white">Virtual Gifts</span>
            </div>
            <Switch
              checked={giftingEnabled}
              onCheckedChange={setGiftingEnabled}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="text-white">Top Gifters Leaderboard</span>
            </div>
            <Switch
              checked={leaderboardEnabled}
              onCheckedChange={setLeaderboardEnabled}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-purple-400" />
              <span className="text-white">Show Daily Rankings</span>
            </div>
            <Switch
              checked={showDailyLeaderboard}
              onCheckedChange={setShowDailyLeaderboard}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-pink-400" />
              <span className="text-white">Auto Thank-You Reactions</span>
            </div>
            <Switch
              checked={autoThankYouEnabled}
              onCheckedChange={setAutoThankYouEnabled}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSaveAndActivate}
        disabled={saving}
        className="w-full h-14 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20"
      >
        {saving ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="w-5 h-5 mr-2" />
            Save & Activate
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-background pb-20 md:pb-0">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        <Header />

        <div className="container max-w-lg py-6 space-y-6">
          {/* Progress */}
          <OnboardingProgress currentStep={currentStep} totalSteps={4} />

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 pb-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isComplete = step.id < currentStep;
              
              return (
                <div
                  key={step.id}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    isActive && "bg-gradient-to-br from-amber-500 to-rose-500 shadow-lg shadow-amber-500/30",
                    isComplete && "bg-green-500/20 text-green-400",
                    !isActive && !isComplete && "bg-white/5 text-white/30"
                  )}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className={cn("w-5 h-5", isActive && "text-white")} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Content */}
          {currentStep <= 4 ? renderStepContent() : renderFinalScreen()}

          {/* Navigation */}
          {currentStep <= 4 && (
            <div className="flex gap-3 pt-4">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 h-12 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                onClick={currentStep === 4 ? handleSaveAndActivate : handleNext}
                disabled={currentStep === 4 && saving}
                className={cn(
                  "flex-1 h-12 text-white font-medium rounded-xl",
                  currentStep === 4
                    ? "bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400"
                    : "bg-white/10 hover:bg-white/20"
                )}
              >
                {currentStep === 4 ? (
                  saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save & Activate
                    </>
                  )
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
