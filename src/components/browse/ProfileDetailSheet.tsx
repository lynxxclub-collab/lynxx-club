import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  MessageSquare,
  Video,
  Image as ImageIcon,
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
  Tag,
  Sparkles,
  Phone,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import LowBalanceModal from "@/components/credits/LowBalanceModal";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";
import BlockUserModal from "@/components/safety/BlockUserModal";
import ReportUserModal from "@/components/safety/ReportUserModal";
import { cn } from "@/lib/utils";
import { deriveAudioRate } from "@/lib/pricing";

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
}

interface RatingRow {
  id: string;
  overall_rating: number;
  review_text: string | null;
  created_at: string;
  rater_id: string;
}

interface RaterRow {
  id: string;
  name: string | null;
}

interface Rating {
  id: string;
  overall_rating: number;
  review_text: string | null;
  created_at: string;
  rater_name: string; // ✅ always string
}

interface Props {
  profile: Profile | null;
  onClose: () => void;
  isEarnerViewing?: boolean;
  isLiked?: boolean;
  onLikeToggle?: () => void;
}

const MESSAGE_COST = 5;
const IMAGE_COST = 10;

export default function ProfileDetailSheet({
  profile,
  onClose,
  isEarnerViewing = false,
  isLiked = false,
  onLikeToggle,
}: Props) {
  const navigate = useNavigate();
  const { wallet } = useWallet();

  const [photoIndex, setPhotoIndex] = useState(0);
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [reviews, setReviews] = useState<Rating[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Reset UI state when profile changes
  useEffect(() => {
    setPhotoIndex(0);
    setShowAllReviews(false);
    setReviews([]);
  }, [profile?.id]);

  const photos = useMemo(() => {
    return profile?.profile_photos?.length ? profile.profile_photos : ["/placeholder.svg"];
  }, [profile?.profile_photos]);

  const currentPhoto = photos[Math.min(photoIndex, photos.length - 1)] ?? photos[0];

  const memberSince = useMemo(() => {
    if (!profile?.created_at) return null;
    return format(new Date(profile.created_at), "MMMM yyyy");
  }, [profile?.created_at]);

  const rating = useMemo(() => {
    const r = Number(profile?.average_rating ?? 0);
    return Number.isFinite(r) ? r : 0;
  }, [profile?.average_rating]);

  const ratingCount = useMemo(() => {
    const c = Number(profile?.total_ratings ?? 0);
    return Number.isFinite(c) ? c : 0;
  }, [profile?.total_ratings]);

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  const nextPhoto = useCallback(() => {
    if (photos.length <= 1) return;
    setPhotoIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const prevPhoto = useCallback(() => {
    if (photos.length <= 1) return;
    setPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const handleSendMessage = useCallback(() => {
    if ((wallet?.credit_balance || 0) < MESSAGE_COST) {
      setShowLowBalance(true);
      return;
    }
    if (!profile?.id) return;

    onClose();
    navigate(`/messages?to=${profile.id}`);
  }, [wallet?.credit_balance, profile?.id, onClose, navigate]);

  const renderStars = (value: number) => {
    const clamped = Math.max(0, Math.min(5, value));
    const full = Math.floor(clamped);
    const hasHalf = clamped - full >= 0.5;

    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => {
          const idx = i + 1;
          const isFull = idx <= full;
          const isHalf = !isFull && idx === full + 1 && hasHalf;

          return (
            <Star
              key={idx}
              className={cn(
                "w-3.5 h-3.5",
                isFull
                  ? "text-amber-400 fill-amber-400"
                  : isHalf
                    ? "text-amber-400 fill-amber-400/50"
                    : "text-white/20",
              )}
            />
          );
        })}
      </div>
    );
  };

  // ✅ Fix rater_name typing + safer merge (never "unknown")
  useEffect(() => {
    if (!profile?.id) return;

    let cancelled = false;

    const safeName = (v: unknown): string => {
      if (typeof v === "string" && v.trim()) return v.trim();
      return "Anonymous";
    };

    async function fetchReviews() {
      setLoadingReviews(true);

      try {
        const { data, error } = await supabase
          .from("ratings")
          .select("id, overall_rating, review_text, created_at, rater_id")
          .eq("rated_id", profile.id)
          .not("review_text", "is", null)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        const rows = (data ?? []) as RatingRow[];
        if (!rows.length) {
          if (!cancelled) setReviews([]);
          return;
        }

        const raterIds = Array.from(new Set(rows.map((r) => r.rater_id)));

        // (A) Prefer a typed select so TS knows `name` is string | null
        const { data: raters, error: ratersError } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", raterIds);

        if (ratersError) throw ratersError;

        const raterMap = new Map<string, string>();
        ((raters ?? []) as RaterRow[]).forEach((r) => {
          raterMap.set(r.id, safeName(r.name));
        });

        const merged: Rating[] = rows.map((r) => ({
          id: r.id,
          overall_rating: Number(r.overall_rating ?? 0),
          review_text: r.review_text,
          created_at: r.created_at,
          rater_name: raterMap.get(r.rater_id) ?? "Anonymous",
        }));

        if (!cancelled) setReviews(merged);
      } catch (e) {
        console.error("Error fetching reviews:", e);
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoadingReviews(false);
      }
    }

    fetchReviews();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  if (!profile) return null;

  const showRates = !isEarnerViewing;
  const audio15 = profile.video_15min_rate ? deriveAudioRate(profile.video_15min_rate) : undefined;
  const audio30 = deriveAudioRate(profile.video_30min_rate);

  return (
    <>
      <Sheet open={!!profile} onOpenChange={onClose}>
        {/* NOTE: your updated SheetContent supports children + dark styling */}
        <SheetContent className="p-0">
          {/* Photo */}
          <div className="relative aspect-[4/5] bg-white/[0.02] border-b border-white/10">
            <img src={currentPhoto} alt={profile.name || "Profile"} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/75 via-transparent to-transparent" />

            {/* Top actions */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {!isEarnerViewing && onLikeToggle && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLikeToggle();
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all",
                    isLiked
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                      : "bg-white/10 border border-white/20 text-white hover:bg-rose-500/70 hover:border-rose-500/50",
                  )}
                  aria-label={isLiked ? "Unlike" : "Like"}
                >
                  <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                </button>
              )}

              {/* Lightweight dropdown (no portal) */}
              <div className="relative group">
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center hover:bg-white/15 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-5 h-5 text-white" />
                </button>

                <div className="absolute right-0 mt-2 w-44 rounded-xl bg-[#12121a] border border-white/10 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-300 hover:bg-white/5 rounded-t-xl"
                  >
                    <Flag className="w-4 h-4" />
                    Report user
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBlockModal(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-300 hover:bg-white/5 rounded-b-xl"
                  >
                    <Ban className="w-4 h-4" />
                    Block user
                  </button>
                </div>
              </div>
            </div>

            {/* Photo nav */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevPhoto}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center hover:bg-white/15 transition-colors"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>

                <button
                  type="button"
                  onClick={nextPhoto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center hover:bg-white/15 transition-colors"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPhotoIndex(i)}
                      className={cn("h-1 rounded-full transition-all", i === photoIndex ? "w-7 bg-white" : "w-2 bg-white/40")}
                      aria-label={`Photo ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Header */}
            <div className="space-y-2">
              <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 inline-flex gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Verified
              </Badge>

              <h2 className="text-2xl font-bold text-white">
                {profile.name || "Anonymous"}
                {profile.age ? <span className="font-normal text-white/70">, {profile.age}</span> : null}
              </h2>

              <div className="flex items-center gap-2 text-sm text-white/60">
                <MapPin className="w-4 h-4 text-rose-400" />
                <span>
                  {profile.location_city}, {profile.location_state}
                </span>
              </div>

              {!!profile.height && (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Ruler className="w-4 h-4 text-rose-400" />
                  <span>{profile.height}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] border border-white/10 p-4">
              <div className="flex items-center gap-2">
                {renderStars(rating)}
                <span className="text-sm font-semibold text-white">{rating.toFixed(1)}</span>
                <span className="text-xs text-white/40">({ratingCount} reviews)</span>
              </div>
              {memberSince && (
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Calendar className="w-4 h-4" />
                  Member since {memberSince}
                </div>
              )}
            </div>

            {/* Interests */}
            {!!profile.interests?.length && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-white">
                  <Tag className="w-4 h-4 text-purple-400" />
                  Interests
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, index) => (
                    <span
                      key={`${interest}-${index}`}
                      className="px-3 py-1 rounded-full bg-purple-500/15 text-purple-200 text-sm border border-purple-500/20"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {!!profile.bio && (
              <div className="space-y-2">
                <h4 className="font-semibold text-white">About</h4>
                <p className="text-white/60 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Rates */}
            {showRates && (
              <div className="space-y-3">
                <h4 className="font-semibold text-white">Rates</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                    <MessageSquare className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <p className="text-xs text-white/40">Text</p>
                    <p className="font-semibold text-white">{MESSAGE_COST} Credits</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                    <ImageIcon className="w-5 h-5 text-rose-400 mx-auto mb-1" />
                    <p className="text-xs text-white/40">Image</p>
                    <p className="font-semibold text-white">{IMAGE_COST} Credits</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {profile.video_15min_rate ? (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                      <Video className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                      <p className="text-xs text-white/40">Video 15m</p>
                      <p className="font-semibold text-white">{profile.video_15min_rate} Credits</p>
                    </div>
                  ) : null}

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                    <Video className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-xs text-white/40">Video 30m</p>
                    <p className="font-semibold text-white">{profile.video_30min_rate} Credits</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                    <Video className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-xs text-white/40">Video 60m</p>
                    <p className="font-semibold text-white">{profile.video_60min_rate} Credits</p>
                  </div>

                  {profile.video_90min_rate ? (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                      <Video className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                      <p className="text-xs text-white/40">Video 90m</p>
                      <p className="font-semibold text-white">{profile.video_90min_rate} Credits</p>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {audio15 ? (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                      <Phone className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                      <p className="text-xs text-white/40">Audio 15m</p>
                      <p className="font-semibold text-white">{audio15} Credits</p>
                    </div>
                  ) : null}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                    <Phone className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <p className="text-xs text-white/40">Audio 30m</p>
                    <p className="font-semibold text-white">{audio30} Credits</p>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white">Reviews</h4>

              {loadingReviews ? (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-white/50">Loading reviews…</div>
              ) : reviews.length ? (
                <>
                  <div className="space-y-3">
                    {displayedReviews.map((review) => (
                      <div key={review.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="space-y-1">
                            {renderStars(review.overall_rating)}
                            <div className="text-sm font-medium text-white">{review.rater_name}</div>
                          </div>
                          <div className="text-xs text-white/40">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        <p className="text-sm text-white/60">{review.review_text}</p>
                      </div>
                    ))}
                  </div>

                  {reviews.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllReviews((v) => !v)}
                      className="w-full border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl"
                    >
                      {showAllReviews ? "Show Less" : `See All ${Math.max(ratingCount, reviews.length)} Reviews`}
                    </Button>
                  )}
                </>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-sm text-white/50">
                  No written reviews yet.
                </div>
              )}
            </div>

            {/* CTA */}
            {isEarnerViewing ? (
              <Button
                type="button"
                onClick={onLikeToggle}
                variant={isLiked ? "default" : "outline"}
                className={cn(
                  "w-full rounded-xl",
                  isLiked ? "bg-rose-500 hover:bg-rose-600 text-white" : "border-white/10 text-white/80 hover:bg-white/5",
                )}
              >
                <Heart className={cn("w-4 h-4 mr-2", isLiked && "fill-current")} />
                {isLiked ? "Liked" : "Like This Profile"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSendMessage}
                className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white font-semibold"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
                <span className="ml-2 flex items-center text-white/90">
                  <Gem className="w-3 h-3 mr-1" />
                  {MESSAGE_COST}
                </span>
              </Button>
            )}
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