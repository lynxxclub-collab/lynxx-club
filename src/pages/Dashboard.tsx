import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useStripeBalance } from "@/hooks/useStripeBalance";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet as WalletIcon,
  TrendingUp,
  MessageSquare,
  Video,
  Loader2,
  ExternalLink,
  Check,
  Star,
  Heart,
  ChevronRight,
  Sparkles,
  Gift,
  Trophy,
  Award,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { toast } from "sonner";
import { getFunctionErrorMessage } from "@/lib/supabaseFunctionError";
import { useProfileLikeNotifications } from "@/hooks/useProfileLikeNotifications";
import { cn } from "@/lib/utils";
import { EmailVerificationReminder } from "@/components/auth/EmailVerificationReminder";
import TopEarnersCard from "@/components/leaderboard/TopEarnersCard";
import { calculateCreatorEarnings } from "@/lib/pricing";

// =============================================================================
// TYPES
// =============================================================================
interface DailyEarning {
  date: string;
  amount: number;
}

interface DashboardStats {
  totalMessages: number;
  totalVideoDates: number;
  profileLikes: number;
  thisWeekEarnings: number;
}

interface RateConfig {
  label: string;
  credits: number;
  earn: number;
  bgColor: string;
  borderColor: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================
const REALTIME_SUBSCRIPTION_DELAY_MS = 2000;
const DEFAULT_RATE = 200;
const DEFAULT_AUDIO_RATE = 150;

// =============================================================================
// COMPONENT
// =============================================================================
export default function Dashboard() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const {
    balance: stripeBalance,
    loading: stripeLoading,
    refetch: refetchStripeBalance,
  } = useStripeBalance();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useProfileLikeNotifications();

