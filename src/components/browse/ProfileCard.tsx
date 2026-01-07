import { useState } from "react";
import { Star, MessageSquare, Video, Heart, MapPin, Ruler, Sparkles, Bookmark, Crown, Signal } from "lucide-react";
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
  is_online?: boolean; // For real-time status
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
  showLikeButton,
  isLiked,
  onLikeToggle,
  showSaveButton,
  isSaved,
  onSaveToggle,
}: Props) {
  const [imageIndex, setImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const photos = profile.profile_photos?.length > 0 ? profile.profile_photos : ["/placeholder.svg"];
  const currentPhoto = photos[imageIndex] || photos[0];
  const isSeeker = profile.user_type === "seeker";
  const isFeatured = profile.is_featured;
  const hasMultiplePhotos = photos.length > 1;

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLikeToggle?.();
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveToggle?.();
  };

  // MOBILE & DESKTOP INTERACTION: 
  // On mobile: Tap the photo area to cycle images (excluding buttons).
  // On desktop: Hover logic handles it.
  const handlePhotoAreaClick = (e: React.MouseEvent) => {
    // If the click target is the image itself (not a button), cycle photo
    if ((e.target as HTMLElement).tagName === 'IMG' || (e.target as HTMLElement).classList.contains('photo-container')) {
      if (hasMultiplePhotos) {
        e.stopPropagation(); // Don't trigger the main onClick immediately
        setImageIndex((prev) => (prev + 1) % photos.length);
      }
    }
  };

  const formatLocation = () => {
    if (!profile.location_city || !profile.location_state) return "Location not set";
    const stateAbbr =
      profile.location_state.length > 2
        ? profile.location_state.substring(0, 2).toUpperCase()
        : profile.location_state.toUpperCase();
    return `${profile.location_city}, ${stateAbbr}`;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "w-3 h-3 transition-colors",
          i < Math.floor(rating)
            ? "text-amber-400 fill-amber-400"
            : i < rating
              ? "text-amber-400 fill-amber-400/50"
              : "text-white/20",
        )}
      />
    ));
  };

  // Determine the lowest available price for display
  const getMinPrice = () => {
    const prices = [
      profile.video_15min_rate,
      profile.video_30min_rate,
      profile.video_60min_rate,
      profile.video_90min_rate,
    ].filter((p): p is number => p !== undefined);
    return Math.min(...prices);
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setImageIndex(0); // Reset to first photo on mouse leave
      }}
      className={cn(
        "group relative w-full aspect-[3/4] rounded-2xl overflow-hidden",
        "bg-[#0a0a0f]",
        "border border-white/10",
        "hover:border-rose-500/30 transition-all duration-500 ease-out",
        "hover:shadow-2xl hover:shadow-rose-500/20",
        "focus:outline-none focus:ring-2 focus:ring-rose-500/50",
        "text-left select-none",
        "active:scale-[0.98]", // Touch feedback
        isFeatured && "ring-2 ring-amber-500/50 border-amber-500/30",
      )}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* 1. Photo Layer */}
      <div 
        className="absolute inset-0 overflow-hidden photo-container"
        onClick={handlePhotoAreaClick}
      >
        <ProfileImage
          src={currentPhoto}
          alt={profile.name || "Profile"}
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            "transition-transform duration-700 ease-out",
            isHovered ? "scale-110" : "scale-100",
          )}
        />
      </div>

      {/* 2. Photo Indicators (Dots) */}
      {hasMultiplePhotos && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1 z-10 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm">
          {photos.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === imageIndex ? "w-4 bg-white" : "w-1.5 bg-white/50",
              )}
            />
          ))}
        </div>
      )}

      {/* 3. Gradients & Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 via-[#0a0a0f]/20 to-transparent" />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-purple-500/10",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        )}
      />

      {/* 4. Top Right Badges */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2 z-20 pointer-events-none">
        {isFeatured && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-amber-500/20">
            <Crown className="w-3 h-3 fill-white" />
            <span>Featured</span>
          </div>
        )}
        {profile.is_online && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30 backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-bold text-green-400 uppercase">Online</span>
          </div>
        )}
      </div>

      {/* 5. Action Buttons (Always visible on mobile, hover on desktop) */}
      <div
        className={cn(
          "absolute right-3 bottom-24 md:bottom-4 flex flex-col gap-2 z-20",
          // Mobile: Visible but translucent
          "opacity-90 md:opacity-0",
          // Desktop: Visible on hover
          "md:group-hover:opacity-100 md:translate-y-2 md:group-hover:translate-y-0",
          "transition-all duration-300",
        )}
      >
        {showLikeButton && (
          <button
            onClick={handleLikeClick}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "backdrop-blur-md transition-all duration-300",
              "hover:scale-110 active:scale-95",
              isLiked
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                : "bg-black/40 border border-white/20 text-white hover:bg-rose-500 hover:border-rose-500",
            )}
          >
            <Heart className={cn("w-5 h-5 transition-transform", isLiked && "fill-current scale-110")} />
          </button>
        )}

        {showSaveButton && (
          <button
            onClick={handleSaveClick}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "backdrop-blur-md transition-all duration-300",
              "hover:scale-110 active:scale-95",
              isSaved
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                : "bg-black/40 border border-white/20 text-white hover:bg-purple-500 hover:border-purple-500",
            )}
          >
            <Bookmark className={cn("w-5 h-5 transition-transform", isSaved && "fill-current scale-110")} />
          </button>
        )}
      </div>

      {/* 6. Content (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        {/* Verified Badge */}
        <div
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full mb-2 backdrop-blur-sm",
            "bg-emerald-500/20 border border-emerald-500/30",
          )}
        >
          <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Verified</span>
        </div>

        {/* Name, Age, Location */}
        <div className="space-y-1 mb-3">
          <h3 className="text-xl font-bold text-white leading-none drop-shadow-md">
            {profile.name || "Anonymous"}
            {profile.age && <span className="font-normal text-white/70 ml-1.5">{profile.age}</span>}
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-white/80">
            <div className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
              <span>{formatLocation()}</span>
            </div>
            {profile.height && (
              <>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>{profile.height}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5">{renderStars(profile.average_rating)}</div>
          <span className="text-sm font-bold text-white">{profile.average_rating.toFixed(1)}</span>
          <span className="text-xs text-white/50">({profile.total_ratings})</span>
        </div>

        {/* Interests Tags (Desktop only, to save mobile space) */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="hidden md:flex flex-wrap gap-1.5 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {profile.interests.slice(0, 3).map((interest, index) => (
              <span
                key={index}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10"
              >
                {interest}
              </span>
            ))}
          </div>
        )}

        {/* Pricing - Earner Only */}
        {!isSeeker && (
          <div className="flex items-center gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <Video className="w-3 h-3 text-rose-400" />
              </div>
              <span className="text-white font-semibold">
                {getMinPrice()}+ <span className="text-white/50 font-normal">credits</span>
              </span>
            </div>
            <div className="h-3 w-px bg-white/20" />
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-purple-400" />
              </div>
              <span className="text-white font-semibold">
                Message
              </span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}