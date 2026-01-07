import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Star,
  MessageSquare,
  Video,
  Image,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gem,
  Ban,
  Flag,
  MoreVertical,
  Heart,
  Ruler,
  Sparkles,
  Phone,
  X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import LowBalanceModal from "@/components/credits/LowBalanceModal";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";
import BlockUserModal from "@/components/safety/BlockUserModal";
import ReportUserModal from "@/components/safety/ReportUserModal";
import OnlineIndicator from "@/components/ui/OnlineIndicator";
import { cn } from "@/lib/utils";
import { deriveAudioRate } from "@/lib/pricing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  name: string;
  age: number | null;
  location_city: string;
  location_state: string;
  bio: string;
  profile_photos: string[];
  video_15min_rate?: number;
  video_30min_rate: number;
  video_60min_rate: number;
  video_90min_rate?: number;
  average_rating: number;
  total_ratings: number;
  created_at: string;
  height?: string;
  hobbies?: string[];
  interests?: string[];
  is_online?: boolean;
}

interface Rating {
  id: string;
  overall_rating: number;
  review_text: string | null;
  created_at: string;
  rater_name: string;
}

interface Props {
  profile: Profile | null;
  onClose: () => void;
  isEarnerViewing?: boolean;
  isLiked?: boolean;
  onLikeToggle?: () => void;
}

export default function ProfileDetailSheet({
  profile,
  onClose,
  isEarnerViewing,
  isLiked,
  onLikeToggle,
}: Props) {
  const navigate = useNavigate();
  const { wallet } = useWallet();

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const MESSAGE_COST = 5;

  useEffect(() => {
    if (!profile?.id) return;

    async function fetchReviews() {
      const { data } = await supabase
        .from("ratings")
        .select("id, overall_rating, review_text, created_at, rater_id")
        .eq("rated_id", profile.id)
        .not("review_text", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!data) return;

      const raterIds = data.map((r: any) => r.rater_id);
      const { data: raters } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", raterIds);

      const map = new Map(raters?.map((r) => [r.id, r.name]));
      setReviews(
        data.map((r: any) => ({
          id: r.id,
          overall_rating: r.overall_rating,
          review_text: r.review_text,
          created_at: r.created_at,
          rater_name: map.get(r.rater_id) || "Anonymous",
        }))
      );
    }

    fetchReviews();
  }, [profile?.id]);

  if (!profile) return null;

  const photos = profile.profile_photos || [];
  const memberSince = profile.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : "Unknown";
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  const renderStars = (rating: number) => (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-3 h-3",
            star <= rating
              ? "text-amber-400 fill-amber-400"
              : "text-white/30"
          )}
        />
      ))}
    </div>
  );

  const handleSendMessage = () => {
    if ((wallet?.credit_balance || 0) < MESSAGE_COST) {
      setShowLowBalance(true);
      return;
    }
    onClose();
    navigate(`/messages?to=${profile.id}`);
  };

  return (
    <>
      <Sheet open={!!profile} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-[480px] p-0 bg-[#0a0a0f] border-white/10">
          {/* HEADER IMAGE */}
          <div className="relative aspect-[4/5]">
            <img
              src={photos[currentPhotoIndex] || "/placeholder.svg"}
              alt={profile.name}
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0a0a0f]" />

            <button
              onClick={onClose}
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {photos.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentPhotoIndex((i) =>
                      i === 0 ? photos.length - 1 : i - 1
                    )
                  }
                  className="absolute left-0 inset-y-0 w-16"
                >
                  <ChevronLeft className="w-8 h-8 text-white mx-auto" />
                </button>
                <button
                  onClick={() =>
                    setCurrentPhotoIndex((i) => (i + 1) % photos.length)
                  }
                  className="absolute right-0 inset-y-0 w-16"
                >
                  <ChevronRight className="w-8 h-8 text-white mx-auto" />
                </button>
              </>
            )}
          </div>

          {/* CONTENT */}
          <div className="p-6 space-y-6 pb-24">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {profile.name} {profile.age && <span>{profile.age}</span>}
              </h2>
              <div className="flex items-center gap-2 text-white/60">
                <MapPin className="w-4 h-4 text-rose-400" />
                {profile.location_city}, {profile.location_state}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {renderStars(profile.average_rating)}
              <span className="text-white">
                {profile.average_rating.toFixed(1)} ({profile.total_ratings})
              </span>
            </div>

            {profile.bio && (
              <div>
                <h4 className="text-white font-semibold mb-1">About</h4>
                <p className="text-white/70">{profile.bio}</p>
              </div>
            )}

            {/* REVIEWS */}
            {reviews.length > 0 && (
              <div className="space-y-3">
                {displayedReviews.map((r) => (
                  <div key={r.id} className="bg-white/5 p-3 rounded-lg">
                    {renderStars(r.overall_rating)}
                    <p className="text-white/70">{r.review_text}</p>
                  </div>
                ))}
                {reviews.length > 2 && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowAllReviews(!showAllReviews)}
                  >
                    {showAllReviews ? "Show Less" : "See All Reviews"}
                  </Button>
                )}
              </div>
            )}

            {/* PRICING */}
            {!isEarnerViewing && (
              <Tabs defaultValue="video">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="video">Video</TabsTrigger>
                  <TabsTrigger value="audio">Audio</TabsTrigger>
                </TabsList>

                <TabsContent value="video">
                  <RateCard
                    duration="30 min"
                    rate={profile.video_30min_rate}
                    icon={Video}
                  />
                </TabsContent>

                <TabsContent value="audio">
                  <RateCard
                    duration="30 min"
                    rate={deriveAudioRate(profile.video_30min_rate)}
                    icon={Phone}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* ACTION BAR */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-[#0a0a0f]">
            <Button onClick={handleSendMessage} className="w-full">
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <LowBalanceModal
        open={showLowBalance}
        onOpenChange={setShowLowBalance}
        currentBalance={wallet?.credit_balance || 0}
        requiredCredits={MESSAGE_COST}
        onBuyCredits={() => {
          setShowLowBalance(false);
          setShowBuyCredits(true);
        }}
      />

      <BuyCreditsModal open={showBuyCredits} onOpenChange={setShowBuyCredits} />
      <BlockUserModal
        open={showBlockModal}
        onOpenChange={setShowBlockModal}
        userId={profile.id}
        userName={profile.name}
        onBlocked={onClose}
      />
      <ReportUserModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        userId={profile.id}
        userName={profile.name}
      />
    </>
  );
}

/* ---------- Helper ---------- */
function RateCard({
  duration,
  rate,
  icon: Icon,
}: {
  duration: string;
  rate: number;
  icon: any;
}) {
  return (
    <div className="p-3 bg-white/5 rounded-lg text-center">
      <Icon className="w-4 h-4 mx-auto mb-1 text-white/50" />
      <p className="text-xs text-white/40">{duration}</p>
      <p className="text-white font-bold">{rate} Credits</p>
    </div>
  );
}
