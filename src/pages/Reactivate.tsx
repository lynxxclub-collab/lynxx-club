import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  User, 
  Star, 
  MessageSquare, 
  Video, 
  Check, 
  Gift, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  Loader2,
  Shield,
  Zap,
  Heart,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface AccountStats {
  rating: number;
  totalRatings: number;
  conversationCount: number;
  videoDateCount: number;
  memberSince: Date | null;
  photos: string[];
  bio: string;
}

const WHATS_NEW = [
  { icon: Video, title: 'Enhanced video quality', description: 'Crystal clear HD video calls' },
  { icon: Shield, title: 'New safety features', description: 'Improved verification and reporting' },
  { icon: Zap, title: 'Better matching', description: 'Smarter algorithm for better matches' },
  { icon: Calendar, title: 'In-person date booking', description: 'Plan real-world meetups' },
];

export default function Reactivate() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut } = useAuth();
  
  const [step, setStep] = useState<'welcome' | 'whats_new' | 'profile' | 'success'>('welcome');
  const [loading, setLoading] = useState(true);
  const [reactivating, setReactivating] = useState(false);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [photoChoice, setPhotoChoice] = useState<'keep' | 'new'>('keep');
  const [bio, setBio] = useState('');

  const reactivationCount = profile?.reactivation_count || 0;
  const isFirstReactivation = reactivationCount === 0;
  const bonusCredits = isFirstReactivation ? 500 : 0;
  const maxReactivationsReached = reactivationCount >= 3;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // If not paused, redirect to appropriate page
    if (profile && profile.account_status !== 'paused' && profile.account_status !== 'alumni') {
      navigate(profile.user_type === 'seeker' ? '/browse' : '/dashboard');
      return;
    }

    fetchAccountStats();
  }, [user, profile, navigate]);

  async function fetchAccountStats() {
    if (!user) return;
    setLoading(true);

    try {
      // Get conversation count
      const { count: convCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .or(`seeker_id.eq.${user.id},earner_id.eq.${user.id}`);

      // Get video date count
      const { count: videoCount } = await supabase
        .from('video_dates')
        .select('*', { count: 'exact', head: true })
        .or(`seeker_id.eq.${user.id},earner_id.eq.${user.id}`)
        .eq('status', 'completed');

      setStats({
        rating: profile?.average_rating || 0,
        totalRatings: profile?.total_ratings || 0,
        conversationCount: convCount || 0,
        videoDateCount: videoCount || 0,
        memberSince: profile?.created_at ? new Date(profile.created_at) : null,
        photos: profile?.profile_photos || [],
        bio: profile?.bio || '',
      });

      setBio(profile?.bio || '');
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleReactivate = async () => {
    if (!user || maxReactivationsReached) return;

    setReactivating(true);
    try {
      // Update account status
      const { error } = await supabase
        .from('profiles')
        .update({
          account_status: 'active',
          paused_date: null,
          exit_reason: null,
          reactivation_eligible_date: null,
          alumni_access_expires: null,
          reactivation_count: reactivationCount + 1,
          last_reactivated_at: new Date().toISOString(),
          // Add bonus credits if first reactivation
          ...(isFirstReactivation && { 
            credit_balance: (profile?.credit_balance || 0) + bonusCredits 
          }),
          // Update bio if changed
          ...(bio !== stats?.bio && { bio })
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setStep('success');
    } catch (error: any) {
      console.error('Error reactivating:', error);
      toast.error(error.message || 'Failed to reactivate account');
    } finally {
      setReactivating(false);
    }
  };

  const handleStayPaused = async () => {
    await signOut();
    navigate('/');
  };

  const handleFinish = () => {
    if (profile?.user_type === 'seeker') {
      navigate('/browse');
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (maxReactivationsReached) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <RefreshCw className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-display font-bold">Maximum Reactivations Reached</h1>
              <p className="text-muted-foreground">
                You've reactivated your account 3 times. Please contact support if you need assistance.
              </p>
            </div>

            <div className="space-y-3">
              <Button onClick={() => window.open('mailto:support@lynxxclub.com')} className="w-full">
                Contact Support
              </Button>
              <Button variant="ghost" onClick={handleStayPaused} className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Welcome Back
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-gradient-to-br from-primary/5 to-teal/5 border-primary/20">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-display font-bold">Welcome Back! 🎉</h1>
              <p className="text-muted-foreground">
                We've missed you! Here's what we found from your account:
              </p>
            </div>

            {/* Account Stats */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-background/80 rounded-lg">
                <Check className="w-5 h-5 text-teal" />
                <span>Your profile (fully intact)</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-background/80 rounded-lg">
                <Star className="w-5 h-5 text-amber-500" />
                <span>
                  Your ratings ({stats?.rating?.toFixed(1) || '0.0'} stars, {stats?.totalRatings || 0} reviews)
                </span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-background/80 rounded-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span>{stats?.conversationCount || 0} past conversations</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-background/80 rounded-lg">
                <Video className="w-5 h-5 text-teal" />
                <span>{stats?.videoDateCount || 0} video dates completed</span>
              </div>
            </div>

            {/* Bonus Credits */}
            {isFirstReactivation && (
              <div className="p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Gift className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="font-bold text-amber-600">Welcome back bonus!</p>
                    <p className="text-2xl font-bold">500 FREE CREDITS</p>
                    <p className="text-sm text-muted-foreground">($50 value)</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={() => setStep('whats_new')} 
                className="w-full bg-gradient-to-r from-primary to-teal hover:from-primary/90 hover:to-teal/90"
                size="lg"
              >
                Reactivate My Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={handleStayPaused}
                className="w-full text-muted-foreground"
              >
                Not ready? Stay Paused
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: What's New
  if (step === 'whats_new') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <Sparkles className="w-10 h-10 text-primary mx-auto" />
              <h1 className="text-2xl font-display font-bold">What's New Since You Left</h1>
            </div>

            <div className="space-y-3">
              {WHATS_NEW.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep('profile')}
                className="flex-1"
              >
                Skip Tour
              </Button>
              <Button 
                onClick={() => setStep('profile')}
                className="flex-1"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Profile Update
  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-display font-bold">Let's Refresh Your Profile</h1>
              <p className="text-muted-foreground">
                Make sure your profile is up to date
              </p>
            </div>

            {/* Current Photos */}
            {stats?.photos && stats.photos.length > 0 && (
              <div className="space-y-3">
                <Label>Your photos{stats.memberSince && ` from ${format(stats.memberSince, 'MMM yyyy')}`}:</Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {stats.photos.slice(0, 4).map((photo, index) => (
                    <Avatar key={index} className="w-16 h-16 rounded-lg shrink-0">
                      <AvatarImage src={photo} className="object-cover" />
                      <AvatarFallback><User className="w-6 h-6" /></AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                
                <RadioGroup value={photoChoice} onValueChange={(v) => setPhotoChoice(v as 'keep' | 'new')}>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="keep" />
                      <span className="text-sm">Keep these photos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="new" />
                      <span className="text-sm">Upload new photos later</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Bio */}
            <div className="space-y-2">
              <Label>Your bio:</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about yourself..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleReactivate}
                disabled={reactivating}
                className="flex-1"
              >
                Skip
              </Button>
              <Button 
                onClick={handleReactivate}
                disabled={reactivating}
                className="flex-1"
              >
                {reactivating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save & Activate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 4: Success
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-gradient-to-br from-teal/10 to-primary/10 border-teal/30">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal to-primary flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-white" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-display font-bold">You're Back! 🚀</h1>
              <p className="text-muted-foreground">
                Your account is now <span className="text-teal font-semibold">ACTIVE</span>
              </p>
            </div>

            {isFirstReactivation && (
              <div className="p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
                <div className="flex items-center justify-center gap-2">
                  <Gift className="w-5 h-5 text-amber-500" />
                  <p className="font-bold">
                    Your bonus: <span className="text-amber-600">500 credits added</span> ✅
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">(Worth $50!)</p>
              </div>
            )}

            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Heart className="w-4 h-4 text-pink-500" />
                <p>
                  {stats?.conversationCount || 0} of your past connections may still be active. 
                  Want to reconnect?
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/messages')}
                variant="outline"
                className="w-full"
              >
                See Past Conversations
              </Button>
              <Button 
                onClick={handleFinish}
                className="w-full bg-gradient-to-r from-primary to-teal hover:from-primary/90 hover:to-teal/90"
                size="lg"
              >
                Start Browsing
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
