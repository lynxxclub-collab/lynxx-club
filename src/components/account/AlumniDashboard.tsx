import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress"; // Standard progress bar
import { toast } from "sonner";
import {
  Calendar,
  MessageSquare,
  Star,
  Video,
  Heart,
  ArrowRight,
  Download,
  RefreshCw,
  Loader2,
  Lock,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import Header from "@/components/layout/Header";
import { requireValidUUID } from "@/lib/sanitize";

interface AlumniStats {
  memberSince: Date | null;
  totalConversations: number;
  averageRating: number;
  totalRatings: number;
  videoDatesCompleted: number;
  foundLoveDate: Date | null;
  alumniExpiresAt: Date | null;
  // Assuming a max alumni duration of 90 days for the progress bar calculation
  alumniMaxDays?: number;
}

interface Conversation {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  totalMessages: number;
  firstMessageDate: Date | null;
  lastMessageDate: Date | null;
  isLovePartner: boolean;
}

export default function AlumniDashboard() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [reactivating, setReactivating] = useState(false);
  const [stats, setStats] = useState<AlumniStats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Calculate days and progress
  const alumniDaysRemaining = stats?.alumniExpiresAt
    ? Math.max(0, differenceInDays(stats.alumniExpiresAt, new Date()))
    : 0;

  // Calculate progress percentage (Assuming 90 day max period, adjust as needed)
  const alumniProgress =
    stats?.alumniMaxDays && stats.alumniExpiresAt ? ((stats.alumniDaysRemaining || 0) / stats.alumniMaxDays) * 100 : 0;

  // Fetch Data Function
  const fetchAlumniData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const validUserId = requireValidUUID(user.id, "user ID");

      // Fetch conversations
      const { data: convData } = await supabase
        .from("conversations")
        .select("*")
        .or(`seeker_id.eq.${validUserId},earner_id.eq.${validUserId}`)
        .order("last_message_at", { ascending: false });

      // Get success story if exists
      const { data: successStory } = await supabase
        .from("success_stories")
        .select("*")
        .or(`initiator_id.eq.${validUserId},partner_id.eq.${validUserId}`)
        .eq("status", "approved")
        .maybeSingle();

      // Get video dates count
      const { count: videoCount } = await supabase
        .from("video_dates")
        .select("*", { count: "exact", head: true })
        .or(`seeker_id.eq.${validUserId},earner_id.eq.${validUserId}`)
        .eq("status", "completed");

      // Build conversation list
      const convList: Conversation[] = [];
      if (convData) {
        for (const conv of convData) {
          const partnerId = conv.seeker_id === user.id ? conv.earner_id : conv.seeker_id;
          const { data: partnerProfile } = await supabase
            .from("profiles")
            .select("name, profile_photos")
            .eq("id", partnerId)
            .maybeSingle();

          convList.push({
            id: conv.id,
            partnerId,
            partnerName: partnerProfile?.name || "Unknown",
            partnerPhoto: partnerProfile?.profile_photos?.[0] || null,
            totalMessages: conv.total_messages,
            firstMessageDate: conv.created_at ? new Date(conv.created_at) : null,
            lastMessageDate: conv.last_message_at ? new Date(conv.last_message_at) : null,
            isLovePartner: successStory
              ? successStory.partner_id === partnerId || successStory.initiator_id === partnerId
              : false,
          });
        }
      }

      setConversations(convList);
      setStats({
        memberSince: profile?.created_at ? new Date(profile.created_at) : null,
        totalConversations: convData?.length || 0,
        averageRating: profile?.average_rating || 0,
        totalRatings: profile?.total_ratings || 0,
        videoDatesCompleted: videoCount || 0,
        foundLoveDate: successStory?.partner_confirmed_at ? new Date(successStory.partner_confirmed_at) : null,
        alumniExpiresAt: profile?.alumni_access_expires ? new Date(profile.alumni_access_expires) : null,
        alumniMaxDays: 90, // Fixed value or calculated from logic
      });
    } catch (error) {
      console.error("Error fetching alumni data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      fetchAlumniData();
    }
  }, [user, profile]);

  // REAL-TIME FEEL: Auto-refresh when user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        fetchAlumniData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loading]);

  const handleReactivate = async () => {
    if (!user) return;

    setReactivating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          account_status: "active",
          paused_date: null,
          exit_reason: null,
          alumni_access_expires: null,
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Welcome back! Account reactivated.");
      navigate("/browse");
    } catch (error: any) {
      toast.error(error.message || "Failed to reactivate account");
    } finally {
      setReactivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pb-24">
        <Header />
        <main className="container max-w-lg mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32">
      {" "}
      {/* Extra padding for sticky footer */}
      <Header />
      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Welcome Back! 👋</h1>
          <p className="text-white/50 text-sm">Here's what you've been up to.</p>
        </div>

        {/* Alumni Status Timer Card */}
        <Card className="bg-gradient-to-br from-purple-900/40 to-rose-900/20 border-purple-500/20 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-purple-200 text-sm font-semibold uppercase tracking-wider">Alumni Status</h3>
                <p className="text-2xl font-bold text-white">{alumniDaysRemaining} Days Remaining</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <Progress value={alumniProgress} className="h-2 bg-purple-950/50" />
            <p className="text-xs text-purple-300/50 mt-2 text-right">Keep your memories safe</p>
          </CardContent>
        </Card>

        {/* Celebration Card - If found love */}
        {stats?.foundLoveDate && (
          <Card className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-pink-500/30 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-pink-500/20 rounded-full blur-2xl" />
            <CardContent className="p-6 relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/40 shrink-0">
                <Heart className="w-7 h-7 text-white fill-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">You Found Love! 💕</h3>
                <p className="text-sm text-pink-200/80">{format(stats.foundLoveDate, "MMMM d, yyyy")}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Calendar}
            label="Member Since"
            value={stats?.memberSince ? format(stats.memberSince, "MMM yyyy") : "--"}
          />
          <StatCard icon={MessageSquare} label="Chats" value={stats?.totalConversations || 0} />
          <StatCard icon={Star} label="Rating" value={`${stats?.averageRating?.toFixed(1) || 0}/5`} highlight />
          <StatCard icon={Video} label="Dates" value={stats?.videoDatesCompleted || 0} />
        </div>

        {/* Conversation History */}
        <Card className="bg-[#0a0a0f] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Conversation History</CardTitle>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Lock className="w-3 h-3" />
              Read-only access
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversations.length === 0 ? (
              <p className="text-center text-white/30 py-8 text-sm">No conversations found</p>
            ) : (
              conversations.slice(0, 10).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/messages?conversation=${conv.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-left group"
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
                      {conv.partnerPhoto ? (
                        <img src={conv.partnerPhoto} alt={conv.partnerName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-lg font-bold text-white/30">
                          {conv.partnerName.charAt(0)}
                        </span>
                      )}
                    </div>
                    {conv.isLovePartner && (
                      <div className="absolute -bottom-1 -right-1 bg-pink-500 p-0.5 rounded-full border-2 border-[#0a0a0f]">
                        <Heart className="w-2.5 h-2.5 text-white fill-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-white truncate text-sm">{conv.partnerName}</p>
                      {conv.lastMessageDate && (
                        <span className="text-[10px] text-white/40">{format(conv.lastMessageDate, "MMM d")}</span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 truncate">{conv.totalMessages} messages</p>
                  </div>

                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-rose-400 transition-colors shrink-0" />
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Data Export Section */}
        <Button
          variant="ghost"
          className="w-full justify-start text-white/50 hover:text-white hover:bg-white/5"
          onClick={() => toast.info("Data export coming soon!")}
        >
          <Download className="w-4 h-4 mr-2" />
          Download My Data
        </Button>
      </main>
      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0f]/90 backdrop-blur-lg border-t border-white/10 z-50 md:hidden">
        <Button
          size="lg"
          className="w-full h-14 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white text-base font-bold rounded-xl shadow-xl shadow-rose-900/20 border-0 active:scale-[0.98]"
          onClick={handleReactivate}
          disabled={reactivating}
        >
          {reactivating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <RefreshCw className="w-5 h-5 mr-2" />}
          Reactivate Account
        </Button>
      </div>
      {/* Desktop: Only show reactivation button in flow, not sticky */}
      <div className="hidden md:block">
        <Button onClick={handleReactivate} disabled={reactivating} className="w-full mt-6">
          {reactivating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <RefreshCw className="w-5 h-5 mr-2" />}
          Reactivate Account
        </Button>
      </div>
    </div>
  );
}

// Helper Sub-component for Stats
function StatCard({ icon: Icon, label, value, highlight = false }: any) {
  return (
    <div
      className={`p-4 rounded-xl border ${highlight ? "bg-amber-500/10 border-amber-500/20" : "bg-white/5 border-white/10"}`}
    >
      <Icon className={`w-5 h-5 mb-2 ${highlight ? "text-amber-400" : "text-white/50"}`} />
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
    </div>
  );
}
