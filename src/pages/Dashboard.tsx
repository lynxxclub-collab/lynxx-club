import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Wallet as WalletIcon,
  Clock,
  TrendingUp,
  MessageSquare,
  Video,
  Loader2,
  ExternalLink,
  Check,
  Star,
  Heart,
  ChevronRight,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import WithdrawModal from "@/components/earnings/WithdrawModal";
import { getFunctionErrorMessage } from "@/lib/supabaseFunctionError";
import { useProfileLikeNotifications } from "@/hooks/useProfileLikeNotifications";
import { cn } from "@/lib/utils";

interface DailyEarning {
  date: string;
  amount: number;
}

export default function Dashboard() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useProfileLikeNotifications();

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [weeklyEarnings, setWeeklyEarnings] = useState<DailyEarning[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalVideoDates: 0,
    profileLikes: 0,
    thisWeekEarnings: 0,
  });

  const fetchEarnings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const total = (data || []).reduce((sum, tx) => {
        if (tx.usd_amount && tx.usd_amount > 0) {
          return sum + tx.usd_amount;
        }
        return sum;
      }, 0);
      setTotalEarned(total);

      // Calculate weekly earnings
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return { date: format(date, "EEE"), fullDate: date, amount: 0 };
      });

      (data || []).forEach((tx) => {
        if (tx.usd_amount && tx.usd_amount > 0) {
          const txDate = new Date(tx.created_at);
          const dayIndex = last7Days.findIndex(
            (d) => txDate >= startOfDay(d.fullDate) && txDate <= endOfDay(d.fullDate),
          );
          if (dayIndex !== -1) {
            last7Days[dayIndex].amount += tx.usd_amount;
          }
        }
      });

      setWeeklyEarnings(last7Days.map((d) => ({ date: d.date, amount: d.amount })));
      const thisWeek = last7Days.reduce((sum, d) => sum + d.amount, 0);
      setStats((prev) => ({ ...prev, thisWeekEarnings: thisWeek }));
    } catch (error) {
      console.error("Error fetching earnings:", error);
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      const { count: msgCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id);

      const { count: videoCount } = await supabase
        .from("video_dates")
        .select("*", { count: "exact", head: true })
        .eq("earner_id", user.id)
        .eq("status", "completed");

      const { count: likesCount } = await supabase
        .from("profile_likes")
        .select("*", { count: "exact", head: true })
        .eq("liked_id", user.id);

      setStats((prev) => ({
        ...prev,
        totalMessages: msgCount || 0,
        totalVideoDates: videoCount || 0,
        profileLikes: likesCount || 0,
      }));
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (!loading && profile) {
      if (profile.account_status === "paused") navigate("/reactivate");
      else if (profile.account_status === "alumni") navigate("/alumni");
      else if (profile.account_status === "pending_verification" || profile.account_status === "pending")
        navigate("/verify");
      else if (profile.verification_status !== "verified") navigate("/verify");
      else if (profile.account_status !== "active") navigate("/onboarding");
      else if (profile.user_type !== "earner") navigate("/browse");
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEarnings();
      fetchStats();
    }
  }, [user, fetchEarnings, fetchStats]);

  useEffect(() => {
    const verifyStripeOnboarding = async () => {
      const stripeSuccess = searchParams.get("stripe_success") === "true";
      const stripeRefresh = searchParams.get("stripe_refresh") === "true";

      if (!stripeSuccess && !stripeRefresh) return;
      navigate("/dashboard", { replace: true });

      if (stripeSuccess) {
        try {
          const result = await supabase.functions.invoke("stripe-connect-onboard");
          const errorMessage = getFunctionErrorMessage(result);
          if (!errorMessage && result.data?.onboardingComplete) {
            toast.success("Bank account connected successfully!");
          }
          await refreshProfile();
        } catch (error) {
          console.error("Error verifying onboarding:", error);
        }
      }
    };
    verifyStripeOnboarding();
  }, [searchParams, refreshProfile, navigate]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("earner-transactions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newTx = payload.new as any;
          if (newTx.usd_amount && newTx.usd_amount > 0) {
            toast.success(`+$${newTx.usd_amount.toFixed(2)} earned!`);
          }
          fetchEarnings();
          refreshProfile();
          refetchWallet();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchEarnings, refreshProfile, refetchWallet]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const availableBalance = wallet?.available_earnings || 0;
  const pendingBalance = wallet?.pending_earnings || 0;
  const stripeComplete = profile?.stripe_onboarding_complete || false;
  const maxEarning = Math.max(...weeklyEarnings.map((d) => d.amount), 1);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {profile?.name?.split(" ")[0] || "there"}! 👋</h1>
            <p className="text-muted-foreground mt-1">Here's how you're doing</p>
          </div>
          {!stripeComplete && (
            <Button
              onClick={() => setShowWithdrawModal(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Set Up Payouts
            </Button>
          )}
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <WalletIcon className="w-4 h-4 text-amber-500" />
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-amber-500">${availableBalance.toFixed(2)}</p>
              <Button
                onClick={() => setShowWithdrawModal(true)}
                disabled={availableBalance < 25}
                className="mt-4 w-full bg-amber-500 hover:bg-amber-600"
              >
                {stripeComplete ? "Withdraw" : "Set Up & Withdraw"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">${pendingBalance.toFixed(2)}</p>
              <Progress value={50} className="h-2 mt-4" />
              <p className="text-xs text-muted-foreground mt-1">48-hour hold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Total Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">${totalEarned.toFixed(2)}</p>
              <p className="text-sm text-emerald-500 mt-2 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Lifetime earnings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: MessageSquare, label: "Messages", value: stats.totalMessages, color: "primary" },
            { icon: Video, label: "Video Dates", value: stats.totalVideoDates, color: "teal-500" },
            { icon: Heart, label: "Profile Likes", value: stats.profileLikes, color: "rose-500" },
            { icon: Star, label: "Rating", value: profile?.average_rating?.toFixed(1) || "0.0", color: "amber-500" },
          ].map((stat, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-${stat.color}/10 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>This Week</span>
                <Badge variant="secondary">${stats.thisWeekEarnings.toFixed(2)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-32">
                {weeklyEarnings.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        "w-full rounded-t-md",
                        day.amount > 0 ? "bg-gradient-to-t from-primary to-primary/60" : "bg-muted",
                      )}
                      style={{ height: `${Math.max((day.amount / maxEarning) * 100, 8)}%`, minHeight: "8px" }}
                    />
                    <span className="text-xs text-muted-foreground">{day.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Your Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Text", credits: 5, earn: 0.35, color: "primary" },
                  { label: "Image", credits: 10, earn: 0.7, color: "teal-500" },
                  {
                    label: "15min Video",
                    credits: profile?.video_15min_rate || 200,
                    earn: (profile?.video_15min_rate || 200) * 0.07,
                    color: "blue-500",
                  },
                  {
                    label: "30min Video",
                    credits: profile?.video_30min_rate || 200,
                    earn: (profile?.video_30min_rate || 200) * 0.07,
                    color: "amber-500",
                  },
                  {
                    label: "60min Video",
                    credits: profile?.video_60min_rate || 200,
                    earn: (profile?.video_60min_rate || 200) * 0.07,
                    color: "purple-500",
                  },
                  {
                    label: "90min Video",
                    credits: profile?.video_90min_rate || 200,
                    earn: (profile?.video_90min_rate || 200) * 0.07,
                    color: "rose-500",
                  },
                ].map((rate, i) => (
                  <div key={i} className={`p-3 rounded-lg bg-${rate.color}/5 border border-${rate.color}/20`}>
                    <p className="text-xs text-muted-foreground">{rate.label}</p>
                    <p className="font-semibold">{rate.credits} credits</p>
                    <p className="text-xs text-emerald-500">You earn ${rate.earn.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/settings")}>
                Edit Rates <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <WithdrawModal
        open={showWithdrawModal}
        onOpenChange={setShowWithdrawModal}
        availableBalance={availableBalance}
        stripeOnboardingComplete={stripeComplete}
        onSuccess={() => {
          refreshProfile();
          fetchEarnings();
          refetchWallet();
        }}
      />

      <Footer />
      <MobileNav />
    </div>
  );
}
