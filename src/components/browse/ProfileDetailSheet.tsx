import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Star, MessageSquare, Video, Image, MapPin, Calendar, ChevronLeft, ChevronRight, Gem, Ban, Flag, MoreVertical } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import LowBalanceModal from '@/components/credits/LowBalanceModal';
import BuyCreditsModal from '@/components/credits/BuyCreditsModal';
import BlockUserModal from '@/components/safety/BlockUserModal';
import ReportUserModal from '@/components/safety/ReportUserModal';
import OnlineIndicator from '@/components/ui/OnlineIndicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Profile {
  id: string;
  name: string;
  date_of_birth: string;
  location_city: string;
  location_state: string;
  bio: string;
  profile_photos: string[];
  video_30min_rate: number;
  video_60min_rate: number;
  average_rating: number;
  total_ratings: number;
  created_at: string;
}

interface Rating {
  id: string;
  overall_rating: number;
  review_text: string | null;
  created_at: string;
  rater_name: string;
}

interface Props {
  profile: Profile | null;
  onClose: () => void;
}

export default function ProfileDetailSheet({ profile, onClose }: Props) {
  const navigate = useNavigate();
  const { profile: userProfile } = useAuth();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const MESSAGE_COST = 20;
  const isOnline = Math.random() > 0.5; // Simulated - would come from presence in production

  // Fetch reviews when profile changes
  useEffect(() => {
    if (!profile?.id) return;
    
    async function fetchReviews() {
      const { data } = await supabase
        .from('ratings')
        .select('id, overall_rating, review_text, created_at, rater_id')
        .eq('rated_id', profile!.id)
        .not('review_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data && data.length > 0) {
        // Fetch rater names
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
      } else {
        setReviews([]);
      }
    }

    fetchReviews();
  }, [profile?.id]);

  if (!profile) return null;

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
  const photos = profile.profile_photos || [];
  const memberSince = format(new Date(profile.created_at), 'MMMM yyyy');
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleSendMessage = () => {
    // Check if user has enough credits
    if ((userProfile?.credit_balance || 0) < MESSAGE_COST) {
      setShowLowBalance(true);
      return;
    }
    
    onClose();
    navigate(`/messages?to=${profile.id}`);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${star <= rating ? 'text-gold fill-gold' : 'text-muted-foreground'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <Sheet open={!!profile} onOpenChange={() => onClose()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-border p-0">
          {/* Photo Gallery */}
          <div className="relative aspect-[4/5] bg-card">
            <img
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
                
                {/* Photo indicators */}
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

          <div className="p-6 space-y-6">
            <SheetHeader className="text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="px-2 py-0.5 rounded-full bg-teal/20 text-teal text-xs">
                  ✓ Verified
                </div>
              </div>
              <SheetTitle className="text-2xl font-display">
                {profile.name || 'Anonymous'}{age ? `, ${age}` : ''}
              </SheetTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {profile.location_city}, {profile.location_state}
              </div>
            </SheetHeader>

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

            {/* Bio */}
            {profile.bio && (
              <div className="space-y-2">
                <h4 className="font-semibold">About</h4>
                <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Rates */}
            <div className="space-y-3">
              <h4 className="font-semibold">Rates</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <MessageSquare className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Text</p>
                  <p className="font-semibold">20 credits</p>
                  <p className="text-xs text-muted-foreground">$2.00</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <Image className="w-5 h-5 text-teal mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Image</p>
                  <p className="font-semibold">40 credits</p>
                  <p className="text-xs text-muted-foreground">$4.00</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <Video className="w-5 h-5 text-gold mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Video 30min</p>
                  <p className="font-semibold">{profile.video_30min_rate} credits</p>
                  <p className="text-xs text-muted-foreground">
                    ${(profile.video_30min_rate * 0.10).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
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

            {/* Send Message Button */}
            <Button 
              onClick={handleSendMessage}
              className="w-full bg-primary hover:bg-primary/90 glow-purple"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Message
              <span className="ml-2 flex items-center text-primary-foreground/80">
                <Gem className="w-3 h-3 mr-1" />
                20
              </span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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

      <BlockUserModal
        open={showBlockModal}
        onOpenChange={setShowBlockModal}
        userId={profile.id}
        userName={profile.name || 'User'}
        onBlocked={onClose}
      />

      <ReportUserModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        userId={profile.id}
        userName={profile.name || 'User'}
      />
    </>
  );
}
