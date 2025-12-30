import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLaunchSignups = () => {
  // Start with static defaults for instant render - matches skeleton
  const [seekerCount, setSeekerCount] = useState(32);
  const [earnerCount, setEarnerCount] = useState(20);
  const [loading, setLoading] = useState(false); // Start false to not block render
  const fetchedRef = useRef(false);

  const fetchCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_launch_signup_counts');
      if (error) {
        console.error('Error fetching launch signup counts:', error);
        return;
      }
      if (data && data.length > 0) {
        setSeekerCount(data[0].seeker_count || 0);
        setEarnerCount(data[0].earner_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch launch signup counts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Prevent double-fetching in React StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    // Defer initial fetch to not block FCP - use requestIdleCallback if available
    const scheduleLoad = () => {
      if ('requestIdleCallback' in window) {
        (window as typeof window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(fetchCounts);
      } else {
        // Fallback: use setTimeout with small delay to let critical render complete
        setTimeout(fetchCounts, 100);
      }
    };
    
    scheduleLoad();
    
    // Defer realtime subscription to avoid WebSocket errors during initial page load
    // This prevents errors in Lighthouse and other testing environments
    const subscriptionTimeout = setTimeout(() => {
      const channel = supabase
        .channel('launch_signups_realtime')
        .on(
          'postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'launch_signups' 
          },
          (payload) => {
            // Optimistically update the count based on the new signup type
            const newSignup = payload.new as { user_type: string };
            if (newSignup.user_type === 'seeker') {
              setSeekerCount(prev => prev + 1);
            } else if (newSignup.user_type === 'earner') {
              setEarnerCount(prev => prev + 1);
            }
          }
        )
        .subscribe();

      // Store channel for cleanup
      (window as any).__launchSignupsChannel = channel;
    }, 3000);

    return () => {
      clearTimeout(subscriptionTimeout);
      const channel = (window as any).__launchSignupsChannel;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchCounts]);

  return {
    seekerSpotsLeft: Math.max(0, 100 - seekerCount),
    earnerSpotsLeft: Math.max(0, 50 - earnerCount),
    seekerCount,
    earnerCount,
    loading,
    refetch: fetchCounts
  };
};