import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';

/**
 * Hook to subscribe to real-time profile like notifications.
 * Shows a toast when someone likes the current user's profile.
 */
export function useProfileLikeNotifications() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user?.id || !profile) return;

    const channel = supabase
      .channel('profile-likes-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_likes',
          filter: `liked_id=eq.${user.id}`
        },
        async (payload) => {
          // Fetch the liker's name
          const likerId = payload.new.liker_id;
          const { data: likerProfile } = await supabase
            .rpc('get_public_profile_by_id', { profile_id: likerId });

          const likerName = likerProfile?.[0]?.name?.split(' ')[0] || 'Someone';

          toast.success(`${likerName} liked your profile!`, {
            description: 'Check out who\'s interested in you',
            icon: '💖',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile]);
}
