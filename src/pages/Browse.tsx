import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Search, SlidersHorizontal, Users } from 'lucide-react';

interface EarnerProfile {
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
}

export default function Browse() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [profiles, setProfiles] = useState<EarnerProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<EarnerProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<EarnerProfile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [searchCity, setSearchCity] = useState('');
  const [ageRange, setAgeRange] = useState([18, 50]);
  const [sortBy, setSortBy] = useState('newest');

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
      if (profile.account_status !== 'active') {
        navigate('/onboarding');
        return;
      }
      if (profile.user_type !== 'seeker') {
        navigate('/dashboard');
        return;
      }
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, date_of_birth, location_city, location_state, bio, profile_photos, video_15min_rate, video_30min_rate, video_60min_rate, video_90min_rate, average_rating, total_ratings, created_at')
        .eq('user_type', 'earner')
        .eq('account_status', 'active');

      if (error) {
        console.error('Error fetching profiles:', error);
      } else {
        setProfiles((data as EarnerProfile[]) || []);
        setFilteredProfiles((data as EarnerProfile[]) || []);
      }
      setLoadingProfiles(false);
    };

    if (profile?.user_type === 'seeker') {
      fetchProfiles();
    }
  }, [profile]);

  useEffect(() => {
    let result = [...profiles];

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
  }, [profiles, searchCity, ageRange, sortBy]);

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
                <SelectItem value="rate_low">Rate: Low to High</SelectItem>
                <SelectItem value="rate_high">Rate: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showFilters && (
            <div className="p-4 rounded-xl bg-card border border-border animate-fade-in">
              <div className="space-y-4">
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
        {filteredProfiles.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-muted-foreground" />}
            title="No profiles found"
            description="Try adjusting your filters or search criteria to find more matches."
            className="py-16"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filteredProfiles.map((earner, index) => (
              <div 
                key={earner.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ProfileCard
                  profile={earner}
                  onClick={() => setSelectedProfile(earner)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <ProfileDetailSheet
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />
      
      <MobileNav />
    </div>
  );
}
