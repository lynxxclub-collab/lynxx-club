import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { debounce, isOnPage } from '@/lib/queryConfig';

export type TimeWindow = 'daily' | 'weekly' | 'alltime';

export interface TopGifter {
  rank: number;
  gifterId: string;
  gifterName: string;
  gifterPhoto: string | null;
  totalCredits: number;
  lastGiftAt: Date;
  badge: 'crown' | 'diamond' | 'supporter' | null;
}

interface RawGifterData {
  rank: number;
  gifter_id: string;
  gifter_name: string;
  gifter_photo: string | null;
  total_credits: number;
  last_gift_at: string;
}

// Pages where top gifters realtime is needed
const GIFTERS_REALTIME_PAGES = ['/messages', '/dashboard'];

export function useTopGifters(creatorId: string, timeWindow: TimeWindow = 'weekly', limit: number = 10) {
  const [gifters, setGifters] = useState<TopGifter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchGifters = useCallback(async () => {
    if (!creatorId) return;
    
    setLoading(true);
    setError(null);

    try {
      const functionName = `get_top_gifters_${timeWindow}` as const;
      
      const { data, error: rpcError } = await supabase.rpc(functionName, {
        p_creator_id: creatorId,
        p_limit: limit
      });

      if (rpcError) throw rpcError;

      const mappedGifters: TopGifter[] = (data as RawGifterData[] || []).map((g) => ({
        rank: g.rank,
        gifterId: g.gifter_id,
        gifterName: g.gifter_name || 'Anonymous',
        gifterPhoto: g.gifter_photo,
        totalCredits: Number(g.total_credits),
        lastGiftAt: new Date(g.last_gift_at),
        badge: getBadge(g.rank, timeWindow)
      }));

      setGifters(mappedGifters);
    } catch (err: any) {
      console.error('Error fetching top gifters:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [creatorId, timeWindow, limit]);

  // Debounced fetch to prevent rapid re-queries
  const debouncedFetch = useCallback(
    debounce(() => fetchGifters(), 1000),
    [fetchGifters]
  );

  useEffect(() => {
    fetchGifters();
  }, [fetchGifters]);

  // Subscribe to realtime updates for gift transactions - ONLY on relevant pages
  useEffect(() => {
    if (!creatorId) return;

    // Only subscribe on pages that need realtime gifter updates
    if (!isOnPage(GIFTERS_REALTIME_PAGES)) {
      return;
    }

    channelRef.current = supabase
      .channel(`top-gifters-${creatorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gift_transactions',
          filter: `recipient_id=eq.${creatorId}`
        },
        () => {
          // Debounced refetch when a new gift is sent to this creator
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [creatorId, debouncedFetch]);

  return { gifters, loading, error, refetch: fetchGifters };
}

function getBadge(rank: number, timeWindow: TimeWindow): TopGifter['badge'] {
  // Only weekly rankings get special badges
  if (timeWindow !== 'weekly') {
    if (rank === 1) return 'crown';
    if (rank <= 3) return 'diamond';
    if (rank <= 10) return 'supporter';
    return null;
  }
  
  if (rank === 1) return 'crown';
  if (rank <= 3) return 'diamond';
  if (rank <= 10) return 'supporter';
  return null;
}

// Hook for creator leaderboard settings
export function useCreatorLeaderboardSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const leaderboardEnabled = (profile as any)?.leaderboard_enabled ?? true;
  const showDailyLeaderboard = (profile as any)?.show_daily_leaderboard ?? true;

  const updateSettings = async (settings: { 
    leaderboard_enabled?: boolean; 
    show_daily_leaderboard?: boolean 
  }) => {
    if (!user) return { error: 'Not authenticated' };
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(settings)
        .eq('id', user.id);

      if (error) throw error;
      
      await refreshProfile();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    leaderboardEnabled,
    showDailyLeaderboard,
    updateSettings,
    loading
  };
}

// Hook for hidden gifters management
export function useHiddenGifters(creatorId?: string) {
  const [hiddenGifters, setHiddenGifters] = useState<{ id: string; gifter_id: string; gifter_name: string; gifter_photo: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHiddenGifters = useCallback(async () => {
    if (!creatorId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hidden_gifters')
        .select('id, gifter_id')
        .eq('creator_id', creatorId);

      if (error) throw error;

      // Fetch gifter profiles
      if (data && data.length > 0) {
        const gifterIds = data.map(h => h.gifter_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, profile_photos')
          .in('id', gifterIds);

        const mapped = data.map(h => {
          const profile = profiles?.find(p => p.id === h.gifter_id);
          return {
            id: h.id,
            gifter_id: h.gifter_id,
            gifter_name: profile?.name || 'Unknown',
            gifter_photo: profile?.profile_photos?.[0] || null
          };
        });
        setHiddenGifters(mapped);
      } else {
        setHiddenGifters([]);
      }
    } catch (err) {
      console.error('Error fetching hidden gifters:', err);
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    fetchHiddenGifters();
  }, [fetchHiddenGifters]);

  const hideGifter = async (gifterId: string) => {
    if (!creatorId) return { error: 'No creator ID' };
    
    try {
      const { error } = await supabase
        .from('hidden_gifters')
        .insert({ creator_id: creatorId, gifter_id: gifterId });

      if (error) throw error;
      
      await fetchHiddenGifters();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const unhideGifter = async (hiddenId: string) => {
    try {
      const { error } = await supabase
        .from('hidden_gifters')
        .delete()
        .eq('id', hiddenId);

      if (error) throw error;
      
      await fetchHiddenGifters();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  return {
    hiddenGifters,
    loading,
    hideGifter,
    unhideGifter,
    refetch: fetchHiddenGifters
  };
}
