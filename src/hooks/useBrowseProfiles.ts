import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BrowseProfile {
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
  is_featured?: boolean;
  featured_until?: string;
}

// Limited preview profile for anonymous users
export interface PreviewProfile {
  id: string;
  first_name: string;
  location_city: string;
  user_type: 'seeker' | 'earner';
  is_featured: boolean;
  has_photo: boolean;
  profile_photo: string | null;
}

async function fetchMemberProfiles(): Promise<BrowseProfile[]> {
  // Ensure we have a valid session before calling the member RPC
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) {
    // Try refreshing
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (!refreshData.session?.access_token) {
      throw new Error('Not authenticated');
    }
  }

  const { data, error } = await supabase.rpc('get_browse_profiles_for_viewer' as any);
  if (error) throw error;
  return (data as BrowseProfile[]) || [];
}

async function fetchPreviewProfiles(): Promise<PreviewProfile[]> {
  const { data, error } = await supabase.rpc('get_public_browse_profiles_preview' as any);
  if (error) throw error;
  return (data as PreviewProfile[]) || [];
}

export function useBrowseProfiles(isAuthenticated: boolean) {
  return useQuery<(BrowseProfile | PreviewProfile)[]>({
    queryKey: ['browse-profiles', isAuthenticated ? 'member' : 'preview'],
    queryFn: async () => {
      if (isAuthenticated) {
        return fetchMemberProfiles();
      }
      return fetchPreviewProfiles();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
  });
}

// Type guard to check if profile is a full profile or preview
export function isFullProfile(profile: BrowseProfile | PreviewProfile): profile is BrowseProfile {
  return 'name' in profile && 'profile_photos' in profile;
}
