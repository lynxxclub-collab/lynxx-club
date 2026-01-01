import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Headphones,
  HeartHandshake,
  GraduationCap,
  Briefcase,
  Globe,
  Compass,
  Cigarette,
  Wine,
  Dumbbell,
  Search,
  Utensils,
  Music,
  Film,
  Lightbulb,
  Users,
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
import { cn } from "@/lib/utils";
import { deriveAudioRate } from "@/lib/pricing";
import { ProfileImage } from "@/components/ui/ProfileImage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// Types
// ============================================================================

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
  user_type?: "seeker" | "earner";
  height?: string;
  hobbies?: string[];
  interests?: string[];
  // Extended fields
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

// ============================================================================
// Reusable Components
// ============================================================================

type AccentColor = "amber" | "rose" | "purple" | "teal";

const ACCENT_COLORS: Record<AccentColor, string> = {
  amber: "text-amber-500",
  rose: "text-rose-500",
  purple: "text-purple-400",
  teal: "text-teal-400",
};

const BADGE_STYLES: Record<AccentColor, string> = {
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  teal: "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

const SectionCard = ({
  icon: Icon,
  title,
  children,
  accentColor = "amber",
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  accentColor?: AccentColor;
}) => (
  <div className="p-3 rounded-xl bg-card border border-border">
    <div className="flex items-center gap-2 mb-2">
      <div className={cn("p-1.5 rounded-lg bg-white/5", ACCENT_COLORS[accentColor])}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <h4 className="font-semibold text-sm text-foreground">{title}</h4>
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
    <div className="flex items-center gap-2.5 py-1.5">
      <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", ACCENT_COLORS[accentColor])} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground truncate">{value}</p>
      </div>
    </div>
  );
};

