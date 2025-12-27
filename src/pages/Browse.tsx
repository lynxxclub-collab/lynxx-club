import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import ProfileCard from '@/components/browse/ProfileCard';
import ProfileDetailSheet from '@/components/browse/ProfileDetailSheet';
import SignupGateModal from '@/components/browse/SignupGateModal';
import ProfileCardSkeleton from '@/components/ui/ProfileCardSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, Users, Rocket, Gift, Share2 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useBrowseProfiles, BrowseProfile } from '@/hooks/useBrowseProfiles';

export default function Browse() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = !!user;

  // Redirect logic for authenticated users with specific statuses
  useEffect(() => {
    if (!loading && profile) {
      if (profile.account_status === 'paused') {
        navigate('/reactivate');
        return;
      }
      if (profile.account_status === 'alumni') {
        navigate('/alumni');
        return;
      }
      if (profile.account_status === 'pending_verification' || profile.account_status === 'pending') {
        navigate('/verify');
        return;
      }
      if (profile.verification_status !== 'verified') {
        navigate('/verify');
        return;
      }
      if (profile.account_status !== 'active') {
        navigate('/onboarding');
        return;
      }
    }
  }, [profile, loading, navigate]);

  // React Query fetch
  const { data: profiles = [], isLoading, error, refetch } = useBrowseProfiles(isAuthenticated);

  const [selectedProfile, setSelectedProfile] = useState<BrowseProfile | null>(null);
  const [showSignupGate, setShowSignupGate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());

  // Filters
  const [searchCity, setSearchCity] = useState('');
  const [ageRange, setAgeRange] = useState([18, 50]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'seeker' | 'earner'>('all');
  const [sortBy, setSortBy] = useState('newest');

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

  // Fetch liked profiles for authenticated earners
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

  const filteredProfiles = useMemo(() => {
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
      result.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortBy === 'rate_low') {
      result.sort((a, b) => (a.video_30min_rate || 0) - (b.video_30min_rate || 0));
    } else if (sortBy === 'rate_high') {
      result.sort((a, b) => (b.video_30min_rate || 0) - (a.video_30min_rate || 0));
    }

    return result;
  }, [profiles, searchCity, ageRange, sortBy, typeFilter]);

  const handleProfileClick = (p: BrowseProfile) => {
    if (!isAuthenticated) {
      setShowSignupGate(true);
    } else {
      setSelectedProfile(p);
    }
  };

  const handleLikeToggle = async (profileId: string) => {
    if (!user?.id) return;
    const isLiked = likedProfiles.has(profileId);

    if (isLiked) {
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
      await supabase
        .from('profile_likes')
        .insert({ liker_id: user.id, liked_id: profileId });
      setLikedProfiles(prev => new Set(prev).add(profileId));
    }
  };

  const isEarner = profile?.user_type === 'earner';

  // Loading state
  if (loading || isLoading) {
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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <div className="container py-6">
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

        {/* Error state */}
        {error ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-muted-foreground" />}
            title="Can't load profiles"
            description={(error as Error).message}
            className="py-16"
            action={
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : profiles.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center py-16 px-4">
            <div className="max-w-2xl text-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Rocket className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                No profiles found yet
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                We couldn't find any profiles to show right now. Check back soon!
              </p>

              {!isAuthenticated && (
                <Button size="lg" onClick={() => navigate('/auth?mode=signup')}>
                  Sign up to be the first
                </Button>
              )}
            </div>
          </div>
        ) : filteredProfiles.length === 0 ? (
          // No matches after filtering
          <EmptyState
            icon={<Users className="w-8 h-8 text-muted-foreground" />}
            title="No profiles match your filters"
            description="Try adjusting your search or filters."
            className="py-16"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchCity('');
                  setAgeRange([18, 50]);
                  setTypeFilter('all');
                }}
              >
                Reset filters
              </Button>
            }
          />
        ) : (
          // Profiles grid
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filteredProfiles.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p}
                onClick={() => handleProfileClick(p)}
                showLikeButton={isEarner}
                isLiked={likedProfiles.has(p.id)}
                onLikeToggle={() => handleLikeToggle(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Profile detail sheet (members only) */}
      {selectedProfile && (
        <ProfileDetailSheet
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          isEarnerViewing={isEarner}
          isLiked={likedProfiles.has(selectedProfile.id)}
          onLikeToggle={() => handleLikeToggle(selectedProfile.id)}
        />
      )}

      {/* Signup gate modal for public visitors */}
      <SignupGateModal open={showSignupGate} onClose={() => setShowSignupGate(false)} />

      <MobileNav />
    </div>
  );
}
