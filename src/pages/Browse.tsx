import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import ProfileCard from '@/components/browse/ProfileCard';
import ProfileDetailSheet from '@/components/browse/ProfileDetailSheet';
import ProfileCardSkeleton from '@/components/ui/ProfileCardSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, Users, Rocket, Gift, Share2 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';

interface BrowseProfile {
  id: string;
  name: string;
  date_of_birth: string;
  location_city: string;
  location_state: string;
  bio: string;
  profile_photos: string[];
  video_15min_rate: number;
  video_30min_rate: number;
  video_60min_rate: number;
  video_90min_rate: number;
  average_rating: number;
  total_ratings: number;
  created_at: string;
  user_type: 'seeker' | 'earner';
  height?: string;
  hobbies?: string[];
  interests?: string[];
}

export default function Browse() {
  const { user, session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const debug = searchParams.get('debug') === '1';

  const [profiles, setProfiles] = useState<BrowseProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<BrowseProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<BrowseProfile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Filters
  const [searchCity, setSearchCity] = useState('');
  const [ageRange, setAgeRange] = useState([18, 50]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'seeker' | 'earner'>('all');
  const [sortBy, setSortBy] = useState('newest');

  const resetFilters = () => {
    setSearchCity('');
    setAgeRange([18, 50]);
    setTypeFilter('all');
    setSortBy('newest');
  };

  const isAuthError = !!fetchError && /not authenticated/i.test(fetchError);

  // SEO
  useEffect(() => {
    document.title = 'Browse Profiles | Lynxx Club';

    const content = 'Browse seeker and earner profiles. Filter by city, age, and sort to find the right match.';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (!loading && profile) {
      // Redirect paused users to reactivation
      if (profile.account_status === 'paused') {
        navigate('/reactivate');
        return;
      }
      // Redirect alumni to alumni dashboard
      if (profile.account_status === 'alumni') {
        navigate('/alumni');
        return;
      }
      // Redirect users pending verification
      if (profile.account_status === 'pending_verification' || profile.account_status === 'pending') {
        navigate('/verify');
        return;
      }
      // Redirect users needing to verify (not verified yet)
      if (profile.verification_status !== 'verified') {
        navigate('/verify');
        return;
      }
      if (profile.account_status !== 'active') {
        navigate('/onboarding');
        return;
      }
    }
  }, [user, profile, loading, navigate]);

  // Fetch browse profiles using a strict RPC that:
  // - requires auth (fails loudly if not authenticated)
  // - returns only safe public fields
  // - excludes self + blocked users
  // - returns only the opposite user_type for the viewer
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user || !session?.access_token) return;

      setLoadingProfiles(true);
      setFetchError(null);

      const { data, error } = await supabase.rpc('get_browse_profiles_for_viewer' as any);

      if (error) {
        console.error('Error fetching profiles:', error);
        setProfiles([]);
        setFilteredProfiles([]);
        setFetchError(error.message ?? 'Unknown error');
        setLoadingProfiles(false);
        toast.error('Could not load profiles');
        return;
      }

      const rows = ((data as BrowseProfile[]) || []).filter(Boolean);
      setProfiles(rows);
      setFilteredProfiles(rows);
      setLoadingProfiles(false);
    };

    fetchProfiles();
  }, [user, session?.access_token, reloadKey]);


  // Fetch liked profiles for earners
  useEffect(() => {
    const fetchLikes = async () => {
      if (!user?.id || profile?.user_type !== 'earner') return;

      const { data } = await supabase
        .from('profile_likes')
        .select('liked_id')
        .eq('liker_id', user.id);

      if (data) {
        setLikedProfiles(new Set(data.map(l => l.liked_id)));
      }
    };

    fetchLikes();
  }, [user?.id, profile?.user_type]);

  useEffect(() => {
    let result = [...profiles];

    // Filter by user type
    if (typeFilter !== 'all') {
      result = result.filter(p => p.user_type === typeFilter);
    }

    // Filter by city
    if (searchCity.trim()) {
      result = result.filter(p => 
        p.location_city?.toLowerCase().includes(searchCity.toLowerCase())
      );
    }

    // Filter by age
    result = result.filter(p => {
      if (!p.date_of_birth) return true;
      const age = calculateAge(p.date_of_birth);
      return age >= ageRange[0] && age <= ageRange[1];
    });

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.average_rating - a.average_rating);
    } else if (sortBy === 'rate_low') {
      result.sort((a, b) => a.video_30min_rate - b.video_30min_rate);
    } else if (sortBy === 'rate_high') {
      result.sort((a, b) => b.video_30min_rate - a.video_30min_rate);
    }

    setFilteredProfiles(result);
  }, [profiles, searchCity, ageRange, sortBy, typeFilter]);

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleLikeToggle = async (profileId: string) => {
    if (!user?.id) return;

    const isLiked = likedProfiles.has(profileId);

    if (isLiked) {
      // Unlike
      await supabase
        .from('profile_likes')
        .delete()
        .eq('liker_id', user.id)
        .eq('liked_id', profileId);
      
      setLikedProfiles(prev => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    } else {
      // Like
      await supabase
        .from('profile_likes')
        .insert({ liker_id: user.id, liked_id: profileId });
      
      setLikedProfiles(prev => new Set(prev).add(profileId));
    }
  };

  if (loading || loadingProfiles) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <div className="container py-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <ProfileCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  const isEarner = profile?.user_type === 'earner';

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <div className="container py-6">
        {debug && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <span className="text-muted-foreground">User:</span>{' '}
                <span className="font-mono text-xs">{user?.id ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Session token:</span>{' '}
                <span>{session?.access_token ? 'present' : 'missing'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Viewer type:</span>{' '}
                <span>{profile?.user_type ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Type filter:</span>{' '}
                <span>{typeFilter}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Profiles fetched:</span>{' '}
                <span>{profiles.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">After filters:</span>{' '}
                <span>{filteredProfiles.length}</span>
              </div>
            </div>
            {fetchError && (
              <div className="mt-3 text-sm text-destructive">
                {fetchError}
              </div>
            )}
          </div>
        )}

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by city..."
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:bg-secondary/50 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                {!isEarner && (
                  <>
                    <SelectItem value="rate_low">Rate: Low to High</SelectItem>
                    <SelectItem value="rate_high">Rate: High to Low</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {showFilters && (
            <div className="p-4 rounded-xl bg-card border border-border animate-fade-in">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Show</Label>
                  <ToggleGroup 
                    type="single" 
                    value={typeFilter} 
                    onValueChange={(value) => value && setTypeFilter(value as 'all' | 'seeker' | 'earner')}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="all" aria-label="Show all">All</ToggleGroupItem>
                    <ToggleGroupItem value="seeker" aria-label="Show seekers">Seekers</ToggleGroupItem>
                    <ToggleGroupItem value="earner" aria-label="Show earners">Earners</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="space-y-2">
                  <Label>Age Range: {ageRange[0]} - {ageRange[1]}</Label>
                  <Slider
                    value={ageRange}
                    onValueChange={setAgeRange}
                    min={18}
                    max={60}
                    step={1}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profiles Grid */}
        {fetchError ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-muted-foreground" />}
            title="Can't load profiles"
            description={fetchError}
            className="py-16"
            action={
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setReloadKey(k => k + 1)}>
                  Retry
                </Button>
                {isAuthError && (
                  <Button onClick={() => navigate('/auth')}>Go to login</Button>
                )}
              </div>
            }
          />
        ) : profiles.length === 0 ? (
          // Launch empty state - no profiles yet
          <div className="flex items-center justify-center py-16 px-4">
            <div className="max-w-2xl text-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Rocket className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                We're Just Getting Started!
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Lynxx Club launched this week and we're building our community of{' '}
                {profile?.user_type === 'seeker' ? 'Earners' : 'Seekers'}. Check back in a few days, or invite someone you think would be great!
              </p>

              <div className="bg-card border border-border rounded-2xl p-6 mb-8 text-left">
                <h3 className="text-xl font-bold text-foreground mb-4">Meanwhile, you can:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-teal">✓</span>
                    <span className="text-muted-foreground">
                      Your account is ready - you'll get notified when new {profile?.user_type === 'seeker' ? 'Earners' : 'Seekers'} join
                    </span>
                  </li>
                  {profile?.user_type === 'seeker' && profile?.credit_balance && profile.credit_balance > 0 && (
                    <li className="flex items-start gap-3">
                      <Gift className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">
                        Your <span className="text-primary font-semibold">{profile.credit_balance} bonus credits</span> are waiting
                      </span>
                    </li>
                  )}
                  <li className="flex items-start gap-3">
                    <Share2 className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      Refer friends and get <span className="text-gold font-semibold">100 bonus credits</span> per referral
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link to="/settings">
                    <Share2 className="w-4 h-4 mr-2" />
                    Refer Friends
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/launch">
                    <Rocket className="w-4 h-4 mr-2" />
                    View Launch Progress
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-muted-foreground" />}
            title="No profiles match your filters"
            description="Reset filters or broaden your search to see more profiles."
            className="py-16"
            action={
              <Button variant="outline" onClick={resetFilters}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filteredProfiles.map((browseProfile, index) => (
              <div
                key={browseProfile.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ProfileCard
                  profile={browseProfile}
                  onClick={() => setSelectedProfile(browseProfile)}
                  showLikeButton={isEarner}
                  isLiked={likedProfiles.has(browseProfile.id)}
                  onLikeToggle={() => handleLikeToggle(browseProfile.id)}
                />
              </div>
            ))}
          </div>
        )}

      </div>

      <ProfileDetailSheet
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        isEarnerViewing={isEarner}
        isLiked={selectedProfile ? likedProfiles.has(selectedProfile.id) : false}
        onLikeToggle={selectedProfile ? () => handleLikeToggle(selectedProfile.id) : undefined}
      />
      
      <MobileNav />
    </div>
  );
}
