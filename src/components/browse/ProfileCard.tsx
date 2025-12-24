import { Star, MessageSquare, Video, Heart } from 'lucide-react';
import OnlineIndicator from '@/components/ui/OnlineIndicator';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  name: string;
  date_of_birth: string;
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
  user_type?: 'seeker' | 'earner';
}

interface Props {
  profile: Profile;
  onClick: () => void;
  showLikeButton?: boolean;
  isLiked?: boolean;
  onLikeToggle?: () => void;
}

export default function ProfileCard({ profile, onClick, showLikeButton, isLiked, onLikeToggle }: Props) {
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(profile.date_of_birth);
  const mainPhoto = profile.profile_photos?.[0] || '/placeholder.svg';
  // Simulate online status (in production, this would come from presence)
  const isOnline = Math.random() > 0.5;
  const isSeeker = profile.user_type === 'seeker';

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLikeToggle?.();
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative aspect-[3/4] rounded-xl overflow-hidden bg-card border border-border",
        "hover:border-primary/50 transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        "text-left"
      )}
    >
      {/* Photo */}
      <img
        src={mainPhoto}
        alt={profile.name || 'Profile'}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
      
      {/* Online indicator */}
      <div className="absolute top-3 right-3">
        <OnlineIndicator online={isOnline} size="md" />
      </div>

      {/* Like button for earners viewing seekers */}
      {showLikeButton && (
        <button
          onClick={handleLikeClick}
          className={cn(
            "absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
            isLiked 
              ? "bg-rose-500 text-white scale-110" 
              : "bg-background/80 backdrop-blur text-muted-foreground hover:text-rose-500 hover:bg-background"
          )}
        >
          <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
        </button>
      )}
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 transform transition-transform duration-300 group-hover:translate-y-[-4px]">
        {/* Verified badge */}
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal/20 text-teal text-xs backdrop-blur-sm">
          <span>✓</span> Verified
        </div>
        
        {/* Name & Age */}
        <h3 className="text-lg font-semibold text-foreground">
          {profile.name || 'Anonymous'}{age ? `, ${age}` : ''}
        </h3>
        
        {/* Location */}
        <p className="text-sm text-muted-foreground">
          {profile.location_city}, {profile.location_state}
        </p>
        
        {/* Rating */}
        <div className="flex items-center gap-1 text-sm">
          <Star className="w-4 h-4 text-gold fill-gold" />
          <span className="text-foreground">{profile.average_rating.toFixed(1)}</span>
          <span className="text-muted-foreground">({profile.total_ratings})</span>
        </div>
        
        {/* Bio preview */}
        {profile.bio && (
          <p className="text-xs text-muted-foreground line-clamp-1 opacity-80">
            "{profile.bio}"
          </p>
        )}
        
        {/* Pricing - only show for earners (when seekers are viewing) */}
        {!isSeeker && (
          <div className="flex flex-col gap-1.5 pt-2">
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <MessageSquare className="w-3 h-3" />
              <span>20 credits/msg</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-teal font-medium">
              <Video className="w-3 h-3" />
              <span>
                From {profile.video_15min_rate || profile.video_30min_rate} credits
              </span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
