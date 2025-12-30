import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isOnPage } from '@/lib/queryConfig';

export interface Wallet {
  user_id: string;
  credit_balance: number;
  pending_earnings: number;
  available_earnings: number;
  paid_out_total: number;
  payout_hold: boolean | null;
  payout_hold_reason: string | null;
  last_payout_at: string | null;
  updated_at: string | null;
}

// Pages where wallet realtime is needed
const WALLET_REALTIME_PAGES = ['/dashboard', '/messages', '/credits', '/earnings', '/settings'];

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setWallet(data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Subscribe to wallet updates - ONLY on relevant pages
  useEffect(() => {
    if (!user) return;

    // Only subscribe on pages that need realtime wallet updates
    if (!isOnPage(WALLET_REALTIME_PAGES)) {
      return;
    }

    channelRef.current = supabase
      .channel(`wallet-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new) {
            setWallet(payload.new as Wallet);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  return { wallet, loading, refetch: fetchWallet };
}
