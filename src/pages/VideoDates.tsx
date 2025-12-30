import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/layout/MobileNav";
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
import { Video, Calendar, Clock, Loader2, Check, X, MessageSquare, Star, Phone, AlertCircle } from "lucide-react";
import { format, isPast, isFuture, isToday, addMinutes, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Interface matching your actual database schema from BookVideoDateModal
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

      // Enrich with other user data
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
        .update({
          status: "scheduled",
        })
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
        .update({
          status: "cancelled",
        })
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
      return <Badge className="bg-emerald-500 animate-pulse">Join Now</Badge>;
    }

    const variants: Record<string, { bg: string; label: string }> = {
      pending: { bg: "bg-rose-500", label: "Pending" },
      scheduled: { bg: "bg-emerald-500", label: "Confirmed" },
      in_progress: { bg: "bg-blue-500", label: "In Progress" },
      completed: { bg: "bg-gray-500", label: "Completed" },
      cancelled: { bg: "bg-gray-500", label: "Cancelled" },
      declined: { bg: "bg-rose-500", label: "Declined" },
      no_show: { bg: "bg-rose-500", label: "No Show" },
    };

    const variant = variants[vd.status] || { bg: "bg-gray-500", label: vd.status };
    return <Badge className={variant.bg}>{variant.label}</Badge>;
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <div className="container max-w-4xl py-6">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-6">
          <Video className="w-8 h-8 text-teal-500" />
          Video Dates
        </h1>

        {isEarner && pendingRequests.length > 0 && (
          <Card className="mb-6 border-amber-500/30 bg-rose-500/5">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Pending Requests ({pendingRequests.length})
              </h3>
              {pendingRequests.map((vd) => (
                <div key={vd.id} className="flex items-center justify-between p-4 rounded-lg bg-background border">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={vd.other_user?.profile_photos?.[0]} />
                      <AvatarFallback>{vd.other_user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{vd.other_user?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(vd.scheduled_start), "MMM d, h:mm a")} • {vd.scheduled_duration} min
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                      ${vd.earner_amount.toFixed(2)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(vd)}
                      disabled={actionLoading === vd.id}
                      className="text-rose-500"
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
                      className="bg-emerald-500"
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
          <TabsList>
            <TabsTrigger value="upcoming">
              <Calendar className="w-4 h-4 mr-2" />
              Upcoming ({upcomingDates.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              <Clock className="w-4 h-4 mr-2" />
              Past ({pastDates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6 space-y-4">
            {upcomingDates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Video className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-1">No upcoming video dates</h3>
                  <p className="text-muted-foreground mb-4">
                    {isSeeker
                      ? "Browse profiles and book a video date!"
                      : "When seekers book with you, they'll appear here."}
                  </p>
                  {isSeeker && <Button onClick={() => navigate("/browse")}>Browse Profiles</Button>}
                </CardContent>
              </Card>
            ) : (
              upcomingDates.map((vd) => {
                const scheduled = new Date(vd.scheduled_start);
                const joinable = canJoinCall(vd);
                return (
                  <Card key={vd.id} className={cn(joinable && "border-emerald-500 bg-emerald-500/5")}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-14 h-14">
                            <AvatarImage src={vd.other_user?.profile_photos?.[0]} />
                            <AvatarFallback>{vd.other_user?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-lg">{vd.other_user?.name}</span>
                              {getStatusBadge(vd)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {isToday(scheduled) ? "Today" : format(scheduled, "EEEE, MMM d")} at{" "}
                              {format(scheduled, "h:mm a")} • {vd.scheduled_duration} min
                            </p>
                          </div>
                        </div>
                        {joinable ? (
                          <Button
                            onClick={() => navigate(`/video-call/${vd.id}`)}
                            className="bg-emerald-500 hover:bg-emerald-600 gap-2"
                          >
                            <Phone className="w-4 h-4" /> Join Call
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/messages?to=${vd.other_user?.id}`)}
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
                                className="text-rose-500"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      {joinable && (
                        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-sm text-emerald-600 font-medium">
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
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-1">No past video dates</h3>
                  <p className="text-muted-foreground">Your completed video dates will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              pastDates.map((vd) => (
                <Card key={vd.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={vd.other_user?.profile_photos?.[0]} />
                        <AvatarFallback>{vd.other_user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{vd.other_user?.name}</span>
                          {getStatusBadge(vd)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(vd.scheduled_start), "MMM d, yyyy")} • {vd.scheduled_duration} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEarner && vd.status === "completed" && (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                          +${vd.earner_amount.toFixed(2)}
                        </Badge>
                      )}
                      {vd.status === "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/rate/${vd.other_user?.id}?videoDate=${vd.id}`)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Video Date?</DialogTitle>
            <DialogDescription>
              Cancel your video date with {selectedDate?.other_user?.name}?
              {isSeeker && " Your reserved credits will be refunded."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!!actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Cancel Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
      <MobileNav />
    </div>
  );
}
