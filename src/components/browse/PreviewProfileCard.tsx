import { MapPin, Lock, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PreviewProfile } from "@/hooks/useBrowseProfiles";

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
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative aspect-[3/4] rounded-2xl overflow-hidden",
        "bg-white/[0.02] border border-white/10",
        "hover:border-rose-500/30 transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-xl hover:shadow-rose-500/10",
        "focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]",
        "text-left",
      )}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Profile photo or placeholder */}
      {profile.profile_photo ? (
        <img
          src={getPublicPhotoUrl(profile.profile_photo) || undefined}
          alt={profile.first_name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-rose-500/10 to-[#0a0a0f] flex items-center justify-center">
          <User className="w-20 h-20 text-white/10" />
        </div>
      )}

      {/* Blur overlay with lock icon - shows on hover */}
      <div className="absolute inset-0 backdrop-blur-md bg-[#0a0a0f]/60 flex flex-col items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-rose-400" />
        </div>
        <span className="text-sm font-medium text-white text-center px-4">Sign up to see full profile</span>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/50 to-transparent opacity-90" />

      {/* Featured badge */}
      {profile.is_featured && (
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-amber-500/30 backdrop-blur-sm">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-amber-300 text-xs font-medium">Featured</span>
        </div>
      )}

      {/* Content - limited info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        {/* Verified badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/30 backdrop-blur-sm">
          <span className="text-green-400 text-xs">✓</span>
          <span className="text-green-300 text-xs font-medium">Verified</span>
        </div>

        {/* First name only */}
        <h3 className="text-lg font-semibold text-white">{profile.first_name}</h3>

        {/* City only (no state) */}
        {profile.location_city && (
          <div className="flex items-center gap-1.5 text-sm text-white/50">
            <MapPin className="w-3.5 h-3.5" />
            <span>{profile.location_city}</span>
          </div>
        )}

        {/* User type badge */}
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-sm",
            profile.user_type === "earner"
              ? "bg-rose-500/20 border-amber-500/30 text-amber-300"
              : "bg-purple-500/20 border-purple-500/30 text-purple-300",
          )}
        >
          {profile.user_type === "earner" ? "Earner" : "Seeker"}
        </div>

        {/* Sign up prompt */}
        <p className="text-xs text-white/30 pt-1">Sign up to see more details</p>
      </div>
    </button>
  );
}
