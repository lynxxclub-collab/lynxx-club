import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/layout/MobileNav';
import LowBalanceModal from '@/components/credits/LowBalanceModal';
import BuyCreditsModal from '@/components/credits/BuyCreditsModal';
import BlockUserModal from '@/components/safety/BlockUserModal';
import ReportUserModal from '@/components/safety/ReportUserModal';
import SignupGateModal from '@/components/browse/SignupGateModal';
import OnlineIndicator from '@/components/ui/OnlineIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileImage } from '@/components/ui/ProfileImage';
import {
  Star,
  MessageSquare,
  Video,
  Image,
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
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  user_type?: 'seeker' | 'earner';
  height?: string;
  hobbies?: string[];
  interests?: string[];
}

interface Rating {
  id: string;
  overall_rating: number;
  review_text: string | null;
  created_at: string;
  rater_name: string;
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile: userProfile, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSignupGate, setShowSignupGate] = useState(false);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const MESSAGE_COST = 5;
  const isOnline = Math.random() > 0.5; // Simulated
  const isAuthenticated = !!user;
  const isEarnerViewing = userProfile?.user_type === 'earner';

  // Fetch profile using RPC function for public access
  useEffect(() => {
    if (!id) return;
    
    async function fetchProfile() {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_public_profile_by_id', { profile_id: id });
      
      if (data && data.length > 0) {
        setProfile(data[0] as Profile);
      }
      setLoading(false);
    }

    fetchProfile();
  }, [id]);

  // Fetch reviews
  useEffect(() => {
    if (!id) return;
    
    async function fetchReviews() {
      const { data } = await supabase
        .from('ratings')
        .select('id, overall_rating, review_text, created_at, rater_id')
        .eq('rated_id', id)
        .not('review_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data && data.length > 0) {
        const raterIds = data.map(r => r.rater_id);
        const { data: raters } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', raterIds);
        
        const raterMap = new Map(raters?.map(r => [r.id, r.name]) || []);
        
        setReviews(data.map(r => ({
          id: r.id,
          overall_rating: r.overall_rating,
          review_text: r.review_text,
          created_at: r.created_at,
          rater_name: raterMap.get(r.rater_id) || 'Anonymous'
        })));
      }
    }

    fetchReviews();
  }, [id]);

  // Check if liked
  useEffect(() => {
    if (!user?.id || !id) return;
    
    async function checkLiked() {
      const { data } = await supabase
        .from('profile_likes')
        .select('id')
        .eq('liker_id', user!.id)
        .eq('liked_id', id)
        .maybeSingle();
      
      setIsLiked(!!data);
    }

    checkLiked();
  }, [user?.id, id]);

  // Age is now returned directly from the database function
  const getAge = () => profile?.age;

  const handleSendMessage = () => {
    if (!isAuthenticated) {
      setShowSignupGate(true);
      return;
    }
    
    if ((userProfile?.credit_balance || 0) < MESSAGE_COST) {
      setShowLowBalance(true);
      return;
    }
    
    navigate(`/messages?to=${profile?.id}`);
  };

  const handleLikeToggle = async () => {
    if (!isAuthenticated) {
      setShowSignupGate(true);
      return;
    }
    
    if (!user?.id || !id) return;

    if (isLiked) {
      await supabase
        .from('profile_likes')
        .delete()
        .eq('liker_id', user.id)
        .eq('liked_id', id);
      setIsLiked(false);
    } else {
      await supabase
        .from('profile_likes')
        .insert({ liker_id: user.id, liked_id: id });
      setIsLiked(true);
    }
  };

  const nextPhoto = () => {
    if (!profile) return;
    setCurrentPhotoIndex((prev) => (prev + 1) % profile.profile_photos.length);
  };

  const prevPhoto = () => {
    if (!profile) return;
    setCurrentPhotoIndex((prev) => (prev - 1 + profile.profile_photos.length) % profile.profile_photos.length);
  };

  const renderStars = (rating: number) => (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3 h-3 ${star <= rating ? 'text-gold fill-gold' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  );

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <div className="container max-w-2xl py-6">
          <Skeleton className="w-full aspect-[4/5] rounded-xl mb-6" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-6" />
          <Skeleton className="h-20 w-full" />
        </div>
        <MobileNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground mb-6">This profile doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/browse')}>Back to Browse</Button>
        </div>
        <MobileNav />
      </div>
    );
  }

  const age = profile.age;
  const photos = profile.profile_photos || [];
  const memberSince = format(new Date(profile.created_at), 'MMMM yyyy');
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <div className="container max-w-2xl py-6">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Photo Gallery */}
        <div className="relative aspect-[4/5] bg-card rounded-xl overflow-hidden mb-6">
          <ProfileImage
            src={photos[currentPhotoIndex] || '/placeholder.svg'}
            alt={profile.name || 'Profile'}
            className="w-full h-full object-cover"
          />
          
          {/* Online indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
            <OnlineIndicator online={isOnline} size="sm" />
            <span className="text-xs font-medium">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          
          {/* Actions dropdown */}
          {isAuthenticated && (
            <div className="absolute top-4 right-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowReportModal(true)} className="text-destructive">
                    <Flag className="w-4 h-4 mr-2" />
                    Report User
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowBlockModal(true)} className="text-destructive">
                    <Ban className="w-4 h-4 mr-2" />
                    Block User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          
          {photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                {photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentPhotoIndex ? 'bg-primary' : 'bg-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Profile Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-0.5 rounded-full bg-teal/20 text-teal text-xs">
                ✓ Verified
              </div>
            </div>
            <h1 className="text-2xl font-display font-bold">
              {profile.name || 'Anonymous'}{age ? `, ${age}` : ''}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4" />
              {profile.location_city}, {profile.location_state}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-gold fill-gold" />
              <span className="font-medium">{profile.average_rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({profile.total_ratings} reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Member since {memberSince}
            </div>
          </div>

          {/* Height */}
          {profile.height && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Ruler className="w-4 h-4" />
              {profile.height}
            </div>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Interests
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, index) => (
                  <span key={index} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hobbies */}
          {profile.hobbies && profile.hobbies.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Hobbies
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.hobbies.map((hobby, index) => (
                  <span key={index} className="px-3 py-1 rounded-full bg-teal/10 text-teal text-sm">
                    {hobby}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="space-y-2">
              <h4 className="font-semibold">About</h4>
              <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Rates - only show when seeker is viewing earner */}
          {!isEarnerViewing && profile.user_type === 'earner' && (
            <div className="space-y-3">
              <h4 className="font-semibold">Rates</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <MessageSquare className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Text</p>
                  <p className="font-semibold">5 credits</p>
                  <p className="text-xs text-muted-foreground">$0.50</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <Image className="w-5 h-5 text-teal mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Image</p>
                  <p className="font-semibold">10 credits</p>
                  <p className="text-xs text-muted-foreground">$1.00</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {profile.video_15min_rate && (
                  <div className="p-3 rounded-lg bg-card border border-border text-center">
                    <Video className="w-5 h-5 text-gold mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Video 15min</p>
                    <p className="font-semibold">{profile.video_15min_rate} credits</p>
                    <p className="text-xs text-muted-foreground">
                      ${(profile.video_15min_rate * 0.10).toFixed(2)}
                    </p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <Video className="w-5 h-5 text-gold mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Video 30min</p>
                  <p className="font-semibold">{profile.video_30min_rate} credits</p>
                  <p className="text-xs text-muted-foreground">
                    ${(profile.video_30min_rate * 0.10).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <Video className="w-5 h-5 text-gold mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Video 60min</p>
                  <p className="font-semibold">{profile.video_60min_rate} credits</p>
                  <p className="text-xs text-muted-foreground">
                    ${(profile.video_60min_rate * 0.10).toFixed(2)}
                  </p>
                </div>
                {profile.video_90min_rate && (
                  <div className="p-3 rounded-lg bg-card border border-border text-center">
                    <Video className="w-5 h-5 text-gold mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Video 90min</p>
                    <p className="font-semibold">{profile.video_90min_rate} credits</p>
                    <p className="text-xs text-muted-foreground">
                      ${(profile.video_90min_rate * 0.10).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold">Reviews ({profile.total_ratings})</h4>
              <div className="space-y-3">
                {displayedReviews.map((review) => (
                  <div key={review.id} className="p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {renderStars(review.overall_rating)}
                        <span className="text-sm font-medium">{review.rater_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.review_text}</p>
                  </div>
                ))}
              </div>
              {reviews.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="w-full text-primary"
                >
                  {showAllReviews ? 'Show Less' : `See All ${profile.total_ratings} Reviews`}
                </Button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {isEarnerViewing ? (
              <Button 
                onClick={handleLikeToggle}
                variant={isLiked ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  isLiked && "bg-rose-500 hover:bg-rose-600 text-white"
                )}
              >
                <Heart className={cn("w-4 h-4 mr-2", isLiked && "fill-current")} />
                {isLiked ? 'Liked' : 'Like This Profile'}
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleLikeToggle}
                  variant="outline"
                  className={cn(
                    isLiked && "border-rose-500 text-rose-500"
                  )}
                >
                  <Heart className={cn("w-4 h-4", isLiked && "fill-rose-500")} />
                </Button>
                <Button 
                  onClick={handleSendMessage}
                  className="flex-1 bg-primary hover:bg-primary/90 glow-purple"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                  <span className="ml-2 flex items-center text-primary-foreground/80">
                    <Gem className="w-3 h-3 mr-1" />
                    5
                  </span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <LowBalanceModal
        open={showLowBalance}
        onOpenChange={setShowLowBalance}
        currentBalance={userProfile?.credit_balance || 0}
        requiredCredits={MESSAGE_COST}
        onBuyCredits={() => {
          setShowLowBalance(false);
          setShowBuyCredits(true);
        }}
      />
      
      <BuyCreditsModal
        open={showBuyCredits}
        onOpenChange={setShowBuyCredits}
      />

      {profile && (
        <>
          <BlockUserModal
            open={showBlockModal}
            onOpenChange={setShowBlockModal}
            userId={profile.id}
            userName={profile.name || 'User'}
          />
          
          <ReportUserModal
            open={showReportModal}
            onOpenChange={setShowReportModal}
            userId={profile.id}
            userName={profile.name || 'User'}
          />
        </>
      )}

      <SignupGateModal open={showSignupGate} onClose={() => setShowSignupGate(false)} />

      <Footer />
      <MobileNav />
    </div>
  );
}
