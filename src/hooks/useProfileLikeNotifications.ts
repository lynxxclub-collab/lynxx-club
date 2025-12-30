import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isOnPage } from '@/lib/queryConfig';

// Pages where like notifications should be active
const LIKE_NOTIFICATION_PAGES = ['/dashboard', '/browse', '/messages', '/profile'];

/**
 * Hook to subscribe to real-time profile like notifications.
 * Shows a toast when someone likes the current user's profile.
 * ONLY activates on relevant pages to reduce RLS checks.
 */
export function useProfileLikeNotifications() {
  const { user, profile } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id || !profile) return;

    // Only subscribe on pages that need like notifications
    if (!isOnPage(LIKE_NOTIFICATION_PAGES)) {
      return;
    }

    // Delay subscription to reduce initial page load
    const timeout = setTimeout(() => {
      channelRef.current = supabase
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
    }, 3000); // 3 second delay

    return () => {
      clearTimeout(timeout);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, profile]);
}
