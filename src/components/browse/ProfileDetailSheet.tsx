import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Phone,
  X,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import LowBalanceModal from '@/components/credits/LowBalanceModal';
import BuyCreditsModal from '@/components/credits/BuyCreditsModal';
import BlockUserModal from '@/components/safety/BlockUserModal';
import ReportUserModal from '@/components/safety/ReportUserModal';
import OnlineIndicator from '@/components/ui/OnlineIndicator';
import { cn } from '@/lib/utils';
import { deriveAudioRate } from '@/lib/pricing';
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
  is_online?: boolean; // Real-time property
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
  isEarnerViewing?: boolean;
  isLiked?: boolean;
  onLikeToggle?: () => void;
}

export default function ProfileDetailSheet({
  profile,
  onClose,
  isEarnerViewing,
  isLiked,
  onLikeToggle,
}: Props) {
  const navigate = useNavigate();
  const { profile: userProfile } = useAuth();
  const { wallet } = useWallet();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const MESSAGE_COST = 5;

  // Fetch reviews
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
        const raterIds = data.map((r) => r.rater_id);
        const { data: raters } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', raterIds);

        const raterMap = new Map(raters?.map((r) => [r.id, r.name]) || []);
        setReviews(
          data.map((r) => ({
            id: r.id,
            overall_rating: r.overall_rating,
            review_text: r.review_text,
            created_at: r.created_at,
            rater_name: raterMap.get(r.rater_id) || 'Anonymous',
          }))
        );
      } else {
        setReviews([]);
      }
    }
    fetchReviews();
  }, [profile?.id]);

  if (!profile) return null;

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
    if ((wallet?.credit_balance || 0) < MESSAGE_COST) {
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
            className={cn("w-3 h-3", star <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground')}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <Sheet open={!!profile} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto p-0 flex flex-col bg-[#0a0a0f] border-white/10">
          
          {/* Sticky Photo Header */}
          <div className="sticky top-0 z-20 w-full aspect-[4/5] bg-card relative shrink-0">
            <img
              src={photos[currentPhotoIndex] || '/placeholder.svg'}
              alt={profile.name || 'Profile'}
              className="w-full h-full object-cover"
            />

            {/* Gradient Overlay for better text visibility at bottom of image */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0a0a0f]" />

            {/* Top Actions */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-30">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1a1a20] border-white/10 text-foreground">
                  <DropdownMenuItem onClick={() => setShowReportModal(true)} className="text-destructive focus:text-destructive">
                    <Flag className="w-4 h-4 mr-2" />
                    Report User
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowBlockModal(true)} className="text-destructive focus:text-destructive">
                    <Ban className="w-4 h-4 mr-2" />
                    Block User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Large Touch Area Navigation (Left/Right strips) */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute inset-y-0 left-0 w-16 flex items-center justify-center bg-gradient-to-r from-black/40 to-transparent hover:from-black/60 transition-all"
                >
                  <ChevronLeft className="w-8 h-8 text-white drop-shadow-lg" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute inset-y-0 right-0 w-16 flex items-center justify-center bg-gradient-to-l from-black/40 to-transparent hover:from-black/60 transition-all"
                >
                  <ChevronRight className="w-8 h-8 text-white drop-shadow-lg" />
                </button>

                {/* Photo indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${index === currentPhotoIndex ? 'w-6 bg-rose-500' : 'w-1.5 bg-white/30'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 p-6 space-y-6 pb-24">
            {/* Header Info */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
                    {profile.age && <span className="text-xl text-white/70">{profile.age}</span>}
                    {profile.is_online && <OnlineIndicator />}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    <span>{profile.location_city}, {profile.location_state}</span>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-4 text-sm border-b border-white/5 pb-4">
                <div className="flex items-center gap-1">
                  {renderStars(profile.average_rating)}
                  <span className="font-medium text-white ml-1">{profile.average_rating.toFixed(1)}</span>
                  <span className="text-white/40 text-xs ml-1">({profile.total_ratings})</span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-1 text-white/60">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs">{memberSince}</span>
                </div>
              </div>

              {/* Personal Details */}
              {profile.height && (
                <div className="flex items-center gap-2 text-sm text-white/60 bg-white/5 p-2 rounded-lg w-fit">
                  <Ruler className="w-4 h-4" />
                  <span>{profile.height}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  About
                </h4>
                <p className="text-white/70 leading-relaxed text-sm">{profile.bio}</p>
              </div>
            )}

            {/* Interests & Hobbies */}
            {(profile.interests?.length || profile.hobbies?.length) && (
              <div className="space-y-3">
                <h4 className="font-semibold text-white">Interests & Hobbies</h4>
                <div className="flex flex-wrap gap-2">
                  {[...(profile.interests || []), ...(profile.hobbies || [])].map((item, index) => (
                    <span key={index} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-medium">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white">Reviews ({profile.total_ratings})</h4>
                </div>
                <div className="space-y-3">
                  {displayedReviews.map((review) => (
                    <div key={review.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {renderStars(review.overall_rating)}
                          <span className="text-sm font-medium text-white">{review.rater_name}</span>
                        </div>
                        <span className="text-[10px] text-white/40 uppercase font-bold">
                          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-white/60">{review.review_text}</p>
                    </div>
                  ))}
                </div>
                {reviews.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    {showAllReviews ? 'Show Less' : `See All Reviews`}
                  </Button>
                )}
              </div>

            {/* Pricing Section - Mobile Optimized with Tabs */}
            {!isEarnerViewing && (
              <div className="space-y-3">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Gem className="w-4 h-4 text-rose-400" />
                  Rates
                </h4>
                
                {/* Quick Messaging */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <MessageSquare className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <p className="text-[10px] text-white/50 uppercase tracking-wide">Text</p>
                    <p className="font-bold text-white">5 Cr</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <Image className="w-5 h-5 text-teal-400 mx-auto mb-1" />
                    <p className="text-[10px] text-white/50 uppercase tracking-wide">Image</p>
                    <p className="font-bold text-white">10 Cr</p>
                  </div>
                </div>

                <Tabs defaultValue="video" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 h-10">
                    <TabsTrigger value="video" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 text-white/70">
                      <Video className="w-4 h-4 mr-2" />
                      Video
                    </TabsTrigger>
                    <TabsTrigger value="audio" className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-white/70">
                      <Phone className="w-4 h-4 mr-2" />
                      Audio
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="video" className="space-y-2 mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {profile.video_15min_rate && (
                        <RateCard duration="15min" rate={profile.video_15min_rate} icon={Video} />
                      )}
                      <RateCard duration="30min" rate={profile.video_30min_rate} icon={Video} />
                      <RateCard duration="60min" rate={profile.video_60min_rate} icon={Video} />
                      {profile.video_90min_rate && (
                        <RateCard duration="90min" rate={profile.video_90min_rate} icon={Video} />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="audio" className="space-y-2 mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {profile.video_15min_rate && (
                        <RateCard duration="15min" rate={deriveAudioRate(profile.video_15min_rate)} icon={Phone} />
                      )}
                      <RateCard duration="30min" rate={deriveAudioRate(profile.video_30min_rate)} icon={Phone} />
                      <RateCard duration="60min" rate={deriveAudioRate(profile.video_60min_rate)} icon={Phone} />
                      {profile.video_90min_rate && (
                        <RateCard duration="90min" rate={deriveAudioRate(profile.video_90min_rate)} icon={Phone} />
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f] to-transparent z-30 border-t border-white/5">
            {isEarnerViewing ? (
              <Button
                onClick={onLikeToggle}
                variant={isLiked ? 'default' : 'outline'}
                className={cn('w-full h-12 text-base font-semibold rounded-xl', 
                  isLiked ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                )}
              >
                <Heart className={cn('w-5 h-5 mr-2', isLiked && 'fill-current')} />
                {isLiked ? 'Liked' : 'Like This Profile'}
              </Button>
            ) : (
              <Button onClick={handleSendMessage} className="w-full h-12 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white text-base font-semibold rounded-xl shadow-lg shadow-rose-900/20 border-0">
                <MessageSquare className="w-5 h-5 mr-2" />
                Send Message
                <span className="ml-auto flex items-center text-white/90 bg-white/20 px-2 py-0.5 rounded-md text-xs font-mono">
                  <Gem className="w-3 h-3 mr-1" />5
                </span>
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <LowBalanceModal
        open={showLowBalance}
        onOpenChange={setShowLowBalance}
        currentBalance={wallet?.credit_balance || 0}
        requiredCredits={MESSAGE_COST}
        onBuyCredits={() => {
          setShowLowBalance(false);
          setShowBuyCredits(true);
        }}
      />

      <BuyCreditsModal open={showBuyCredits} onOpenChange={setShowBuyCredits} />

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

// Helper sub-component for cleaner code
function RateCard({ duration, rate, icon: Icon }: { duration: string; rate: number; icon: any }) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center hover:border-white/20 transition-colors">
      <Icon className="w-4 h-4 text-white/50 mx-auto mb-1.5" />
      <p className="text-xs text-white/40 uppercase font-medium mb-0.5">{duration}</p>
      <p className="font-bold text-white text-sm">{rate} Credits</p>
    </div>
  );
}
