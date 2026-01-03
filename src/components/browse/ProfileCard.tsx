import { useMemo, useState, useCallback } from "react";
import { Star, MessageSquare, Video, Heart, MapPin, Ruler, Sparkles, Bookmark, Crown } from "lucide-react";
import { ProfileImage } from "@/components/ui/ProfileImage";
import { cn } from "@/lib/utils";

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
  video_60min_rate?: number;
  video_90min_rate?: number;
  average_rating: number;
  total_ratings: number;
  user_type?: "seeker" | "earner";
  height?: string;
  interests?: string[];
  is_featured?: boolean;
  // If you actually track this, swap the hardcoded "Verified" badge to use it:
  // is_verified?: boolean;
}

interface Props {
  profile: Profile;
  onClick: () => void;
  showLikeButton?: boolean;
  isLiked?: boolean;
  onLikeToggle?: () => void;
  showSaveButton?: boolean;
  isSaved?: boolean;
  onSaveToggle?: () => void;
}

export default function ProfileCard({
  profile,
  onClick,
  showLikeButton = false,
  isLiked = false,
  onLikeToggle,
  showSaveButton = false,
  isSaved = false,
  onSaveToggle,
}: Props) {
  const [imageIndex, setImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const photos = useMemo(
    () => (profile.profile_photos?.length ? profile.profile_photos : ["/placeholder.svg"]),
    [profile.profile_photos],
  );

  const currentPhoto = photos[Math.min(imageIndex, photos.length - 1)] ?? photos[0];
  const isSeeker = profile.user_type === "seeker";
  const isFeatured = !!profile.is_featured;

  const rating = Number.isFinite(profile.average_rating) ? profile.average_rating : 0;
  const ratingCount = Number.isFinite(profile.total_ratings) ? profile.total_ratings : 0;

  const formatLocation = useCallback(() => {
    if (!profile.location_city || !profile.location_state) return "Location not set";
    const st = profile.location_state.trim();
    const stateAbbr = st.length > 2 ? st.slice(0, 2).toUpperCase() : st.toUpperCase();
    return `${profile.location_city}, ${stateAbbr}`;
  }, [profile.location_city, profile.location_state]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLikeToggle?.();
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveToggle?.();
  };

  // Scrub photos by cursor position (desktop only-ish)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (photos.length <= 1) return;
    // Don’t scrub on touch to avoid jank
    if (e.pointerType === "touch") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const segmentWidth = rect.width / photos.length;
    const newIndex = Math.min(Math.floor(x / segmentWidth), photos.length - 1);

    if (newIndex !== imageIndex) setImageIndex(newIndex);
  };

  const renderStars = (val: number) => {
    const clamped = Math.max(0, Math.min(5, val));
    return Array.from({ length: 5 }, (_, i) => {
      const filled = i + 1 <= Math.floor(clamped);
      const half = !filled && i < clamped;

      return (
        <Star
          key={i}
          className={cn(
            "w-3 h-3 transition-colors",
            filled
              ? "text-amber-400 fill-amber-400"
              : half
                ? "text-amber-400 fill-amber-400/50"
                : "text-white/20",
          )}
        />
      );
    });
  };

  const displayVideoCredits = profile.video_15min_rate ?? profile.video_30min_rate;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open profile: ${profile.name || "Anonymous"}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setImageIndex(0);
      }}
      onPointerMove={handlePointerMove}
      className={cn(
        "group relative aspect-[3/4] rounded-2xl overflow-hidden text-left w-full",
        "bg-[#0a0a0f] border border-white/10",
        "hover:border-rose-500/30 transition-all duration-500 ease-out",
        "hover:shadow-2xl hover:shadow-rose-500/20 hover:-translate-y-1",
        "focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]",
        isFeatured && "ring-2 ring-amber-500/50 border-amber-500/30",
      )}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Photo */}
      <div className="absolute inset-0 overflow-hidden">
        <ProfileImage
          src={currentPhoto}
          alt={profile.name || "Profile"}
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            "transition-all duration-700 ease-out",
            isHovered ? "scale-110 brightness-90" : "scale-100",
          )}
        />
      </div>

      {/* Photo indicators */}
      {photos.length > 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {photos.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === imageIndex ? "w-6 bg-white" : "w-2 bg-white/40",
              )}
            />
          ))}
        </div>
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/30 to-transparent" />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-purple-500/10",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        )}
      />

      {/* Featured badge */}
      {isFeatured && (
        <div className="absolute top-3 left-3 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold shadow-lg shadow-amber-500/30">
            <Crown className="w-3 h-3" />
            <span>Featured</span>
          </div>
        </div>
      )}

      {/* Action buttons (valid now because wrapper is a div, not a button) */}
      <div
        className={cn(
          "absolute right-3 top-14 flex flex-col gap-2 z-10",
          "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
          "transition-all duration-300 delay-100",
        )}
      >
        {showLikeButton && (
          <button
            type="button"
            onClick={handleLikeClick}
            aria-label={isLiked ? "Unlike" : "Like"}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "backdrop-blur-md transition-all duration-300",
              "hover:scale-110 active:scale-95",
              isLiked
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                : "bg-white/10 border border-white/20 text-white hover:bg-rose-500/80 hover:border-rose-500",
            )}
          >
            <Heart className={cn("w-5 h-5 transition-transform", isLiked && "fill-current scale-110")} />
          </button>
        )}

        {showSaveButton && (
          <button
            type="button"
            onClick={handleSaveClick}
            aria-label={isSaved ? "Unsave" : "Save"}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "backdrop-blur-md transition-all duration-300",
              "hover:scale-110 active:scale-95",
              isSaved
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                : "bg-white/10 border border-white/20 text-white hover:bg-purple-500/80 hover:border-purple-500",
            )}
          >
            <Bookmark className={cn("w-5 h-5 transition-transform", isSaved && "fill-current scale-110")} />
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4",
          "transform transition-all duration-500 ease-out",
          isHovered ? "translate-y-0" : "translate-y-2",
        )}
      >
        {/* Verified badge (currently always shown) */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2 bg-green-500/20 border border-green-500/30 backdrop-blur-sm">
          <Sparkles className="w-3 h-3 text-green-400" />
          <span className="text-xs font-medium text-green-300">Verified</span>
        </div>

        {/* Name & Age */}
        <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">
          {profile.name || "Anonymous"}
          {profile.age ? <span className="font-normal text-white/70">, {profile.age}</span> : null}
        </h3>

        {/* Location & Height */}
        <div className="flex items-center gap-3 text-sm text-white/60 mb-2">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-rose-400/80" />
            <span>{formatLocation()}</span>
          </div>
          {profile.height && (
            <>
              <span className="text-white/20">•</span>
              <div className="flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-rose-400/80" />
                <span>{profile.height}</span>
              </div>
            </>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5">{renderStars(rating)}</div>
          <span className="text-sm font-medium text-white">{rating.toFixed(1)}</span>
          <span className="text-xs text-white/40">
            ({ratingCount} {ratingCount === 1 ? "review" : "reviews"})
          </span>
        </div>

        {/* Interests */}
        {!!profile.interests?.length && (
          <div
            className={cn(
              "flex flex-wrap gap-1.5 mb-3",
              "opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-20",
              "transition-all duration-300 overflow-hidden",
            )}
          >
            {profile.interests.slice(0, 3).map((interest, index) => (
              <span
                key={`${interest}-${index}`}
                className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10"
              >
                {interest}
              </span>
            ))}
            {profile.interests.length > 3 && (
              <span className="text-xs px-2 py-0.5 text-white/40">+{profile.interests.length - 3} more</span>
            )}
          </div>
        )}

        {/* Pricing (earnersonly) */}
        {!isSeeker && (
          <div
            className={cn(
              "flex items-center gap-3 pt-3 border-t border-white/10",
              "transform transition-all duration-300",
              isHovered ? "opacity-100" : "opacity-80",
            )}
          >
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-purple-400" />
              </div>
              <span className="text-white/70">
                5 <span className="text-white/40">credits</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <Video className="w-3 h-3 text-rose-400" />
              </div>
              <span className="text-white/70">
                {displayVideoCredits}+ <span className="text-white/40">credits</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Hover glow */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl pointer-events-none",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          "shadow-[inset_0_0_60px_rgba(244,63,94,0.1)]",
        )}
      />
    </div>
  );
}
