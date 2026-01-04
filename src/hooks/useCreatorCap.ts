// File: src/hooks/useCreatorCap.ts
// Updated with real-time subscriptions for creator cap status

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CreatorCapStatus {
  current_count: number;
  limit: number;
  is_capped: boolean;
  spots_remaining: number;
}

export function useCreatorCap() {
  // Start with static defaults for instant render
  const [capStatus, setCapStatus] = useState<CreatorCapStatus>({
    current_count: 20,
    limit: 50,
    is_capped: false,
    spots_remaining: 30,
  });
  const [loading, setLoading] = useState(false); // Start false to not block render
  const [error, setError] = useState<string | null>(null);

  const fetchCapStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_creator_cap_status');
      
      if (error) throw error;
      
      if (data) {
        setCapStatus(data as unknown as CreatorCapStatus);
      }
    } catch (err: any) {
      console.error('Error fetching creator cap status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchCapStatus();

    // Subscribe to real-time changes on profiles table
    // This will trigger whenever a creator (earner) is added/removed/updated
    const channel = supabase
      .channel('creator-cap-status')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.earner', // Only listen to earner/creator changes
        },
        (payload) => {
          console.log('Creator profile change detected:', payload);
          // Refetch cap status whenever a creator profile changes
          fetchCapStatus();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    ...capStatus,
    loading,
    error,
    refetch: fetchCapStatus,
  };
}