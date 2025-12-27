import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SavedProfile {
  id: string;
  user_id: string;
  saved_profile_id: string;
  created_at: string;
}

export function useSavedProfiles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedProfiles = [], isLoading } = useQuery({
    queryKey: ['saved-profiles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('saved_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SavedProfile[];
    },
    enabled: !!user?.id,
  });

  const savedProfileIds = savedProfiles.map(sp => sp.saved_profile_id);

  const saveProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('saved_profiles')
        .insert({
          user_id: user.id,
          saved_profile_id: profileId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-profiles'] });
      toast.success('Profile saved!');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.info('Profile already saved');
      } else {
        toast.error('Failed to save profile');
      }
    },
  });

  const unsaveProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('saved_profiles')
        .delete()
        .eq('user_id', user.id)
        .eq('saved_profile_id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-profiles'] });
      toast.success('Profile removed from saved');
    },
    onError: () => {
      toast.error('Failed to remove profile');
    },
  });

  const toggleSave = (profileId: string) => {
    if (savedProfileIds.includes(profileId)) {
      unsaveProfileMutation.mutate(profileId);
    } else {
      saveProfileMutation.mutate(profileId);
    }
  };

  const isSaved = (profileId: string) => savedProfileIds.includes(profileId);

  return {
    savedProfiles,
    savedProfileIds,
    isLoading,
    saveProfile: saveProfileMutation.mutate,
    unsaveProfile: unsaveProfileMutation.mutate,
    toggleSave,
    isSaved,
    isSaving: saveProfileMutation.isPending || unsaveProfileMutation.isPending,
  };
}