const TagList = ({
  items,
  accentColor = "amber",
  limit,
}: {
  items: string[];
  accentColor?: AccentColor;
  limit?: number;
}) => {
  const displayItems = limit ? items.slice(0, limit) : items;
  const remaining = limit ? items.length - limit : 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayItems.map((item, i) => (
        <Badge key={i} className={cn("px-2 py-0.5 text-xs", BADGE_STYLES[accentColor])}>
          {item}
        </Badge>
      ))}
      {remaining > 0 && <span className="text-xs text-muted-foreground px-2 py-0.5">+{remaining} more</span>}
    </div>
  );
};

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={cn("w-3.5 h-3.5", star <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground")}
      />
    ))}
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export default function ProfileDetailSheet({ profile, onClose, isEarnerViewing, isLiked, onLikeToggle }: Props) {
  const navigate = useNavigate();
  const { profile: userProfile } = useAuth();
  const { wallet } = useWallet();

  // State
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const MESSAGE_COST = 5;

  // Fetch reviews
  useEffect(() => {
    if (!profile?.id) return;

    async function fetchReviews() {
      const { data } = await supabase
        .from("ratings")
        .select("id, overall_rating, review_text, created_at, rater_id")
        .eq("rated_id", profile!.id)
        .not("review_text", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const raterIds = data.map((r) => r.rater_id);
        const { data: raters } = await supabase.from("profiles").select("id, name").in("id", raterIds);

        const raterMap = new Map(raters?.map((r) => [r.id, r.name]) || []);

        setReviews(
          data.map((r) => ({
            id: r.id,
            overall_rating: r.overall_rating,
            review_text: r.review_text,
            created_at: r.created_at,
            rater_name: raterMap.get(r.rater_id) || "Anonymous",
          })),
        );
      } else {
        setReviews([]);
      }
    }

    fetchReviews();
  }, [profile?.id]);

  // Reset photo index when profile changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
    setShowAllReviews(false);
  }, [profile?.id]);

  if (!profile) return null;

  const photos = profile.profile_photos || [];
  const memberSince = format(new Date(profile.created_at), "MMMM yyyy");
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  // Photo navigation
  const nextPhoto = () => setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  const prevPhoto = () => setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? nextPhoto() : prevPhoto();
    }
    setTouchStart(null);
  };

  // Send message
  const handleSendMessage = () => {
    if ((wallet?.credit_balance || 0) < MESSAGE_COST) {
      setShowLowBalance(true);
      return;
    }
    onClose();
    navigate(`/messages?to=${profile.id}`);
  };

  // Check if there's any extended profile data to show
  const hasBasicInfo =
    profile.relationship_status ||
    profile.education ||
    profile.occupation ||
    (profile.languages && profile.languages.length > 0);
  const hasLifestyle = profile.smoking || profile.drinking || profile.fitness_level;
  const hasFavorites = profile.favorite_food || profile.favorite_music || profile.favorite_movies;

  return (
    <>
      <Sheet open={!!profile} onOpenChange={() => onClose()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-border p-0">
          {/* Photo Gallery */}
          <div className="relative aspect-[4/5] bg-card" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <ProfileImage
              src={photos[currentPhotoIndex] || "/placeholder.svg"}
              alt={profile.name || "Profile"}
              className="w-full h-full object-cover"
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 left-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors touch-manipulation"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Actions dropdown */}
            <div className="absolute top-3 right-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors touch-manipulation">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowReportModal(true)} className="text-destructive">
                    <Flag className="w-4 h-4 mr-2" />
                    Report User
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowBlockModal(true)} className="text-destructive">
                    <Ban className="w-4 h-4 mr-2" />
                    Block User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Photo navigation */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors touch-manipulation"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors touch-manipulation"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Photo indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={cn(
                        "h-1.5 rounded-full transition-all touch-manipulation",
                        index === currentPhotoIndex ? "w-6 bg-white" : "w-1.5 bg-white/50",
                      )}
                      aria-label={`Go to photo ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Header */}
            <div>
              {/* Verified badge */}
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal/20 text-teal text-xs mb-2">
                <Sparkles className="w-3 h-3" />
                Verified
              </div>

              {/* Name & Age */}
              <h2 className="text-xl font-bold text-foreground">
                {profile.name || "Anonymous"}
                {profile.age && <span className="text-muted-foreground font-normal">, {profile.age}</span>}
              </h2>

              {/* Location */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {profile.location_city}, {profile.location_state}
              </div>

              {/* Quick stats row */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                {profile.height && (
                  <span className="flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5" />
                    {profile.height}
                  </span>
                )}
                {profile.occupation && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {profile.occupation}
                  </span>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-2">
                <StarRating rating={profile.average_rating} />
                <span className="font-medium text-sm">{profile.average_rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({profile.total_ratings} reviews)</span>
              </div>

              {/* Member since */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                <Calendar className="w-3.5 h-3.5" />
                Member since {memberSince}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="p-3 rounded-xl bg-card border border-border">
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Looking For */}
            {profile.looking_for && (
              <SectionCard icon={Search} title="Looking For" accentColor="rose">
                <p className="text-sm text-muted-foreground">{profile.looking_for}</p>
              </SectionCard>
            )}

            {/* Basic Info */}
            {hasBasicInfo && (
              <SectionCard icon={Users} title="Basic Info" accentColor="purple">
                <div className="space-y-1">
                  <InfoRow
                    icon={HeartHandshake}
                    label="Relationship"
                    value={profile.relationship_status}
                    accentColor="rose"
                  />
                  <InfoRow icon={GraduationCap} label="Education" value={profile.education} accentColor="purple" />
                  <InfoRow icon={Briefcase} label="Occupation" value={profile.occupation} accentColor="amber" />
                  {profile.languages && profile.languages.length > 0 && (
                    <InfoRow icon={Globe} label="Languages" value={profile.languages.join(", ")} accentColor="teal" />
                  )}
                </div>
              </SectionCard>
            )}

            {/* Lifestyle */}
            {hasLifestyle && (
              <SectionCard icon={Compass} title="Lifestyle" accentColor="teal">
                <div className="space-y-1">
                  <InfoRow icon={Cigarette} label="Smoking" value={profile.smoking} accentColor="amber" />
                  <InfoRow icon={Wine} label="Drinking" value={profile.drinking} accentColor="rose" />
                  <InfoRow icon={Dumbbell} label="Fitness" value={profile.fitness_level} accentColor="teal" />
                </div>
              </SectionCard>
            )}

            {/* Values & Beliefs */}
            {profile.values_beliefs && (
              <SectionCard icon={Compass} title="Values & Beliefs" accentColor="purple">
                <p className="text-sm text-muted-foreground">{profile.values_beliefs}</p>
              </SectionCard>
            )}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <SectionCard icon={Heart} title="Interests" accentColor="purple">
                <TagList items={profile.interests} accentColor="purple" />
              </SectionCard>
            )}

            {/* Hobbies */}
            {profile.hobbies && profile.hobbies.length > 0 && (
              <SectionCard icon={Sparkles} title="Hobbies" accentColor="teal">
                <TagList items={profile.hobbies} accentColor="teal" />
              </SectionCard>
            )}

            {/* Personality Traits */}
            {profile.personality_traits && profile.personality_traits.length > 0 && (
              <SectionCard icon={Users} title="Personality" accentColor="amber">
                <TagList items={profile.personality_traits} accentColor="amber" />
              </SectionCard>
            )}

            {/* Favorites */}
            {hasFavorites && (
              <SectionCard icon={Heart} title="Favorites" accentColor="rose">
                <div className="space-y-1">
                  <InfoRow icon={Utensils} label="Food" value={profile.favorite_food} accentColor="amber" />
                  <InfoRow icon={Music} label="Music" value={profile.favorite_music} accentColor="purple" />
                  <InfoRow icon={Film} label="Movies" value={profile.favorite_movies} accentColor="rose" />
                </div>
              </SectionCard>
            )}

            {/* Fun Facts */}
            {profile.fun_facts && profile.fun_facts.length > 0 && (
              <SectionCard icon={Lightbulb} title="Fun Facts" accentColor="amber">
                <ul className="space-y-1.5">
                  {profile.fun_facts.map((fact, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {/* Rates - only show when seeker is viewing earner */}
            {!isEarnerViewing && profile.user_type === "earner" && (
              <SectionCard icon={Gem} title="Rates" accentColor="amber">
                <p className="text-xs text-muted-foreground mb-3">Audio and Video calls available • Camera optional</p>

                {/* Message rates */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                    <MessageSquare className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Text</p>
                    <p className="font-semibold text-sm">5 Credits</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                    <Image className="w-4 h-4 text-teal-400 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Image</p>
                    <p className="font-semibold text-sm">10 Credits</p>
                  </div>
                </div>

                {/* Call rates */}
                <div className="grid grid-cols-2 gap-2">
                  {profile.video_15min_rate && (
                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                      <Video className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground">15 min</p>
                      <p className="font-semibold text-sm">{profile.video_15min_rate} Credits</p>
                    </div>
                  )}
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                    <Video className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">30 min</p>
                    <p className="font-semibold text-sm">{profile.video_30min_rate} Credits</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                    <Video className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">60 min</p>
                    <p className="font-semibold text-sm">{profile.video_60min_rate} Credits</p>
                  </div>
                  {profile.video_90min_rate && (
                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                      <Video className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground">90 min</p>
                      <p className="font-semibold text-sm">{profile.video_90min_rate} Credits</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <SectionCard icon={Star} title={`Reviews (${profile.total_ratings})`} accentColor="amber">
                <div className="space-y-2">
                  {displayedReviews.map((review) => (
                    <div key={review.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <StarRating rating={review.overall_rating} />
                          <span className="text-xs font-medium">{review.rater_name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{review.review_text}</p>
                    </div>
                  ))}
                </div>
                {reviews.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="w-full mt-2 text-primary text-xs"
                  >
                    {showAllReviews ? "Show Less" : `See All ${profile.total_ratings} Reviews`}
                  </Button>
                )}
              </SectionCard>
            )}

            {/* Action Button */}
            <div className="pt-2 pb-4">
              {isEarnerViewing ? (
                <Button
                  onClick={onLikeToggle}
                  variant={isLiked ? "default" : "outline"}
                  className={cn(
                    "w-full py-5 touch-manipulation",
                    isLiked && "bg-rose-500 hover:bg-rose-600 text-white",
                  )}
                >
                  <Heart className={cn("w-4 h-4 mr-2", isLiked && "fill-current")} />
                  {isLiked ? "Liked" : "Like This Profile"}
                </Button>
              ) : (
                <Button
                  onClick={handleSendMessage}
                  className="w-full py-5 bg-primary hover:bg-primary/90 touch-manipulation"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                  <span className="ml-2 flex items-center text-primary-foreground/80">
                    <Gem className="w-3 h-3 mr-1" />5
                  </span>
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modals */}
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
        userName={profile.name || "User"}
        onBlocked={onClose}
      />

      <ReportUserModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        userId={profile.id}
        userName={profile.name || "User"}
      />
    </>
  );
}
