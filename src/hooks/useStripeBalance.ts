import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StripeBalance {
  connected: boolean;
  available: number;
  pending: number;
  walletAvailable: number;
  paidOutTotal: number;
  nextPayoutDate: string | null;
  nextPayoutAmount: number;
  nextPayoutStatus: 'scheduled' | 'below_minimum' | 'accumulating';
  payoutMinimum: number;
}

export function useStripeBalance() {
  const { user, profile } = useAuth();
  const [balance, setBalance] = useState<StripeBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }

    // If user doesn't have Stripe connected, return early with defaults
    if (!profile?.stripe_onboarding_complete) {
      setBalance({
        connected: false,
        available: 0,
        pending: 0,
        walletAvailable: 0,
        paidOutTotal: 0,
        nextPayoutDate: null,
        nextPayoutAmount: 0,
        nextPayoutStatus: 'accumulating',
        payoutMinimum: 25,
      });
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke('get-stripe-balance');

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setBalance(data as StripeBalance);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch balance';
      console.error('Error fetching Stripe balance:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.stripe_onboarding_complete]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Auto-refresh every 60 seconds if on dashboard
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    
    if (!window.location.pathname.includes('/dashboard')) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 60000);

    return () => clearInterval(interval);
  }, [user, fetchBalance]);

  return { balance, loading, error, refetch: fetchBalance };
}
