import { Star, MessageSquare, Video } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  date_of_birth: string;
  location_city: string;
  location_state: string;
  bio: string;
  profile_photos: string[];
  video_30min_rate: number;
  average_rating: number;
  total_ratings: number;
}

interface Props {
  profile: Profile;
  onClick: () => void;
}

export default function ProfileCard({ profile, onClick }: Props) {
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

  return (
    <button
      onClick={onClick}
      className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all hover:scale-[1.02] hover:shadow-lg text-left"
    >
      {/* Photo */}
      <img
        src={mainPhoto}
        alt={profile.name || 'Profile'}
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        {/* Verified badge */}
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal/20 text-teal text-xs">
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
          <p className="text-xs text-muted-foreground line-clamp-1">
            "{profile.bio}"
          </p>
        )}
        
        {/* Pricing */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex items-center gap-1 text-xs text-primary">
            <MessageSquare className="w-3 h-3" />
            <span>20 credits</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-teal">
            <Video className="w-3 h-3" />
            <span>{profile.video_30min_rate} credits</span>
          </div>
        </div>
      </div>
    </button>
  );
}
