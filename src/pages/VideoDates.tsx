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

interface VideoDate {
  id: string;
  seeker_id: string;
  earner_id: string;
  duration_minutes: number;
  credits_cost: number;
  earner_amount: number;
  scheduled_at: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "completed" | "no_show";
  room_url: string | null;
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
    fetchVideoDates();
  }, [user, isEarner]);

  const fetchVideoDates = async () => {
    if (!user) return;

    try {
      const column = isEarner ? "earner_id" : "seeker_id";
      const { data, error } = await supabase
        .from("video_dates")
        .select("*")
        .eq(column, user.id)
        .order("scheduled_at", { ascending: false });

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (vd) => {
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
      const roomName = `lynxx-${vd.id.substring(0, 8)}`;
      await supabase
        .from("video_dates")
        .update({
          status: "accepted",
          room_url: `https://lynxx.daily.co/${roomName}`,
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
        .update({ status: "cancelled", cancelled_by: user?.id })
        .eq("id", selectedDate.id);
      toast.success("Cancelled");
      setShowCancelDialog(false);
      fetchVideoDates();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string, scheduledAt: string) => {
    const minutesUntil = differenceInMinutes(new Date(scheduledAt), new Date());
    if (status === "accepted" && minutesUntil <= 5 && minutesUntil >= -30) {
      return <Badge className="bg-emerald-500 animate-pulse">Join Now</Badge>;
    }
    const variants: Record<string, string> = {
      pending: "bg-amber-500",
      accepted: "bg-emerald-500",
      declined: "bg-rose-500",
      cancelled: "bg-gray-500",
      completed: "bg-blue-500",
      no_show: "bg-rose-500",
    };
    return <Badge className={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const upcomingDates = videoDates.filter(
    (vd) => ["pending", "accepted"].includes(vd.status) && isFuture(new Date(vd.scheduled_at)),
  );
  const pastDates = videoDates.filter(
    (vd) =>
      !["pending", "accepted"].includes(vd.status) ||
      isPast(addMinutes(new Date(vd.scheduled_at), vd.duration_minutes)),
  );
  const pendingRequests = videoDates.filter((vd) => vd.status === "pending");

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
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
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
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
                        {format(new Date(vd.scheduled_at), "MMM d, h:mm a")} • {vd.duration_minutes} min
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(vd)}
                      disabled={actionLoading === vd.id}
                      className="text-rose-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(vd)}
                      disabled={actionLoading === vd.id}
                      className="bg-emerald-500"
                    >
                      <Check className="w-4 h-4 mr-1" /> Accept
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
                  <p className="text-muted-foreground">No upcoming video dates</p>
                </CardContent>
              </Card>
            ) : (
              upcomingDates.map((vd) => {
                const canJoin =
                  differenceInMinutes(new Date(vd.scheduled_at), new Date()) <= 5 && vd.status === "accepted";
                return (
                  <Card key={vd.id} className={cn(canJoin && "border-emerald-500")}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={vd.other_user?.profile_photos?.[0]} />
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{vd.other_user?.name}</span>
                            {getStatusBadge(vd.status, vd.scheduled_at)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {isToday(new Date(vd.scheduled_at)) ? "Today" : format(new Date(vd.scheduled_at), "MMM d")}{" "}
                            at {format(new Date(vd.scheduled_at), "h:mm a")} • {vd.duration_minutes} min
                          </p>
                        </div>
                      </div>
                      {canJoin ? (
                        <Button onClick={() => navigate(`/video-call/${vd.id}`)} className="bg-emerald-500">
                          <Phone className="w-4 h-4 mr-2" /> Join
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
                  <p className="text-muted-foreground">No past video dates</p>
                </CardContent>
              </Card>
            ) : (
              pastDates.map((vd) => (
                <Card key={vd.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={vd.other_user?.profile_photos?.[0]} />
                      </Avatar>
                      <div>
                        <span className="font-semibold">{vd.other_user?.name}</span>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(vd.scheduled_at), "MMM d, yyyy")} • {vd.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(vd.status, vd.scheduled_at)}
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
              This will cancel your video date with {selectedDate?.other_user?.name}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
      <MobileNav />
    </div>
  );
}
