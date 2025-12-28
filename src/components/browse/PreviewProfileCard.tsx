import { MapPin, Lock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { PreviewProfile } from "@/hooks/useBrowseProfiles";
import { useSignupGate } from "@/contexts/SignupGateContext";

interface Props {
  profile: PreviewProfile;
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

export default function PreviewProfileCard({ profile }: Props) {
  const { requireAuth } = useSignupGate();

  const handleClick = () => {
    // This will show the signup modal with "profile" context
    requireAuth("profile");
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group relative aspect-[3/4] rounded-xl overflow-hidden bg-card border border-border",
        "hover:border-primary/50 transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        "text-left",
      )}
    >
      {/* Profile photo or placeholder */}
      {profile.profile_photo ? (
        <img
          src={getPublicPhotoUrl(profile.profile_photo) || undefined}
          alt={profile.first_name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/30 to-muted flex items-center justify-center">
          <User className="w-20 h-20 text-muted-foreground/30" />
        </div>
      )}

      {/* Blur overlay with lock icon */}
      <div className="absolute inset-0 backdrop-blur-sm bg-background/40 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <span className="text-sm font-medium text-foreground text-center px-4">Sign up to see full profile</span>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent opacity-90" />

      {/* Featured badge */}
      {profile.is_featured && (
        <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-gold/20 text-gold text-xs backdrop-blur-sm">
          ★ Featured
        </div>
      )}

      {/* Content - limited info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        {/* Verified badge */}
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal/20 text-teal text-xs backdrop-blur-sm">
          <span>✓</span> Verified
        </div>

        {/* First name only */}
        <h3 className="text-lg font-semibold text-foreground">{profile.first_name}</h3>

        {/* City only (no state) */}
        {profile.location_city && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>{profile.location_city}</span>
          </div>
        )}

        {/* User type badge */}
        <div
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
            profile.user_type === "earner" ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground",
          )}
        >
          {profile.user_type === "earner" ? "Earner" : "Seeker"}
        </div>

        {/* Sign up prompt */}
        <p className="text-xs text-muted-foreground pt-2">Sign up to see more details</p>
      </div>
    </button>
  );
}
