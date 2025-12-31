import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
  // New fields
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

// Section component for consistent styling
const ProfileSection = ({ 
  icon: Icon, 
  title, 
  children, 
  className = "",
  accentColor = "amber"
}: { 
  icon: React.ElementType; 
  title: string; 
  children: React.ReactNode;
  className?: string;
  accentColor?: "amber" | "rose" | "purple" | "teal";
}) => {
  const colorMap = {
    amber: "text-amber-500",
    rose: "text-rose-500",
    purple: "text-purple-400",
    teal: "text-teal-400"
  };

  return (
    <div className={cn("glass-card p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <div className={cn("p-2 rounded-lg bg-white/5", colorMap[accentColor])}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
};

// Info row component
const InfoRow = ({ 
  icon: Icon, 
  label, 
  value,
  accentColor = "amber"
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | undefined;
  accentColor?: "amber" | "rose" | "purple" | "teal";
}) => {
  if (!value) return null;
  
  const colorMap = {
    amber: "text-amber-500",
    rose: "text-rose-500",
    purple: "text-purple-400",
    teal: "text-teal-400"
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className={cn("w-4 h-4 flex-shrink-0", colorMap[accentColor])} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/40">{label}</p>
        <p className="text-white/80 truncate">{value}</p>
      </div>
    </div>
  );
};

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile: myProfile } = useAuth();
  const { wallet } = useWallet();
  const { isSaved, toggleSave } = useSavedProfiles();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showVideoBooking, setShowVideoBooking] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftAnimation, setGiftAnimation] = useState<{emoji: string; type: 'standard' | 'premium' | 'ultra'} | null>(null);
  const [isLiked, setIsLiked] = useState(false);

  const isSeeker = myProfile?.user_type === "seeker";
  const isOwnProfile = user?.id === id;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;

      try {
        const { data: profileData, error: profileError } = await supabase.rpc("get_public_profile_by_id", {
          profile_id: id,
        });

        if (profileError) throw profileError;

        if (profileData && profileData.length > 0) {
          const rpcProfile = profileData[0] as Record<string, unknown>;
          setProfile({
            id: rpcProfile.id as string,
            name: rpcProfile.name as string,
            date_of_birth: '',
            gender: rpcProfile.gender as string,
            location_city: rpcProfile.location_city as string,
            location_state: rpcProfile.location_state as string,
            bio: rpcProfile.bio as string,
            profile_photos: rpcProfile.profile_photos as string[],
            user_type: rpcProfile.user_type as "seeker" | "earner",
            video_15min_rate: rpcProfile.video_15min_rate as number,
            video_30min_rate: rpcProfile.video_30min_rate as number,
            video_60min_rate: rpcProfile.video_60min_rate as number,
            video_90min_rate: rpcProfile.video_90min_rate as number,
            average_rating: rpcProfile.average_rating as number,
            total_ratings: rpcProfile.total_ratings as number,
            height: rpcProfile.height as string,
            hobbies: rpcProfile.hobbies as string[],
            interests: rpcProfile.interests as string[],
            is_featured: false,
            created_at: rpcProfile.created_at as string,
            verification_status: 'verified',
            leaderboard_enabled: (rpcProfile.leaderboard_enabled as boolean) ?? true,
            show_daily_leaderboard: (rpcProfile.show_daily_leaderboard as boolean) ?? true,
            personality_traits: rpcProfile.personality_traits as string[],
            relationship_status: rpcProfile.relationship_status as string,
            languages: rpcProfile.languages as string[],
            education: rpcProfile.education as string,
            occupation: rpcProfile.occupation as string,
            favorite_food: rpcProfile.favorite_food as string,
            favorite_music: rpcProfile.favorite_music as string,
            favorite_movies: rpcProfile.favorite_movies as string,
            looking_for: rpcProfile.looking_for as string,
            fun_facts: rpcProfile.fun_facts as string[],
            smoking: rpcProfile.smoking as string,
            drinking: rpcProfile.drinking as string,
            fitness_level: rpcProfile.fitness_level as string,
            values_beliefs: rpcProfile.values_beliefs as string,
            _age: rpcProfile.age as number,
          });
        }

        // Fetch reviews
        const { data: reviewsData } = await supabase
          .from("ratings")
          .select("id, overall_rating, review_text, created_at, rater_id")
          .eq("rated_id", id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (reviewsData && reviewsData.length > 0) {
          const raterIds = reviewsData.map(r => r.rater_id);
          const { data: raterProfiles } = await supabase
            .from("profiles")
            .select("id, name, profile_photos")
            .in("id", raterIds);

          const raterMap = new Map(raterProfiles?.map(p => [p.id, p]) || []);
          
          const formattedReviews = reviewsData.map(r => ({
            id: r.id,
            rating: r.overall_rating,
            comment: r.review_text,
            created_at: r.created_at,
            rater: raterMap.get(r.rater_id) || { name: "Anonymous", profile_photos: [] }
          }));
          
          setReviews(formattedReviews as Review[]);
        }

        // Check if liked
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

  const handleMessage = () => {
    if (!user) {
      navigate("/auth?mode=signup");
      return;
    }
    navigate(`/messages?to=${id}`);
  };

  const handleLikeToggle = async () => {
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
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `${profile?.name} on Lynxx Club`,
        url: window.location.href,
      });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const nextPhoto = () => {
    if (profile?.profile_photos) {
      setCurrentPhotoIndex((prev) => (prev === profile.profile_photos.length - 1 ? 0 : prev + 1));
    }
  };

  const prevPhoto = () => {
    if (profile?.profile_photos) {
      setCurrentPhotoIndex((prev) => (prev === 0 ? profile.profile_photos.length - 1 : prev - 1));
    }
  };

  const calculateAge = (dob: string) => {
    return differenceInYears(new Date(), new Date(dob));
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn("w-4 h-4", i < Math.floor(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")}
      />
    ));
  };

  const getLocationString = () => {
    if (profile?.location_city && profile?.location_state) {
      return `${profile.location_city}, ${profile.location_state}`;
    }
    return profile?.location_state || "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-2 text-foreground">Profile Not Found</h1>
          <p className="text-muted-foreground mb-6">This profile doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/browse")} className="btn-gradient-primary px-6 py-2">Browse Profiles</Button>
        </div>
      </div>
    );
  }

  const photos = profile.profile_photos?.length > 0 ? profile.profile_photos : ["/placeholder.svg"];
  const age = profile._age || (profile.date_of_birth ? calculateAge(profile.date_of_birth) : null);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        <Header />

        <div className="container max-w-6xl px-3 sm:px-4 py-3 sm:py-6">
          {/* Back Button */}
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 sm:mb-4 text-muted-foreground hover:text-foreground hover:bg-secondary/50 -ml-2 sm:ml-0">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {/* Hero Section - Mobile First */}
          <div className="glass-card p-3 sm:p-6 mb-4 sm:mb-6">
            {/* Stack on mobile, grid on desktop */}
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Photo Gallery - Full width on mobile */}
              <div className="lg:col-span-1">
                <Dialog open={showGallery} onOpenChange={setShowGallery}>
                  <DialogTrigger asChild>
                    <div className="relative aspect-[4/5] sm:aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer group">
                      <ProfileImage
                        src={photos[currentPhotoIndex]}
                        alt={profile.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Photo indicators */}
                      {photos.length > 1 && (
                        <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-1.5">
                          {photos.map((_, i) => (
                            <button
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentPhotoIndex(i);
                              }}
                              className={cn(
                                "h-1 sm:h-1.5 rounded-full transition-all",
                                i === currentPhotoIndex ? "w-4 sm:w-6 bg-white" : "w-1 sm:w-1.5 bg-white/50 hover:bg-white/70",
                              )}
                            />
                          ))}
                        </div>
                      )}

                      {/* Navigation arrows - larger touch targets on mobile */}
                      {photos.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              prevPhoto();
                            }}
                            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              nextPhoto();
                            }}
                            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                          </button>
                        </>
                      )}

                      {/* Featured badge */}
                      {profile.is_featured && (
                        <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs">
                            <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                      )}

                      {/* Photo count */}
                      <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] sm:text-xs">
                        {currentPhotoIndex + 1} / {photos.length}
                      </div>
                    </div>
                  </DialogTrigger>

                  {/* Full screen gallery */}
                  <DialogContent className="max-w-4xl p-0 bg-black/95">
                    <div className="relative aspect-[3/4] md:aspect-video">
                      <ProfileImage src={photos[currentPhotoIndex]} alt={profile.name} className="w-full h-full object-contain" />
                      <button
                        onClick={() => setShowGallery(false)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      {photos.length > 1 && (
                        <>
                          <button
                            onClick={prevPhoto}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </button>
                          <button
                            onClick={nextPhoto}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </button>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Thumbnail strip - horizontal scroll on mobile */}
                {photos.length > 1 && (
                  <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-2 mt-2 sm:mt-3 scrollbar-hide">
                    {photos.map((photo, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPhotoIndex(i)}
                        className={cn(
                          "w-10 h-10 sm:w-14 sm:h-14 rounded-md sm:rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all",
                          i === currentPhotoIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100",
                        )}
                      >
                        <ProfileImage src={photo} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground font-display">
                        {profile.name}
                        {age && <span className="text-muted-foreground">, {age}</span>}
                      </h1>
                      {profile.verification_status === "verified" && (
                        <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20 text-xs">
                          <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    
                    {/* Quick info - stack on mobile */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                      {getLocationString() && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
                          {getLocationString()}
                        </span>
                      )}
                      {profile.height && (
                        <span className="flex items-center gap-1">
                          <Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                          {profile.height}
                        </span>
                      )}
                      {profile.occupation && (
                        <span className="flex items-center gap-1 hidden sm:flex">
                          <Briefcase className="w-4 h-4 text-amber-500" />
                          {profile.occupation}
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mt-2 sm:mt-3">
                      <div className="flex">{renderStars(profile.average_rating)}</div>
                      <span className="font-semibold text-foreground text-sm sm:text-base">{profile.average_rating.toFixed(1)}</span>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        ({profile.total_ratings} {profile.total_ratings === 1 ? "review" : "reviews"})
                      </span>
                    </div>
                  </div>

                  {/* Action buttons - smaller on mobile */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button variant="outline" size="icon" onClick={handleShare} className="h-8 w-8 sm:h-10 sm:w-10 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                      <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                    {!isOwnProfile && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleSave(id!)}
                        className={cn("h-8 w-8 sm:h-10 sm:w-10 border-border/50 hover:bg-secondary/50", isSaved(id!) ? "text-amber-500" : "text-muted-foreground hover:text-foreground")}
                      >
                        <Bookmark className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isSaved(id!) && "fill-current")} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">{profile.bio}</p>
                  </div>
                )}

                {/* Action Buttons - for seekers viewing earners - Stack on mobile */}
                {isSeeker && profile.user_type === "earner" && !isOwnProfile && (
                  <div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Button onClick={handleMessage} className="flex-1 btn-gradient-primary py-4 sm:py-5 text-sm sm:text-base">
                        <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                        Message
                        <Badge className="ml-2 bg-white/20 text-white border-0 text-xs">
                          5 <Gem className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-0.5" />
                        </Badge>
                      </Button>
                      <Button
                        onClick={() => setShowVideoBooking(true)}
                        variant="outline"
                        className="flex-1 border-teal-500/50 text-teal-400 hover:bg-teal-500/10 py-4 sm:py-5 text-sm sm:text-base"
                      >
                        <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                        <span className="text-white/30 mx-0.5">/</span>
                        <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                        Book Call
                      </Button>
                    </div>
                    <p className="text-center text-[10px] sm:text-xs text-muted-foreground">
                      Audio or Video • Camera optional • Credits only used while connected
                    </p>
                    <Button
                      onClick={() => setShowGiftModal(true)}
                      variant="outline"
                      className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10 py-4 sm:py-5 text-sm sm:text-base"
                    >
                      <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                      Send a Gift
                    </Button>
                  </div>
                )}

                {/* Earner viewing seeker - like button */}
                {myProfile?.user_type === "earner" && profile.user_type === "seeker" && !isOwnProfile && (
                  <Button
                    onClick={handleLikeToggle}
                    variant={isLiked ? "default" : "outline"}
                    className={cn("w-full py-4 sm:py-5 text-sm sm:text-base", isLiked ? "btn-gradient-rose" : "border-rose-500/50 text-rose-400 hover:bg-rose-500/10")}
                  >
                    <Heart className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2", isLiked && "fill-current")} />
                    {isLiked ? "Liked" : "Like Profile"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Grid - Stack on mobile, 3 cols on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column */}
            <div className="space-y-4 sm:space-y-6">
              {/* Rates - only for earners */}
              {profile.user_type === "earner" && (
                <ProfileSection icon={Gem} title="Rates" accentColor="amber">
                  <p className="text-xs text-muted-foreground mb-4">Audio and Video calls available • Camera optional</p>
                  
                  {/* Message rate */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center mb-4">
                    <MessageSquare className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Message</p>
                    <p className="font-bold text-foreground">5 Credits</p>
                  </div>
                  
                  {/* Call rates grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Video Rates Column */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-2">
                        <Video className="w-3 h-3" />
                        <span>Video</span>
                      </div>
                      {[15, 30, 60].map((min) => (
                        <div key={min} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                          <p className="text-xs text-muted-foreground">{min} min</p>
                          <p className="font-bold text-foreground text-sm">
                            {profile[`video_${min}min_rate` as keyof ProfileData] as number} Credits
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Audio Rates Column */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-2">
                        <Headphones className="w-3 h-3" />
                        <span>Audio</span>
                      </div>
                      {[15, 30, 60].map((min) => (
                        <div key={min} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                          <p className="text-xs text-muted-foreground">{min} min</p>
                          <p className="font-bold text-foreground text-sm">
                            {Math.round(((profile[`video_${min}min_rate` as keyof ProfileData] as number) || 0) * 0.7)} Credits
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </ProfileSection>
              )}

              {/* Basic Info */}
              <ProfileSection icon={Users} title="Basic Info" accentColor="rose">
                <div className="divide-y divide-white/5">
                  <InfoRow icon={HeartHandshake} label="Relationship Status" value={profile.relationship_status} accentColor="rose" />
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

              {/* Top Gifters Leaderboard - only for earners with leaderboard enabled */}
              {profile.user_type === "earner" && profile.leaderboard_enabled !== false && (
                <TopGiftersModule 
                  creatorId={profile.id}
                  creatorName={profile.name}
                  showDaily={profile.show_daily_leaderboard !== false}
                />
              )}
            </div>

            {/* Middle Column */}
            <div className="space-y-4 sm:space-y-6">
              {/* Looking For */}
              {profile.looking_for && (
                <ProfileSection icon={Search} title="Looking For" accentColor="rose">
                  <p className="text-foreground/80 leading-relaxed">{profile.looking_for}</p>
                </ProfileSection>
              )}

              {/* Interests */}
              {profile.interests && profile.interests.length > 0 && (
                <ProfileSection icon={Heart} title="Interests" accentColor="purple">
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, i) => (
                      <Badge key={i} className="bg-purple-500/10 text-purple-400 border-purple-500/20 px-3 py-1">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </ProfileSection>
              )}

              {/* Hobbies */}
              {profile.hobbies && profile.hobbies.length > 0 && (
                <ProfileSection icon={Sparkles} title="Hobbies" accentColor="amber">
                  <div className="flex flex-wrap gap-2">
                    {profile.hobbies.map((hobby, i) => (
                      <Badge key={i} className="bg-amber-500/10 text-amber-400 border-amber-500/20 px-3 py-1">
                        {hobby}
                      </Badge>
                    ))}
                  </div>
                </ProfileSection>
              )}

              {/* Personality Traits */}
              {profile.personality_traits && profile.personality_traits.length > 0 && (
                <ProfileSection icon={Users} title="Personality" accentColor="teal">
                  <div className="flex flex-wrap gap-2">
                    {profile.personality_traits.map((trait, i) => (
                      <Badge key={i} className="bg-teal-500/10 text-teal-400 border-teal-500/20 px-3 py-1">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </ProfileSection>
              )}

              {/* Values & Beliefs */}
              {profile.values_beliefs && (
                <ProfileSection icon={Compass} title="Values & Beliefs" accentColor="purple">
                  <p className="text-foreground/80 leading-relaxed">{profile.values_beliefs}</p>
                </ProfileSection>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4 sm:space-y-6 md:col-span-2 lg:col-span-1">
              {/* Favorites */}
              {(profile.favorite_food || profile.favorite_music || profile.favorite_movies) && (
                <ProfileSection icon={Heart} title="Favorites" accentColor="rose">
                  <div className="divide-y divide-white/5">
                    <InfoRow icon={Utensils} label="Favorite Food" value={profile.favorite_food} accentColor="amber" />
                    <InfoRow icon={Music} label="Favorite Music" value={profile.favorite_music} accentColor="purple" />
                    <InfoRow icon={Film} label="Favorite Movies" value={profile.favorite_movies} accentColor="rose" />
                  </div>
                </ProfileSection>
              )}

              {/* Fun Facts */}
              {profile.fun_facts && profile.fun_facts.length > 0 && (
                <ProfileSection icon={Lightbulb} title="Fun Facts About Me" accentColor="amber">
                  <ul className="space-y-2">
                    {profile.fun_facts.map((fact, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground/80">
                        <span className="text-amber-500 mt-1">•</span>
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
                    <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.slice(0, 3).map((review) => (
                      <div key={review.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-9 h-9 border border-white/10">
                            <AvatarImage src={review.rater?.profile_photos?.[0]} />
                            <AvatarFallback className="bg-secondary text-muted-foreground text-xs">{review.rater?.name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-foreground text-sm truncate">{review.rater?.name || "Anonymous"}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {format(new Date(review.created_at), "MMM d")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mb-1">{renderStars(review.rating)}</div>
                            {review.comment && <p className="text-xs text-foreground/60 line-clamp-2">{review.comment}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ProfileSection>

              {/* Member since */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
                <Calendar className="w-4 h-4" />
                Member since {format(new Date(profile.created_at), "MMMM yyyy")}
              </div>

              {/* Report */}
              {!isOwnProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => navigate(`/report?user=${id}`)}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Report Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

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

      {/* Rank Up Nudge - only for seekers viewing earners */}
      {isSeeker && profile.user_type === "earner" && !isOwnProfile && (
        <RankUpNudge creatorId={profile.id} creatorName={profile.name} />
      )}

      <Footer />
      <MobileNav />
    </div>
  );
}
