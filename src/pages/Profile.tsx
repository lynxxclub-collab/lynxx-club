import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  MessageSquare,
  Video,
  Heart,
  Bookmark,
  MapPin,
  Ruler,
  Calendar,
  Star,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Gem,
  Share2,
  Flag,
  X,
  Crown,
  Loader2,
  Gift,
  Headphones,
  Briefcase,
  GraduationCap,
  Globe,
  HeartHandshake,
  Utensils,
  Music,
  Film,
  Search,
  Lightbulb,
  Cigarette,
  Wine,
  Dumbbell,
  Compass,
  Users,
} from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSavedProfiles } from "@/hooks/useSavedProfiles";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";
import BookVideoDateModal from "@/components/video/BookVideoDateModal";
import GiftModal from "@/components/gifts/GiftModal";
import GiftAnimation from "@/components/gifts/GiftAnimation";
import TopGiftersModule from "@/components/leaderboard/TopGiftersModule";
import RankUpNudge from "@/components/leaderboard/RankUpNudge";
import { ProfileImage } from "@/components/ui/ProfileImage";

// ============================================================================
// Types
// ============================================================================

interface ProfileData {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  location_city: string;
  location_state: string;
  bio: string;
  profile_photos: string[];
  user_type: "seeker" | "earner";
  video_15min_rate: number;
  video_30min_rate: number;
  video_60min_rate: number;
  video_90min_rate: number;
  average_rating: number;
  total_ratings: number;
  height: string;
  hobbies: string[];
  interests: string[];
  is_featured: boolean;
  created_at: string;
  verification_status: string;
  leaderboard_enabled?: boolean;
  show_daily_leaderboard?: boolean;
  personality_traits?: string[];
  relationship_status?: string;
  languages?: string[];
  education?: string;
  occupation?: string;
  favorite_food?: string;
  favorite_music?: string;
  favorite_movies?: string;
  looking_for?: string;
  fun_facts?: string[];
  smoking?: string;
  drinking?: string;
  fitness_level?: string;
  values_beliefs?: string;
  _age?: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  rater: {
    name: string;
    profile_photos: string[];
  };
}

type AccentColor = "amber" | "rose" | "purple" | "teal";

const ACCENT_COLORS: Record<AccentColor, string> = {
  amber: "text-amber-500",
  rose: "text-rose-500",
  purple: "text-purple-400",
  teal: "text-teal-400",
};

// ============================================================================
// Reusable Components
// ============================================================================

const ProfileSection = ({
  icon: Icon,
  title,
  children,
  className = "",
  accentColor = "amber",
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
  accentColor?: AccentColor;
}) => (
  <div className={cn("glass-card p-4 md:p-5", className)}>
    <div className="flex items-center gap-2 mb-3 md:mb-4">
      <div className={cn("p-1.5 md:p-2 rounded-lg bg-white/5", ACCENT_COLORS[accentColor])}>
        <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
      </div>
      <h3 className="font-semibold text-white text-sm md:text-base">{title}</h3>
    </div>
    {children}
  </div>
);

const InfoRow = ({
  icon: Icon,
  label,
  value,
  accentColor = "amber",
}: {
  icon: React.ElementType;
  label: string;
  value: string | undefined;
  accentColor?: AccentColor;
}) => {
  if (!value) return null;

  return (
    <div className="flex items-center gap-2.5 md:gap-3 py-2">
      <Icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0", ACCENT_COLORS[accentColor])} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] md:text-xs text-white/40">{label}</p>
        <p className="text-sm md:text-base text-white/80 truncate">{value}</p>
      </div>
    </div>
  );
};

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex">
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "w-3.5 h-3.5 md:w-4 md:h-4",
          i < Math.floor(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30",
        )}
      />
    ))}
  </div>
);

const TagBadge = ({ children, accentColor = "amber" }: { children: React.ReactNode; accentColor?: AccentColor }) => {
  const styles: Record<AccentColor, string> = {
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    teal: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  };

  return (
    <Badge className={cn("px-2 py-0.5 md:px-3 md:py-1 text-xs md:text-sm", styles[accentColor])}>{children}</Badge>
  );
};

