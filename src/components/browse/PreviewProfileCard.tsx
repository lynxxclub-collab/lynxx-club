import { MapPin, Lock, User, Sparkles, Signal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PreviewProfile {
  id: string;
  first_name: string;
  profile_photo: string | null;
  location_city: string | null;
  user_type: "earner" | "seeker";
  is_featured: boolean;
  is_online?: boolean; // For real-time status
}

interface Props {
  profile: PreviewProfile;
  onClick?: () => void;
}

// Helper to build public URL for profile photos
function getPublicPhotoUrl(photoPath: string | null): string | null {
  if (!photoPath) return null;
  // If it's already a full URL, extract the path
  if (photoPath.includes("supabase.co")) {
    const match = photoPath.match(/profile-photos\/(.+)/);
    if (match) {
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-photos/${match[1]}`;
    }
  }
  // If it's just a path, build the full URL
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-photos/${photoPath}`;
}

export default function PreviewProfileCard({ profile, onClick }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full aspect-[3/4] rounded-2xl overflow-hidden",
        "bg-gray-100 dark:bg-[#0a0a0f]", // Base background
        "border border-white/10 shadow-lg",
        "hover:shadow-2xl hover:shadow-rose-500/10 transition-all duration-300",
        "hover:scale-[1.02] active:scale-[0.98]", // Mobile touch feedback
        "focus:outline-none focus:ring-2 focus:ring-rose-500/50",
        "text-left select-none", // Prevent text selection on mobile
      )}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* 1. Loading Skeleton */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-white/5 animate-pulse z-0" />
      )}

      {/* 2. Profile photo or placeholder */}
      {profile.profile_photo ? (
        <img
          src={getPublicPhotoUrl(profile.profile_photo) || undefined}
          alt={profile.first_name}
          loading="lazy"
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-rose-500/10 to-[#0a0a0f] flex items-center justify-center">
          <User className="w-20 h-20 text-white/10" />
        </div>
      )}

      {/* 3. Desktop Hover Overlay (Hidden on Mobile) */}
      {/* Only shows on devices that support hover, protecting the 'preview' nature on desktop */}
      <div className="hidden sm:flex absolute inset-0 backdrop-blur-md bg-[#0a0a0f]/60 flex-col items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-rose-400" />
        </div>
        <span className="text-sm font-medium text-white text-center px-4">Sign up to see full profile</span>
      </div>

      {/* 4. Gradient Overlay (Bottom) for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent opacity-95 sm:opacity-90 pointer-events-none" />

      {/* 5. Badges (Top Section) */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none z-20">
        {/* Featured Badge */}
        {profile.is_featured && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 backdrop-blur-sm shadow-sm">
            <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-amber-300 text-[10px] font-bold uppercase tracking-wider">Featured</span>
          </div>
        )}

        {/* Online Status Indicator (Real-time) */}
        {profile.is_online && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30 backdrop-blur-sm shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-300 text-[10px] font-bold uppercase tracking-wider">Online</span>
          </div>
        )}
      </div>

      {/* 6. Content (Bottom Section) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 z-20 pointer-events-none">
        
        <div className="flex items-center justify-between">
           {/* User Type Badge */}
          <div
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wide border backdrop-blur-md",
              profile.user_type === "earner"
                ? "bg-rose-500/90 text-white border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                : "bg-purple-500/90 text-white border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]",
            )}
          >
            {profile.user_type === "earner" ? "Earner" : "Seeker"}
          </div>
        </div>

        {/* Name & Location */}
        <div>
          <h3 className="text-xl font-bold text-white leading-tight drop-shadow-md">
            {profile.first_name}
          </h3>
          
          <div className="flex items-center gap-1.5 text-sm text-white/70 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span className="truncate">{profile.location_city || "Location Unknown"}</span>
          </div>
        </div>
      </div>
    </button>
  );
}