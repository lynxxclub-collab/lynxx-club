import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLaunchSignups = () => {
  const [seekerCount, setSeekerCount] = useState(0);
  const [earnerCount, setEarnerCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
    // Initial fetch
    fetchCounts();
    
    // Subscribe to real-time INSERT events on launch_signups
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to launch_signups realtime updates');
        }
      });

    return () => {
      supabase.removeChannel(channel);
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