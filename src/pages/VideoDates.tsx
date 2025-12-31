import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/layout/MobileNav";
import BackgroundEffects from "@/components/BackgroundEffects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Video, Calendar, Clock, Loader2, Check, X, MessageSquare, Star, Phone, AlertCircle, Globe, Headphones } from "lucide-react";
import { isPast, isFuture, isToday, addMinutes, differenceInMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VideoDate {
  id: string;
  conversation_id: string | null;
  seeker_id: string;
  earner_id: string;
  scheduled_start: string;
  scheduled_duration: number;
  credits_reserved: number;
  earner_amount: number;
  platform_fee: number;
  status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled" | "declined" | "no_show";
  daily_room_url?: string;
  daily_room_name?: string;
  created_at: string;
  other_user?: {
    id: string;
    name: string;
    profile_photos: string[];
  };
}

export default function VideoDates() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [videoDates, setVideoDates] = useState<VideoDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<VideoDate | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const isSeeker = profile?.user_type === "seeker";
  const isEarner = profile?.user_type === "earner";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) fetchVideoDates();
  }, [user, isEarner]);

  // Real-time subscription for video_dates changes
  useEffect(() => {
    if (!user) return;

    const column = isEarner ? "earner_id" : "seeker_id";
    
    const channel = supabase
      .channel('video-dates-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_dates',
          filter: `${column}=eq.${user.id}`
        },
        (payload) => {
          // Re-fetch to get enriched data with user profiles
          fetchVideoDates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isEarner]);

  const fetchVideoDates = async () => {
    if (!user) return;

    try {
      const column = isEarner ? "earner_id" : "seeker_id";
      const { data, error } = await supabase
        .from("video_dates")
        .select("*")
        .eq(column, user.id)
        .order("scheduled_start", { ascending: false });

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (vd: any) => {
          const otherId = isEarner ? vd.seeker_id : vd.earner_id;
          const { data: otherUser } = await supabase
            .from("profiles")
            .select("id, name, profile_photos")
            .eq("id", otherId)
            .single();
          return { ...vd, other_user: otherUser } as VideoDate;
        }),
      );

      setVideoDates(enriched);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (vd: VideoDate) => {
    setActionLoading(vd.id);
    try {
      await supabase
        .from("video_dates")
        .update({ status: "scheduled" })
        .eq("id", vd.id);
      toast.success("Video date accepted!");
      fetchVideoDates();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (vd: VideoDate) => {
    setActionLoading(vd.id);
    try {
      await supabase.from("video_dates").update({ status: "declined" }).eq("id", vd.id);
      toast.success("Declined");
      fetchVideoDates();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!selectedDate) return;
    setActionLoading(selectedDate.id);
    try {
      await supabase
        .from("video_dates")
        .update({ status: "cancelled" })
        .eq("id", selectedDate.id);
      toast.success("Cancelled");
      setShowCancelDialog(false);
      setSelectedDate(null);
      fetchVideoDates();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (vd: VideoDate) => {
    const scheduled = new Date(vd.scheduled_start);
    const minutesUntil = differenceInMinutes(scheduled, new Date());

    if ((vd.status === "scheduled" || vd.status === "in_progress") && minutesUntil <= 5 && minutesUntil >= -30) {
      return <Badge className="bg-green-500/20 text-green-300 border-green-500/30 animate-pulse">Join Now</Badge>;
    }

    const variants: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-amber-500/20 text-amber-300 border-amber-500/30", label: "Pending" },
      scheduled: { className: "bg-green-500/20 text-green-300 border-green-500/30", label: "Confirmed" },
      in_progress: { className: "bg-blue-500/20 text-blue-300 border-blue-500/30", label: "In Progress" },
      completed: { className: "bg-white/10 text-white/50 border-white/10", label: "Completed" },
      cancelled: { className: "bg-white/10 text-white/50 border-white/10", label: "Cancelled" },
      declined: { className: "bg-rose-500/20 text-rose-300 border-rose-500/30", label: "Declined" },
      no_show: { className: "bg-rose-500/20 text-rose-300 border-rose-500/30", label: "No Show" },
    };

    const variant = variants[vd.status] || { className: "bg-white/10 text-white/50", label: vd.status };
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const canJoinCall = (vd: VideoDate): boolean => {
    const scheduled = new Date(vd.scheduled_start);
    const minutesUntil = differenceInMinutes(scheduled, new Date());
    return (
      (vd.status === "scheduled" || vd.status === "in_progress") &&
      minutesUntil <= 5 &&
      minutesUntil >= -vd.scheduled_duration
    );
  };

  const upcomingDates = videoDates.filter(
    (vd) =>
      ["pending", "scheduled", "in_progress"].includes(vd.status) &&
      isFuture(addMinutes(new Date(vd.scheduled_start), vd.scheduled_duration)),
  );

  const pastDates = videoDates.filter(
    (vd) =>
      ["completed", "cancelled", "declined", "no_show"].includes(vd.status) ||
      isPast(addMinutes(new Date(vd.scheduled_start), vd.scheduled_duration)),
  );

  const pendingRequests = videoDates.filter((vd) => vd.status === "pending");

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <BackgroundEffects />
      
      <div className="relative z-10">
        <Header />
        
        <div className="container max-w-4xl py-6">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <Phone className="w-6 h-6 text-teal-400" />
            </div>
            Scheduled Calls
          </h1>
          <p className="text-sm text-white/50 flex items-center gap-2 mb-2">
            <Headphones className="w-4 h-4 text-teal-400" />
            Audio or Video — your choice, camera optional
          </p>
          
          <div className="flex items-center gap-2 text-sm text-white/50 mb-6">
            <Globe className="w-4 h-4" />
            All times displayed in Eastern Time (EST)
          </div>

          {isEarner && pendingRequests.length > 0 && (
            <Card className="mb-6 bg-amber-500/10 border-amber-500/30">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-amber-300">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  Pending Requests ({pendingRequests.length})
                </h3>
                {pendingRequests.map((vd) => (
                  <div key={vd.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <div className="flex items-center gap-3">
                      <Avatar className="border-2 border-amber-500/30">
                        <AvatarImage src={vd.other_user?.profile_photos?.[0]} />
                        <AvatarFallback className="bg-amber-500/20 text-amber-300">{vd.other_user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-white">{vd.other_user?.name}</p>
                        <p className="text-sm text-white/50">
                          {formatInTimeZone(new Date(vd.scheduled_start), "America/New_York", "MMM d, h:mm a")} EST • {vd.scheduled_duration} min
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                        ${vd.earner_amount.toFixed(2)}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecline(vd)}
                        disabled={actionLoading === vd.id}
                        className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                      >
                        {actionLoading === vd.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(vd)}
                        disabled={actionLoading === vd.id}
                        className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white"
                      >
                        {actionLoading === vd.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" /> Accept
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="upcoming">
            <TabsList className="bg-white/[0.02] border border-white/10">
              <TabsTrigger value="upcoming" className="gap-2 data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-300">
                <Calendar className="w-4 h-4" />
                Upcoming ({upcomingDates.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="gap-2 data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-300">
                <Clock className="w-4 h-4" />
                Past ({pastDates.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-6 space-y-4">
              {upcomingDates.length === 0 ? (
                <Card className="bg-white/[0.02] border-white/10">
                  <CardContent className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Headphones className="w-12 h-12 text-teal-400/30" />
                      <Video className="w-12 h-12 text-rose-400/30" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1 text-white">No upcoming calls</h3>
                    <p className="text-white/50 mb-2">
                      {isSeeker
                        ? "Browse profiles and book an audio or video call!"
                        : "When seekers book with you, they'll appear here."}
                    </p>
                    <p className="text-xs text-white/40 mb-4">Audio-only available • Camera is always optional</p>
                    {isSeeker && (
                      <Button 
                        onClick={() => navigate("/browse")}
                        className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400"
                      >
                        Browse Profiles
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                upcomingDates.map((vd) => {
                  const scheduled = new Date(vd.scheduled_start);
                  const joinable = canJoinCall(vd);
                  return (
                    <Card key={vd.id} className={cn(
                      "bg-white/[0.02] border-white/10",
                      joinable && "border-green-500/30 bg-green-500/5"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-14 h-14 border-2 border-rose-500/30">
                              <AvatarImage src={vd.other_user?.profile_photos?.[0]} />
                              <AvatarFallback className="bg-rose-500/20 text-rose-300">{vd.other_user?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-lg text-white">{vd.other_user?.name}</span>
                                {getStatusBadge(vd)}
                              </div>
                              <p className="text-sm text-white/50">
                                {isToday(scheduled) ? "Today" : formatInTimeZone(scheduled, "America/New_York", "EEEE, MMM d")} at{" "}
                                {formatInTimeZone(scheduled, "America/New_York", "h:mm a")} EST • {vd.scheduled_duration} min
                              </p>
                            </div>
                          </div>
                          {joinable ? (
                            <Button
                              onClick={() => navigate(`/video-call/${vd.id}`)}
                              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white gap-2"
                            >
                              <Phone className="w-4 h-4" /> Join Call
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/messages?to=${vd.other_user?.id}`)}
                                className="border-white/10 text-white/70 hover:bg-white/5"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                              {vd.status === "scheduled" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDate(vd);
                                    setShowCancelDialog(true);
                                  }}
                                  className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        {joinable && (
                          <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <p className="text-sm text-green-300 font-medium">
                              🎥 Your video date is starting! Click "Join Call" to connect.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-6 space-y-4">
              {pastDates.length === 0 ? (
                <Card className="bg-white/[0.02] border-white/10">
                  <CardContent className="py-12 text-center">
                    <Clock className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-1 text-white">No past video dates</h3>
                    <p className="text-white/50">Your completed video dates will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                pastDates.map((vd) => (
                  <Card key={vd.id} className="bg-white/[0.02] border-white/10">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="border border-white/10">
                          <AvatarImage src={vd.other_user?.profile_photos?.[0]} />
                          <AvatarFallback className="bg-white/5 text-white/50">{vd.other_user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">{vd.other_user?.name}</span>
                            {getStatusBadge(vd)}
                          </div>
                          <p className="text-sm text-white/50">
                            {formatInTimeZone(new Date(vd.scheduled_start), "America/New_York", "MMM d, yyyy")} • {vd.scheduled_duration} min
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEarner && vd.status === "completed" && (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                            +${vd.earner_amount.toFixed(2)}
                          </Badge>
                        )}
                        {vd.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/rate/${vd.other_user?.id}?videoDate=${vd.id}`)}
                            className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                          >
                            <Star className="w-4 h-4 mr-1" /> Rate
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="bg-[#1a1a1f] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Cancel Video Date?</DialogTitle>
              <DialogDescription className="text-white/60">
                Cancel your video date with {selectedDate?.other_user?.name}?
                {isSeeker && " Your reserved credits will be refunded."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="border-white/10 text-white hover:bg-white/5">
                Keep
              </Button>
              <Button 
                onClick={handleCancel} 
                disabled={!!actionLoading}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Cancel Date
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Footer />
        <MobileNav />
      </div>

    </div>
  );
}