// ============================================================================
// Photo Gallery Component (Mobile-First with Touch Support)
// ============================================================================

const PhotoGallery = ({
  photos,
  currentIndex,
  setCurrentIndex,
  name,
  isFeatured,
  onOpenFullscreen,
}: {
  photos: string[];
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  name: string;
  isFeatured: boolean;
  onOpenFullscreen: () => void;
}) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const goNext = useCallback(() => {
    setCurrentIndex(currentIndex === photos.length - 1 ? 0 : currentIndex + 1);
  }, [currentIndex, photos.length, setCurrentIndex]);

  const goPrev = useCallback(() => {
    setCurrentIndex(currentIndex === 0 ? photos.length - 1 : currentIndex - 1);
  }, [currentIndex, photos.length, setCurrentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goNext() : goPrev();
    }
    setTouchStart(null);
  };

  return (
    <div className="w-full">
      {/* Main Photo - Mobile: Full width, taller aspect ratio */}
      <div
        className="relative aspect-[3/4] md:aspect-[4/5] rounded-xl overflow-hidden cursor-pointer group"
        onClick={onOpenFullscreen}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <ProfileImage
          src={photos[currentIndex]}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Photo indicators - Larger touch targets on mobile */}
        {photos.length > 1 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(i);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all touch-manipulation",
                  i === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/50 active:bg-white/70",
                )}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Navigation arrows - Always visible on mobile, hover on desktop */}
        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity active:scale-95 touch-manipulation"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity active:scale-95 touch-manipulation"
              aria-label="Next photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Featured badge */}
        {isFeatured && (
          <Badge className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs">
            <Crown className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        )}

        {/* Photo count */}
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs">
          {currentIndex + 1} / {photos.length}
        </div>
      </div>

      {/* Thumbnails - Horizontal scroll on mobile */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto py-2 mt-2 scrollbar-hide -mx-1 px-1">
          {photos.map((photo, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all touch-manipulation",
                i === currentIndex ? "border-primary" : "border-transparent opacity-60 active:opacity-100",
              )}
            >
              <ProfileImage src={photo} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Fullscreen Gallery Modal
// ============================================================================

const FullscreenGallery = ({
  open,
  onClose,
  photos,
  currentIndex,
  setCurrentIndex,
  name,
}: {
  open: boolean;
  onClose: () => void;
  photos: string[];
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  name: string;
}) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const goNext = () => setCurrentIndex(currentIndex === photos.length - 1 ? 0 : currentIndex + 1);
  const goPrev = () => setCurrentIndex(currentIndex === 0 ? photos.length - 1 : currentIndex - 1);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev();
    setTouchStart(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-full md:max-w-4xl md:h-auto p-0 bg-black/95 border-0 md:border md:border-white/10">
        <div
          className="relative w-full h-full md:aspect-[3/4] lg:aspect-video flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <ProfileImage src={photos[currentIndex]} alt={name} className="max-w-full max-h-full object-contain" />

          {/* Close button - Larger on mobile */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-11 h-11 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 touch-manipulation"
            aria-label="Close gallery"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 touch-manipulation"
                aria-label="Previous"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 touch-manipulation"
                aria-label="Next"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm">
            {currentIndex + 1} / {photos.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// Rates Card Component
// ============================================================================

const RatesCard = ({ profile }: { profile: ProfileData }) => {
  const rates = useMemo(
    () => [
      { min: 15, video: profile.video_15min_rate, audio: Math.round(profile.video_15min_rate * 0.7) },
      { min: 30, video: profile.video_30min_rate, audio: Math.round(profile.video_30min_rate * 0.7) },
      { min: 60, video: profile.video_60min_rate, audio: Math.round(profile.video_60min_rate * 0.7) },
    ],
    [profile],
  );

  return (
    <ProfileSection icon={Gem} title="Rates" accentColor="amber">
      <p className="text-[11px] md:text-xs text-muted-foreground mb-3">Audio & Video calls • Camera optional</p>

      {/* Message rate */}
      <div className="p-2.5 md:p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center mb-3">
        <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-amber-500 mx-auto mb-1" />
        <p className="text-[10px] md:text-xs text-muted-foreground">Message</p>
        <p className="font-bold text-sm md:text-base text-foreground">5 Credits</p>
      </div>

      {/* Call rates */}
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        {/* Video */}
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-center justify-center gap-1 text-[10px] md:text-xs text-muted-foreground">
            <Video className="w-3 h-3" />
            <span>Video</span>
          </div>
          {rates.map(({ min, video }) => (
            <div key={min} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
              <p className="text-[10px] md:text-xs text-muted-foreground">{min} min</p>
              <p className="font-bold text-xs md:text-sm text-foreground">{video} Credits</p>
            </div>
          ))}
        </div>

        {/* Audio */}
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-center justify-center gap-1 text-[10px] md:text-xs text-muted-foreground">
            <Headphones className="w-3 h-3" />
            <span>Audio</span>
          </div>
          {rates.map(({ min, audio }) => (
            <div key={min} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
              <p className="text-[10px] md:text-xs text-muted-foreground">{min} min</p>
              <p className="font-bold text-xs md:text-sm text-foreground">{audio} Credits</p>
            </div>
          ))}
        </div>
      </div>
    </ProfileSection>
  );
};

// ============================================================================
// Review Card Component
// ============================================================================

const ReviewCard = ({ review }: { review: Review }) => (
  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
    <div className="flex items-start gap-2.5 md:gap-3">
      <Avatar className="w-8 h-8 md:w-9 md:h-9 border border-white/10">
        <AvatarImage src={review.rater?.profile_photos?.[0]} />
        <AvatarFallback className="bg-secondary text-muted-foreground text-xs">
          {review.rater?.name?.charAt(0) || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-foreground text-xs md:text-sm truncate">
            {review.rater?.name || "Anonymous"}
          </span>
          <span className="text-[10px] md:text-xs text-muted-foreground flex-shrink-0">
            {format(new Date(review.created_at), "MMM d")}
          </span>
        </div>
        <StarRating rating={review.rating} />
        {review.comment && (
          <p className="text-[11px] md:text-xs text-foreground/60 line-clamp-2 mt-1">{review.comment}</p>
        )}
      </div>
    </div>
  </div>
);

// ============================================================================
// Action Buttons (Mobile-First Sticky Footer Pattern)
// ============================================================================

const SeekerActions = ({
  onMessage,
  onVideoBook,
  onGift,
}: {
  onMessage: () => void;
  onVideoBook: () => void;
  onGift: () => void;
}) => (
  <div className="space-y-2 md:space-y-3">
    {/* Primary actions - Stack on mobile */}
    <div className="flex flex-col gap-2 md:flex-row md:gap-3">
      <Button onClick={onMessage} className="flex-1 btn-gradient-primary py-5 md:py-5 text-sm touch-manipulation">
        <MessageSquare className="w-4 h-4 mr-2" />
        Message
        <Badge className="ml-2 bg-white/20 text-white border-0 text-xs">
          5 <Gem className="w-3 h-3 ml-0.5" />
        </Badge>
      </Button>
      <Button
        onClick={onVideoBook}
        variant="outline"
        className="flex-1 border-teal-500/50 text-teal-400 hover:bg-teal-500/10 py-5 md:py-5 text-sm touch-manipulation"
      >
        <Headphones className="w-4 h-4 mr-1" />
        <span className="text-white/30 mx-0.5">/</span>
        <Video className="w-4 h-4 mr-2" />
        Book Call
      </Button>
    </div>

    <p className="text-center text-[10px] md:text-xs text-muted-foreground">
      Audio or Video • Camera optional • Credits only used while connected
    </p>

    <Button
      onClick={onGift}
      variant="outline"
      className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10 py-5 text-sm touch-manipulation"
    >
      <Gift className="w-4 h-4 mr-2" />
      Send a Gift
    </Button>
  </div>
);

// ============================================================================
// Loading Skeleton
// ============================================================================

const ProfileSkeleton = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <div className="container max-w-6xl px-4 py-4">
      <div className="glass-card p-4 md:p-6 mb-4">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Photo skeleton */}
          <div className="aspect-[3/4] md:aspect-[4/5] rounded-xl bg-white/5 animate-pulse" />

          {/* Info skeleton */}
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
            <div className="h-20 w-full bg-white/5 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-12 flex-1 bg-white/5 rounded animate-pulse" />
              <div className="h-12 flex-1 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// Main Profile Component
// ============================================================================

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile: myProfile } = useAuth();
  const { wallet } = useWallet();
  const { isSaved, toggleSave } = useSavedProfiles();

  // State
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showVideoBooking, setShowVideoBooking] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftAnimation, setGiftAnimation] = useState<{
    emoji: string;
    type: "standard" | "premium" | "ultra";
  } | null>(null);
  const [isLiked, setIsLiked] = useState(false);

  // Derived state
  const isSeeker = myProfile?.user_type === "seeker";
  const isOwnProfile = user?.id === id;
  const photos = useMemo(
    () => (profile?.profile_photos?.length ? profile.profile_photos : ["/placeholder.svg"]),
    [profile],
  );
  const age =
    profile?._age || (profile?.date_of_birth ? differenceInYears(new Date(), new Date(profile.date_of_birth)) : null);
  const location = useMemo(() => {
    if (profile?.location_city && profile?.location_state) {
      return `${profile.location_city}, ${profile.location_state}`;
    }
    return profile?.location_state || "";
  }, [profile]);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;

      try {
        const { data: profileData, error } = await supabase.rpc("get_public_profile_by_id", {
          profile_id: id,
        });

        if (error) throw error;

        if (profileData?.[0]) {
          const p = profileData[0] as Record<string, unknown>;
          setProfile({
            id: p.id as string,
            name: p.name as string,
            date_of_birth: "",
            gender: p.gender as string,
            location_city: p.location_city as string,
            location_state: p.location_state as string,
            bio: p.bio as string,
            profile_photos: p.profile_photos as string[],
            user_type: p.user_type as "seeker" | "earner",
            video_15min_rate: p.video_15min_rate as number,
            video_30min_rate: p.video_30min_rate as number,
            video_60min_rate: p.video_60min_rate as number,
            video_90min_rate: p.video_90min_rate as number,
            average_rating: p.average_rating as number,
            total_ratings: p.total_ratings as number,
            height: p.height as string,
            hobbies: p.hobbies as string[],
            interests: p.interests as string[],
            is_featured: false,
            created_at: p.created_at as string,
            verification_status: "verified",
            leaderboard_enabled: (p.leaderboard_enabled as boolean) ?? true,
            show_daily_leaderboard: (p.show_daily_leaderboard as boolean) ?? true,
            personality_traits: p.personality_traits as string[],
            relationship_status: p.relationship_status as string,
            languages: p.languages as string[],
            education: p.education as string,
            occupation: p.occupation as string,
            favorite_food: p.favorite_food as string,
            favorite_music: p.favorite_music as string,
            favorite_movies: p.favorite_movies as string,
            looking_for: p.looking_for as string,
            fun_facts: p.fun_facts as string[],
            smoking: p.smoking as string,
            drinking: p.drinking as string,
            fitness_level: p.fitness_level as string,
            values_beliefs: p.values_beliefs as string,
            _age: p.age as number,
          });
        }

        // Fetch reviews
        const { data: reviewsData } = await supabase
          .from("ratings")
          .select("id, overall_rating, review_text, created_at, rater_id")
          .eq("rated_id", id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (reviewsData?.length) {
          const raterIds = reviewsData.map((r) => r.rater_id);
          const { data: raterProfiles } = await supabase
            .from("profiles")
            .select("id, name, profile_photos")
            .in("id", raterIds);

          const raterMap = new Map(raterProfiles?.map((p) => [p.id, p]) || []);

          setReviews(
            reviewsData.map((r) => ({
              id: r.id,
              rating: r.overall_rating,
              comment: r.review_text,
              created_at: r.created_at,
              rater: raterMap.get(r.rater_id) || { name: "Anonymous", profile_photos: [] },
            })) as Review[],
          );
        }

        // Check if liked (for earners viewing seekers)
        if (user && myProfile?.user_type === "earner") {
          const { data: likeData } = await supabase
            .from("profile_likes")
            .select("id")
            .eq("liker_id", user.id)
            .eq("liked_id", id)
            .single();

          setIsLiked(!!likeData);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, user, myProfile?.user_type]);

  // Handlers
  const handleMessage = useCallback(() => {
    if (!user) {
      navigate("/auth?mode=signup");
      return;
    }
    navigate(`/messages?to=${id}`);
  }, [user, navigate, id]);

  const handleLikeToggle = useCallback(async () => {
    if (!user || !id) return;

    try {
      if (isLiked) {
        await supabase.from("profile_likes").delete().eq("liker_id", user.id).eq("liked_id", id);
        setIsLiked(false);
        toast.success("Removed from likes");
      } else {
        await supabase.from("profile_likes").insert({ liker_id: user.id, liked_id: id });
        setIsLiked(true);
        toast.success("Added to likes");
      }
    } catch {
      toast.error("Failed to update");
    }
  }, [user, id, isLiked]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.share({
        title: `${profile?.name} on Lynxx Club`,
        url: window.location.href,
      });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  }, [profile?.name]);

  // Loading state
  if (loading) return <ProfileSkeleton />;

  // Not found state
  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center px-4">
          <h1 className="text-xl md:text-2xl font-bold mb-2 text-foreground">Profile Not Found</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-6">
            This profile doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/browse")} className="btn-gradient-primary px-6 py-2">
            Browse Profiles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        <Header />

        <main className="container max-w-6xl px-3 md:px-4 py-3 md:py-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-2 md:mb-4 text-muted-foreground hover:text-foreground hover:bg-secondary/50 -ml-1 touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {/* Hero Section */}
          <section className="glass-card p-3 md:p-6 mb-4 md:mb-6">
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
              {/* Photo Gallery */}
              <PhotoGallery
                photos={photos}
                currentIndex={currentPhotoIndex}
                setCurrentIndex={setCurrentPhotoIndex}
                name={profile.name}
                isFeatured={profile.is_featured}
                onOpenFullscreen={() => setShowGallery(true)}
              />

              {/* Profile Info */}
              <div className="lg:col-span-2 space-y-3 md:space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Name & Age */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-display">
                        {profile.name}
                        {age && <span className="text-muted-foreground">, {age}</span>}
                      </h1>
                      {profile.verification_status === "verified" && (
                        <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20 text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>

                    {/* Quick info */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                      {location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          {location}
                        </span>
                      )}
                      {profile.height && (
                        <span className="flex items-center gap-1">
                          <Ruler className="w-3.5 h-3.5 text-purple-400" />
                          {profile.height}
                        </span>
                      )}
                      {profile.occupation && (
                        <span className="hidden md:flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                          {profile.occupation}
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mt-2">
                      <StarRating rating={profile.average_rating} />
                      <span className="font-semibold text-foreground text-sm">{profile.average_rating.toFixed(1)}</span>
                      <span className="text-muted-foreground text-xs">
                        ({profile.total_ratings} {profile.total_ratings === 1 ? "review" : "reviews"})
                      </span>
                    </div>
                  </div>

                  {/* Action icons */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleShare}
                      className="h-9 w-9 md:h-10 md:w-10 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/50 touch-manipulation"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    {!isOwnProfile && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleSave(id!)}
                        className={cn(
                          "h-9 w-9 md:h-10 md:w-10 border-border/50 hover:bg-secondary/50 touch-manipulation",
                          isSaved(id!) ? "text-amber-500" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Bookmark className={cn("w-4 h-4", isSaved(id!) && "fill-current")} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <div className="p-3 md:p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{profile.bio}</p>
                  </div>
                )}

                {/* Seeker viewing Earner - Action buttons */}
                {isSeeker && profile.user_type === "earner" && !isOwnProfile && (
                  <SeekerActions
                    onMessage={handleMessage}
                    onVideoBook={() => setShowVideoBooking(true)}
                    onGift={() => setShowGiftModal(true)}
                  />
                )}

                {/* Earner viewing Seeker - Like button */}
                {myProfile?.user_type === "earner" && profile.user_type === "seeker" && !isOwnProfile && (
                  <Button
                    onClick={handleLikeToggle}
                    variant={isLiked ? "default" : "outline"}
                    className={cn(
                      "w-full py-5 text-sm touch-manipulation",
                      isLiked ? "btn-gradient-rose" : "border-rose-500/50 text-rose-400 hover:bg-rose-500/10",
                    )}
                  >
                    <Heart className={cn("w-4 h-4 mr-2", isLiked && "fill-current")} />
                    {isLiked ? "Liked" : "Like Profile"}
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Content Grid - Single column on mobile, 2-3 on larger */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
            {/* Column 1 */}
            <div className="space-y-3 md:space-y-4">
              {/* Rates */}
              {profile.user_type === "earner" && <RatesCard profile={profile} />}

              {/* Basic Info */}
              <ProfileSection icon={Users} title="Basic Info" accentColor="rose">
                <div className="divide-y divide-white/5">
                  <InfoRow
                    icon={HeartHandshake}
                    label="Relationship"
                    value={profile.relationship_status}
                    accentColor="rose"
                  />
                  <InfoRow icon={GraduationCap} label="Education" value={profile.education} accentColor="purple" />
                  <InfoRow icon={Briefcase} label="Occupation" value={profile.occupation} accentColor="amber" />
                  <InfoRow icon={Globe} label="Languages" value={profile.languages?.join(", ")} accentColor="teal" />
                </div>
              </ProfileSection>

              {/* Lifestyle */}
              <ProfileSection icon={Compass} title="Lifestyle" accentColor="teal">
                <div className="divide-y divide-white/5">
                  <InfoRow icon={Cigarette} label="Smoking" value={profile.smoking} accentColor="amber" />
                  <InfoRow icon={Wine} label="Drinking" value={profile.drinking} accentColor="rose" />
                  <InfoRow icon={Dumbbell} label="Fitness" value={profile.fitness_level} accentColor="teal" />
                </div>
              </ProfileSection>

              {/* Leaderboard */}
              {profile.user_type === "earner" && profile.leaderboard_enabled !== false && (
                <TopGiftersModule
                  creatorId={profile.id}
                  creatorName={profile.name}
                  showDaily={profile.show_daily_leaderboard !== false}
                />
              )}
            </div>

            {/* Column 2 */}
            <div className="space-y-3 md:space-y-4">
              {/* Looking For */}
              {profile.looking_for && (
                <ProfileSection icon={Search} title="Looking For" accentColor="rose">
                  <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{profile.looking_for}</p>
                </ProfileSection>
              )}

              {/* Interests */}
              {profile.interests?.length > 0 && (
                <ProfileSection icon={Heart} title="Interests" accentColor="purple">
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {profile.interests.map((interest, i) => (
                      <TagBadge key={i} accentColor="purple">
                        {interest}
                      </TagBadge>
                    ))}
                  </div>
                </ProfileSection>
              )}

              {/* Hobbies */}
              {profile.hobbies?.length > 0 && (
                <ProfileSection icon={Sparkles} title="Hobbies" accentColor="amber">
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {profile.hobbies.map((hobby, i) => (
                      <TagBadge key={i} accentColor="amber">
                        {hobby}
                      </TagBadge>
                    ))}
                  </div>
                </ProfileSection>
              )}

              {/* Personality */}
              {profile.personality_traits?.length > 0 && (
                <ProfileSection icon={Users} title="Personality" accentColor="teal">
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {profile.personality_traits.map((trait, i) => (
                      <TagBadge key={i} accentColor="teal">
                        {trait}
                      </TagBadge>
                    ))}
                  </div>
                </ProfileSection>
              )}

              {/* Values */}
              {profile.values_beliefs && (
                <ProfileSection icon={Compass} title="Values & Beliefs" accentColor="purple">
                  <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{profile.values_beliefs}</p>
                </ProfileSection>
              )}
            </div>

            {/* Column 3 */}
            <div className="space-y-3 md:space-y-4 md:col-span-2 lg:col-span-1">
              {/* Favorites */}
              {(profile.favorite_food || profile.favorite_music || profile.favorite_movies) && (
                <ProfileSection icon={Heart} title="Favorites" accentColor="rose">
                  <div className="divide-y divide-white/5">
                    <InfoRow icon={Utensils} label="Food" value={profile.favorite_food} accentColor="amber" />
                    <InfoRow icon={Music} label="Music" value={profile.favorite_music} accentColor="purple" />
                    <InfoRow icon={Film} label="Movies" value={profile.favorite_movies} accentColor="rose" />
                  </div>
                </ProfileSection>
              )}

              {/* Fun Facts */}
              {profile.fun_facts?.length > 0 && (
                <ProfileSection icon={Lightbulb} title="Fun Facts" accentColor="amber">
                  <ul className="space-y-2">
                    {profile.fun_facts.map((fact, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </ProfileSection>
              )}

              {/* Reviews */}
              <ProfileSection icon={Star} title={`Reviews (${profile.total_ratings})`} accentColor="amber">
                {reviews.length === 0 ? (
                  <div className="text-center py-6">
                    <Star className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.slice(0, 3).map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}
              </ProfileSection>

              {/* Member since */}
              <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground py-4">
                <Calendar className="w-4 h-4" />
                Member since {format(new Date(profile.created_at), "MMMM yyyy")}
              </div>

              {/* Report */}
              {!isOwnProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 touch-manipulation"
                  onClick={() => navigate(`/report?user=${id}`)}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Report Profile
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Fullscreen Gallery */}
      <FullscreenGallery
        open={showGallery}
        onClose={() => setShowGallery(false)}
        photos={photos}
        currentIndex={currentPhotoIndex}
        setCurrentIndex={setCurrentPhotoIndex}
        name={profile.name}
      />

      {/* Modals */}
      <BuyCreditsModal open={showBuyCredits} onOpenChange={setShowBuyCredits} />

      <BookVideoDateModal
        open={showVideoBooking}
        onOpenChange={setShowVideoBooking}
        conversationId={null}
        earnerId={id || ""}
        earnerName={profile.name}
        video15Rate={profile.video_15min_rate}
        video30Rate={profile.video_30min_rate}
        video60Rate={profile.video_60min_rate}
        video90Rate={profile.video_90min_rate}
      />

      <GiftModal
        open={showGiftModal}
        onOpenChange={setShowGiftModal}
        recipientId={id || ""}
        recipientName={profile.name}
        conversationId={null}
        onGiftSent={(result) => {
          setGiftAnimation({ emoji: result.gift_emoji, type: result.animation_type });
        }}
      />

      {giftAnimation && (
        <GiftAnimation
          emoji={giftAnimation.emoji}
          animationType={giftAnimation.type}
          onComplete={() => setGiftAnimation(null)}
        />
      )}

      {/* Rank Up Nudge */}
      {isSeeker && profile.user_type === "earner" && !isOwnProfile && (
        <RankUpNudge creatorId={profile.id} creatorName={profile.name} />
      )}

      <Footer />
      <MobileNav />
    </div>
  );
}
