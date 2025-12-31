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
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  Shield,
  Clock,
  Gem,
  Share2,
  Flag,
  X,
  Check,
  Crown,
  Loader2,
  Gift,
  Headphones,
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
        // Fetch profile using RPC (bypasses RLS via SECURITY DEFINER)
        const { data: profileData, error: profileError } = await supabase.rpc("get_public_profile_by_id", {
          profile_id: id,
        });

        if (profileError) throw profileError;

        if (profileData && profileData.length > 0) {
          // Use RPC data directly - RPC returns 'age' instead of date_of_birth
          const rpcProfile = profileData[0] as Record<string, unknown>;
          setProfile({
            id: rpcProfile.id as string,
            name: rpcProfile.name as string,
            date_of_birth: '', // RPC returns age instead
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
            is_featured: false, // RPC doesn't return this
            created_at: rpcProfile.created_at as string,
            verification_status: 'verified', // RPC only returns verified profiles
            leaderboard_enabled: (rpcProfile.leaderboard_enabled as boolean) ?? true,
            show_daily_leaderboard: (rpcProfile.show_daily_leaderboard as boolean) ?? true,
            _age: rpcProfile.age as number, // Store computed age from RPC
          } as ProfileData & { _age?: number });
        }

        // Fetch reviews - use simple query without foreign key hint
        const { data: reviewsData } = await supabase
          .from("ratings")
          .select("id, overall_rating, review_text, created_at, rater_id")
          .eq("rated_id", id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (reviewsData && reviewsData.length > 0) {
          // Fetch rater profiles separately
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-2 text-white">Profile Not Found</h1>
          <p className="text-white/50 mb-6">This profile doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/browse")} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90">Browse Profiles</Button>
        </div>
      </div>
    );
  }

  const photos = profile.profile_photos?.length > 0 ? profile.profile_photos : ["/placeholder.svg"];
  const age = (profile as ProfileData & { _age?: number })._age || (profile.date_of_birth ? calculateAge(profile.date_of_birth) : null);

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20 md:pb-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        <Header />

        <div className="container max-w-4xl py-6">
          {/* Back Button */}
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 text-white/70 hover:text-white hover:bg-white/5">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left Column - Photos */}
          <div className="md:col-span-2 space-y-4">
            {/* Main Photo */}
            <Dialog open={showGallery} onOpenChange={setShowGallery}>
              <DialogTrigger asChild>
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group">
                  <ProfileImage
                    src={photos[currentPhotoIndex]}
                    alt={profile.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Photo indicators */}
                  {photos.length > 1 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {photos.map((_, i) => (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPhotoIndex(i);
                          }}
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            i === currentPhotoIndex ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70",
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {/* Navigation arrows */}
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          prevPhoto();
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          nextPhoto();
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* Featured badge */}
                  {profile.is_featured && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                        <Crown className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    </div>
                  )}

                  {/* Photo count */}
                  <div className="absolute bottom-4 right-4 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs">
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

            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPhotoIndex(i)}
                    className={cn(
                      "w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all",
                      i === currentPhotoIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100",
                    )}
                  >
                    <ProfileImage src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Info */}
          <div className="md:col-span-3 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {profile.name}
                      {age && `, ${age}`}
                    </h1>
                    {profile.verification_status === "verified" && (
                      <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-white/50">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.location_city}, {profile.location_state}
                    </span>
                    {profile.height && (
                      <span className="flex items-center gap-1">
                        <Ruler className="w-4 h-4" />
                        {profile.height}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handleShare} className="border-white/10 text-white/70 hover:text-white hover:bg-white/5">
                    <Share2 className="w-4 h-4" />
                  </Button>
                  {!isOwnProfile && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSave(id!)}
                      className={cn("border-white/10 hover:bg-white/5", isSaved(id!) ? "text-amber-500" : "text-white/70 hover:text-white")}
                    >
                      <Bookmark className={cn("w-4 h-4", isSaved(id!) && "fill-current")} />
                    </Button>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex">{renderStars(profile.average_rating)}</div>
                <span className="font-semibold text-white">{profile.average_rating.toFixed(1)}</span>
                <span className="text-white/50">
                  ({profile.total_ratings} {profile.total_ratings === 1 ? "review" : "reviews"})
                </span>
              </div>
            </div>

            {/* Action Buttons - for seekers viewing earners */}
            {isSeeker && profile.user_type === "earner" && !isOwnProfile && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button onClick={handleMessage} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message
                    <Badge className="ml-2 bg-white/20 text-white border-0">
                      5 <Gem className="w-3 h-3 ml-0.5" />
                    </Badge>
                  </Button>
                  <Button
                    onClick={() => setShowVideoBooking(true)}
                    variant="outline"
                    className="flex-1 border-teal-500/50 text-teal-400 hover:bg-teal-500/10"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Video Date
                  </Button>
                </div>
                <Button
                  onClick={() => setShowGiftModal(true)}
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Send a Gift
                </Button>
              </div>
            )}

            {/* Earner viewing seeker - like button */}
            {myProfile?.user_type === "earner" && profile.user_type === "seeker" && !isOwnProfile && (
              <Button
                onClick={handleLikeToggle}
                variant={isLiked ? "default" : "outline"}
                className={cn("w-full", isLiked ? "bg-rose-500 hover:bg-rose-600 text-white" : "border-rose-500/50 text-rose-400 hover:bg-rose-500/10")}
              >
                <Heart className={cn("w-4 h-4 mr-2", isLiked && "fill-current")} />
                {isLiked ? "Liked" : "Like Profile"}
              </Button>
            )}

            {/* Pricing - only for earners */}
            {profile.user_type === "earner" && (
              <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-white">
                  <Gem className="w-4 h-4 text-amber-500" />
                  Rates
                </h3>
                <p className="text-xs text-white/40 mb-3">Audio and Video calls available • Camera optional</p>
                
                {/* Message rate */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center mb-3">
                  <MessageSquare className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs text-white/50">Message</p>
                  <p className="font-bold text-white">5 Credits</p>
                </div>
                
                {/* Call rates grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Video Rates Column */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1 text-xs text-white/60 mb-2">
                      <Video className="w-3 h-3" />
                      <span>Video</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                      <p className="text-xs text-white/50">15 min</p>
                      <p className="font-bold text-white text-sm">{profile.video_15min_rate} Credits</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                      <p className="text-xs text-white/50">30 min</p>
                      <p className="font-bold text-white text-sm">{profile.video_30min_rate} Credits</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                      <p className="text-xs text-white/50">60 min</p>
                      <p className="font-bold text-white text-sm">{profile.video_60min_rate} Credits</p>
                    </div>
                  </div>
                  
                  {/* Audio Rates Column */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1 text-xs text-white/60 mb-2">
                      <Headphones className="w-3 h-3" />
                      <span>Audio</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                      <p className="text-xs text-white/50">15 min</p>
                      <p className="font-bold text-white text-sm">{Math.round((profile.video_15min_rate || 0) * 0.7)} Credits</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                      <p className="text-xs text-white/50">30 min</p>
                      <p className="font-bold text-white text-sm">{Math.round((profile.video_30min_rate || 0) * 0.7)} Credits</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                      <p className="text-xs text-white/50">60 min</p>
                      <p className="font-bold text-white text-sm">{Math.round((profile.video_60min_rate || 0) * 0.7)} Credits</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Gifters Leaderboard - only for earners with leaderboard enabled */}
            {profile.user_type === "earner" && profile.leaderboard_enabled !== false && (
              <TopGiftersModule 
                creatorId={profile.id}
                creatorName={profile.name}
                showDaily={profile.show_daily_leaderboard !== false}
              />
            )}

            {/* Tabs */}
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="w-full bg-white/[0.02] border border-white/10">
                <TabsTrigger value="about" className="flex-1 data-[state=active]:bg-white/5 data-[state=active]:text-white text-white/50">
                  About
                </TabsTrigger>
                <TabsTrigger value="reviews" className="flex-1 data-[state=active]:bg-white/5 data-[state=active]:text-white text-white/50">
                  Reviews ({profile.total_ratings})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="space-y-6 mt-4">
                {/* Bio */}
                {profile.bio && (
                  <div>
                    <h3 className="font-semibold mb-2 text-white">About Me</h3>
                    <p className="text-white/60 leading-relaxed">{profile.bio}</p>
                  </div>
                )}

                {/* Interests */}
                {profile.interests && profile.interests.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-white">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest, i) => (
                        <Badge key={i} className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hobbies */}
                {profile.hobbies && profile.hobbies.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-white">Hobbies</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.hobbies.map((hobby, i) => (
                        <Badge key={i} className="bg-white/5 text-white/70 border-white/10">
                          {hobby}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Member since */}
                <div className="flex items-center gap-2 text-sm text-white/40 pt-4 border-t border-white/10">
                  <Calendar className="w-4 h-4" />
                  Member since {format(new Date(profile.created_at), "MMMM yyyy")}
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-4">
                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/50">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10 border border-white/10">
                            <AvatarImage src={review.rater?.profile_photos?.[0]} />
                            <AvatarFallback className="bg-white/5 text-white/70">{review.rater?.name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-white">{review.rater?.name || "Anonymous"}</span>
                              <span className="text-xs text-white/40">
                                {format(new Date(review.created_at), "MMM d, yyyy")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mb-2">{renderStars(review.rating)}</div>
                            {review.comment && <p className="text-sm text-white/60">{review.comment}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Report */}
            {!isOwnProfile && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
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