  // State
  const [weeklyEarnings, setWeeklyEarnings] = useState<DailyEarning[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalMessages: 0,
    totalVideoDates: 0,
    profileLikes: 0,
    thisWeekEarnings: 0,
  });
  const [connectingBank, setConnectingBank] = useState(false);

  // ===========================================================================
  // AUTHENTICATION & AUTHORIZATION GUARD
  // ===========================================================================
  useEffect(() => {
    if (loading) return;

    // Redirect unauthenticated users to auth page
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    // Wait for profile to load
    if (!profile) return;

    // Handle account status redirects
    switch (profile.account_status) {
      case "paused":
        navigate("/reactivate", { replace: true });
        return;
      case "alumni":
        navigate("/alumni", { replace: true });
        return;
      case "pending_verification":
      case "pending":
        navigate("/verify", { replace: true });
        return;
    }

    // Verification check
    if (profile.verification_status !== "verified") {
      navigate("/verify", { replace: true });
      return;
    }

    // Account must be active
    if (profile.account_status !== "active") {
      navigate("/onboarding", { replace: true });
      return;
    }

    // EARNER-ONLY ACCESS: Redirect seekers to browse
    if (profile.user_type !== "earner") {
      navigate("/browse", { replace: true });
      return;
    }
  }, [user, profile, loading, navigate]);

  // ===========================================================================
  // DATA FETCHING
  // ===========================================================================
  const fetchEarnings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("usd_amount, created_at")
        .eq("user_id", user.id)
        .gt("usd_amount", 0)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate total earned
      const total = (data || []).reduce((sum, tx) => sum + (tx.usd_amount || 0), 0);
      setTotalEarned(total);

      // Calculate weekly earnings
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return { date: format(date, "EEE"), fullDate: date, amount: 0 };
      });

      (data || []).forEach((tx) => {
        if (!tx.usd_amount || !tx.created_at) return;

        const txDate = new Date(tx.created_at);
        const dayIndex = last7Days.findIndex(
          (d) => txDate >= startOfDay(d.fullDate) && txDate <= endOfDay(d.fullDate)
        );

        if (dayIndex !== -1) {
          last7Days[dayIndex].amount += tx.usd_amount;
        }
      });

      const weeklyData = last7Days.map((d) => ({ date: d.date, amount: d.amount }));
      const thisWeekTotal = last7Days.reduce((sum, d) => sum + d.amount, 0);

      setWeeklyEarnings(weeklyData);
      setStats((prev) => ({ ...prev, thisWeekEarnings: thisWeekTotal }));
    } catch (error) {
      console.error("[Dashboard] Error fetching earnings:", error);
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      const [messagesResult, videosResult, likesResult] = await Promise.all([
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", user.id),
        supabase
          .from("video_dates")
          .select("*", { count: "exact", head: true })
          .eq("earner_id", user.id)
          .eq("status", "completed"),
        supabase
          .from("profile_likes")
          .select("*", { count: "exact", head: true })
          .eq("liked_id", user.id),
      ]);

      setStats((prev) => ({
        ...prev,
        totalMessages: messagesResult.count || 0,
        totalVideoDates: videosResult.count || 0,
        profileLikes: likesResult.count || 0,
      }));
    } catch (error) {
      console.error("[Dashboard] Error fetching stats:", error);
    }
  }, [user]);

  // Fetch data when user is authenticated
  useEffect(() => {
    if (user && profile?.user_type === "earner") {
      fetchEarnings();
      fetchStats();
    }
  }, [user, profile?.user_type, fetchEarnings, fetchStats]);

  // ===========================================================================
  // STRIPE ONBOARDING VERIFICATION
  // ===========================================================================
  useEffect(() => {
    const verifyStripeOnboarding = async () => {
      const stripeSuccess = searchParams.get("stripe_success") === "true";
      const stripeRefresh = searchParams.get("stripe_refresh") === "true";

      if (!stripeSuccess && !stripeRefresh) return;

      // Clear URL params
      navigate("/dashboard", { replace: true });

      if (stripeSuccess) {
        try {
          const result = await supabase.functions.invoke("stripe-connect-onboard");
          const errorMessage = getFunctionErrorMessage(result);

          if (!errorMessage && result.data?.onboardingComplete) {
            toast.success("Payouts connected successfully! You'll be paid every Friday.");
          }

          await refreshProfile();
          refetchStripeBalance();
        } catch (error) {
          console.error("[Dashboard] Error verifying Stripe onboarding:", error);
        }
      }
    };

    verifyStripeOnboarding();
  }, [searchParams, refreshProfile, navigate, refetchStripeBalance]);

  // ===========================================================================
  // REALTIME SUBSCRIPTION
  // ===========================================================================
  useEffect(() => {
    if (!user || profile?.user_type !== "earner") return;

    // Delay subscription to let critical content load first
    const timeoutId = setTimeout(() => {
      const channel = supabase
        .channel(`earner-transactions-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newTx = payload.new as { usd_amount?: number };

            if (newTx.usd_amount && newTx.usd_amount > 0) {
              toast.success(`+$${newTx.usd_amount.toFixed(2)} earned!`);
            }

            // Refresh all data
            fetchEarnings();
            refreshProfile();
            refetchWallet();
            refetchStripeBalance();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, REALTIME_SUBSCRIPTION_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user, profile?.user_type, fetchEarnings, refreshProfile, refetchWallet, refetchStripeBalance]);

  // ===========================================================================
  // HANDLERS
  // ===========================================================================
  const handleConnectBank = async () => {
    setConnectingBank(true);

    try {
      const result = await supabase.functions.invoke("stripe-connect-onboard");
      const errorMessage = getFunctionErrorMessage(result);

      if (errorMessage) {
        toast.error(errorMessage);
        return;
      }

      if (result.data?.onboardingUrl) {
        window.location.href = result.data.onboardingUrl;
      } else if (result.data?.onboardingComplete) {
        toast.success("Bank account already connected!");
        refreshProfile();
        refetchStripeBalance();
      }
    } catch (error) {
      console.error("[Dashboard] Error connecting bank:", error);
      toast.error("Failed to start bank connection");
    } finally {
      setConnectingBank(false);
    }
  };

  // ===========================================================================
  // COMPUTED VALUES
  // ===========================================================================
  const stripeConnected = profile?.stripe_onboarding_complete || false;
  const availableBalance = stripeBalance?.walletAvailable || wallet?.available_earnings || 0;
  const paidOutTotal = stripeBalance?.paidOutTotal || wallet?.paid_out_total || 0;
  const nextPayoutAmount = stripeBalance?.nextPayoutAmount || 0;
  const nextPayoutDate = stripeBalance?.nextPayoutDate;
  const nextPayoutStatus = stripeBalance?.nextPayoutStatus || "accumulating";
  const PAYOUT_MINIMUM = stripeBalance?.payoutMinimum || 25.0;
  const maxEarning = Math.max(...weeklyEarnings.map((d) => d.amount), 1);

  // Rate configurations
  const rateConfigs: RateConfig[] = useMemo(() => {
    const profileData = profile as Record<string, unknown> | null;

    return [
      {
        label: "Text",
        credits: 5,
        earn: calculateCreatorEarnings(5),
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20",
      },
      {
        label: "Image",
        credits: 10,
        earn: calculateCreatorEarnings(10),
        bgColor: "bg-rose-500/10",
        borderColor: "border-rose-500/20",
      },
      {
        label: "15min Video",
        credits: Number(profileData?.video_15min_rate) || DEFAULT_RATE,
        earn: calculateCreatorEarnings(Number(profileData?.video_15min_rate) || DEFAULT_RATE),
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
      },
      {
        label: "30min Video",
        credits: Number(profileData?.video_30min_rate) || DEFAULT_RATE,
        earn: calculateCreatorEarnings(Number(profileData?.video_30min_rate) || DEFAULT_RATE),
        bgColor: "bg-rose-500/10",
        borderColor: "border-amber-500/20",
      },
      {
        label: "60min Video",
        credits: Number(profileData?.video_60min_rate) || DEFAULT_RATE,
        earn: calculateCreatorEarnings(Number(profileData?.video_60min_rate) || DEFAULT_RATE),
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/20",
      },
      {
        label: "90min Video",
        credits: Number(profileData?.video_90min_rate) || DEFAULT_RATE,
        earn: calculateCreatorEarnings(Number(profileData?.video_90min_rate) || DEFAULT_RATE),
        bgColor: "bg-pink-500/10",
        borderColor: "border-pink-500/20",
      },
      {
        label: "15min Audio",
        credits: Number(profileData?.audio_15min_rate) || DEFAULT_AUDIO_RATE,
        earn: calculateCreatorEarnings(Number(profileData?.audio_15min_rate) || DEFAULT_AUDIO_RATE),
        bgColor: "bg-cyan-500/10",
        borderColor: "border-cyan-500/20",
      },
      {
        label: "30min Audio",
        credits: Number(profileData?.audio_30min_rate) || 180,
        earn: calculateCreatorEarnings(Number(profileData?.audio_30min_rate) || 180),
        bgColor: "bg-teal-500/10",
        borderColor: "border-teal-500/20",
      },
      {
        label: "60min Audio",
        credits: Number(profileData?.audio_60min_rate) || 250,
        earn: calculateCreatorEarnings(Number(profileData?.audio_60min_rate) || 250),
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
      },
      {
        label: "90min Audio",
        credits: Number(profileData?.audio_90min_rate) || 300,
        earn: calculateCreatorEarnings(Number(profileData?.audio_90min_rate) || 300),
        bgColor: "bg-lime-500/10",
        borderColor: "border-lime-500/20",
      },
    ];
  }, [profile]);

  // Quick stats config
  const quickStats = useMemo(
    () => [
      {
        icon: MessageSquare,
        label: "Messages",
        value: stats.totalMessages,
        bgColor: "bg-purple-500/20",
        textColor: "text-purple-400",
      },
      {
        icon: Video,
        label: "Video Dates",
        value: stats.totalVideoDates,
        bgColor: "bg-rose-500/20",
        textColor: "text-rose-400",
      },
      {
        icon: Heart,
        label: "Profile Likes",
        value: stats.profileLikes,
        bgColor: "bg-pink-500/20",
        textColor: "text-pink-400",
      },
      {
        icon: Star,
        label: "Rating",
        value: profile?.average_rating?.toFixed(1) || "0.0",
        bgColor: "bg-rose-500/20",
        textColor: "text-amber-400",
      },
    ],
    [stats, profile?.average_rating]
  );

  // ===========================================================================
  // LOADING STATE
  // ===========================================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  // Don't render dashboard content until we've verified access
  if (!user || !profile || profile.user_type !== "earner") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10">
        <Header />

        <div className="container py-6 space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {/* Email Verification Reminder */}
          {!user.email_confirmed_at && profile.email && (
            <EmailVerificationReminder email={profile.email} />
          )}

          {/* Early Creator Badge */}
          <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-rose-500/30 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-200 font-medium">Early Creator</p>
                <p className="text-white/50 text-sm">Thank you for helping shape Lynxx Club</p>
              </div>
            </div>
          </div>

          {/* Payout Info Banner */}
          <div className="px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-white/70 text-sm">
                  Earnings clear after 48 hours and are automatically paid out every Friday.
                </p>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1
                className="text-3xl font-bold text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  {profile.name?.split(" ")[0] || "there"}
                </span>
                ! 👋
              </h1>
              <p className="text-white/50 mt-1">Here's how you're doing</p>
            </div>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Available Balance */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <Card className="relative rounded-2xl bg-white/[0.02] border-amber-500/20 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white/50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                      <WalletIcon className="w-4 h-4 text-amber-400" />
                    </div>
                    Available Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-amber-400">${availableBalance.toFixed(2)}</p>
                  <p className="text-xs text-white/40 mt-3">Ready for next payout</p>
                  {!stripeConnected && (
                    <Button
                      onClick={handleConnectBank}
                      disabled={connectingBank}
                      size="sm"
                      className="mt-3 w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg"
                    >
                      {connectingBank ? (
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3 h-3 mr-2" />
                      )}
                      Connect Bank to Get Paid
                    </Button>
                  )}
                  {stripeConnected && (
                    <div className="mt-3 flex items-center gap-2 text-green-400 text-xs">
                      <Check className="w-3 h-3" />
                      Bank connected
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Next Weekly Payout */}
            <Card className="rounded-2xl bg-white/[0.02] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white/50 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-purple-400" />
                  </div>
                  Next Payout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-white">${nextPayoutAmount.toFixed(2)}</p>
                {nextPayoutDate && (
                  <p className="text-sm text-purple-400 mt-3 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(nextPayoutDate), "EEEE, MMM d")}
                  </p>
                )}
                {nextPayoutStatus === "below_minimum" && (
                  <p className="text-xs text-amber-400/80 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Accumulating to ${PAYOUT_MINIMUM.toFixed(2)} minimum
                  </p>
                )}
                {nextPayoutStatus === "scheduled" && stripeConnected && (
                  <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Payout scheduled
                  </p>
                )}
                {!stripeConnected && nextPayoutAmount > 0 && (
                  <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Connect bank to receive payout
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Paid Out Total */}
            <Card className="rounded-2xl bg-white/[0.02] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white/50 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  Paid Out
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-white">${paidOutTotal.toFixed(2)}</p>
                <p className="text-xs text-white/40 mt-3">Lifetime payouts to your bank</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/payout-history")}
                  className="mt-2 text-white/50 hover:text-white hover:bg-white/5 text-xs px-0"
                >
                  View History <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Total Earned */}
            <Card className="rounded-2xl bg-white/[0.02] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white/50 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  Total Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-white">${totalEarned.toFixed(2)}</p>
                <p className="text-sm text-green-400 mt-3 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Lifetime earnings
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickStats.map((stat, i) => (
              <Card key={i} className="rounded-2xl bg-white/[0.02] border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-white/40">{stat.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Earnings Tools Section - Only show if onboarding not completed */}
          {!profile.gifting_onboarding_completed && (
            <Card className="rounded-2xl bg-white/[0.02] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Gift className="w-4 h-4 text-amber-400" />
                  </div>
                  Earnings Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate("/creator-gifting-onboarding")}
                  className="w-full justify-between bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-amber-500/30 rounded-xl h-14"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-rose-500/20 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Gifting & Leaderboard</p>
                      <p className="text-xs text-white/50">Earn more with virtual gifts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-500 text-white border-0 text-xs">NEW</Badge>
                    <ChevronRight className="w-4 h-4 text-white/50" />
                  </div>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Top Earners Leaderboard - Only show after gifting onboarding is complete */}
          {profile.gifting_onboarding_completed && <TopEarnersCard />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Chart */}
            <Card className="rounded-2xl bg-white/[0.02] border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    This Week
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-500/20 text-amber-300 border-0 hover:bg-rose-500/30">
                      ${stats.thisWeekEarnings.toFixed(2)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/earnings-analytics")}
                      className="text-white/50 hover:text-white hover:bg-white/5 text-xs"
                    >
                      View Analytics <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 h-32">
                  {weeklyEarnings.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          "w-full rounded-t-lg transition-all",
                          day.amount > 0
                            ? "bg-gradient-to-t from-amber-500 to-amber-400"
                            : "bg-white/5"
                        )}
                        style={{
                          height: `${Math.max((day.amount / maxEarning) * 100, 8)}%`,
                          minHeight: "8px",
                        }}
                      />
                      <span className="text-xs text-white/40">{day.date}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rates */}
            <Card className="rounded-2xl bg-white/[0.02] border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <WalletIcon className="w-5 h-5 text-green-400" />
                  Your Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {rateConfigs.map((rate, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl ${rate.bgColor} border ${rate.borderColor}`}
                    >
                      <p className="text-xs text-white/50">{rate.label}</p>
                      <p className="font-semibold text-white">{rate.credits} credits</p>
                      <p className="text-xs text-green-400">You earn ${rate.earn.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl"
                  onClick={() => navigate("/settings")}
                >
                  Edit Rates <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer />
        <MobileNav />
      </div>
    </div>
  );
}
