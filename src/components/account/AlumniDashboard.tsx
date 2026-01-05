import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Calendar,
  MessageSquare,
  Star,
  Video,
  Heart,
  Clock,
  ArrowRight,
  Download,
  RefreshCw,
  Loader2,
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

  const alumniDaysRemaining = stats?.alumniExpiresAt
    ? Math.max(0, differenceInDays(stats.alumniExpiresAt, new Date()))
    : 0;

  useEffect(() => {
    if (user && profile) {
      fetchAlumniData();
    }
  }, [user, profile]);

  async function fetchAlumniData() {
    if (!user) return;
    setLoading(true);

    try {
      // Validate UUID before using in queries
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

      // Build conversation list with partner info
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
      });
    } catch (error) {
      console.error("Error fetching alumni data:", error);
    } finally {
      setLoading(false);
    }
  }

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
      toast.success("Account reactivated!");
      navigate("/browse");
    } catch (error: any) {
      toast.error(error.message || "Failed to reactivate account");
    } finally {
      setReactivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">Welcome Back! 👋</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 border-amber-500/30"
              >
                <Clock className="w-3 h-3 mr-1" />
                Alumni Status: {alumniDaysRemaining} days remaining
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Your Lynxx Journey</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary rounded-lg">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {stats?.memberSince ? format(stats.memberSince, "MMM yyyy") : "--"}
                </p>
                <p className="text-xs text-muted-foreground">Member Since</p>
              </div>

              <div className="text-center p-4 bg-secondary rounded-lg">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats?.totalConversations || 0}</p>
                <p className="text-xs text-muted-foreground">Conversations</p>
              </div>

              <div className="text-center p-4 bg-secondary rounded-lg">
                <Star className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">{stats?.averageRating?.toFixed(1) || "0.0"}/5</p>
                <p className="text-xs text-muted-foreground">Your Rating</p>
              </div>

              <div className="text-center p-4 bg-secondary rounded-lg">
                <Video className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats?.videoDatesCompleted || 0}</p>
                <p className="text-xs text-muted-foreground">Dates Completed</p>
              </div>
            </div>

            {stats?.foundLoveDate && (
              <div className="mt-4 p-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-lg flex items-center gap-3">
                <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
                <div>
                  <p className="font-medium text-pink-600">Found Love</p>
                  <p className="text-sm text-muted-foreground">{format(stats.foundLoveDate, "MMMM d, yyyy")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate("/messages")}
          >
            <MessageSquare className="w-5 h-5" />
            <span>View Past Conversations</span>
            <span className="text-xs text-muted-foreground">(read-only)</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => toast.info("Data export coming soon!")}
          >
            <Download className="w-5 h-5" />
            <span>Download My Data</span>
          </Button>

          <Button
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={handleReactivate}
            disabled={reactivating}
          >
            {reactivating ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            <span>Reactivate Account</span>
          </Button>
        </div>

        {/* Conversation History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Conversation History
              <Badge variant="outline" className="ml-2">
                🔒 Read-only
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No conversations found</p>
            ) : (
              conversations.slice(0, 5).map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                        {conv.partnerPhoto ? (
                          <img src={conv.partnerPhoto} alt={conv.partnerName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-medium">{conv.partnerName.charAt(0)}</span>
                        )}
                      </div>
                      {conv.isLovePartner && (
                        <Heart className="absolute -top-1 -right-1 w-5 h-5 text-pink-500 fill-pink-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {conv.partnerName}
                        {conv.isLovePartner && (
                          <Badge variant="secondary" className="text-xs bg-pink-500/10 text-pink-500">
                            💕 Your Partner
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {conv.totalMessages} messages
                        {conv.firstMessageDate && conv.lastMessageDate && (
                          <>
                            {" "}
                            • {format(conv.firstMessageDate, "MMM d")} - {format(conv.lastMessageDate, "MMM d, yyyy")}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => navigate(`/messages?conversation=${conv.id}`)}>
                    View
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
