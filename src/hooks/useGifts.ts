import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// --- Types ---
export interface Gift {
  id: string;
  name: string | null;
  emoji: string | null;
  credits_cost: number;
  animation_type: 'standard' | 'premium' | 'ultra';
  is_seasonal: boolean | null;
  active?: boolean | null;
  created_at?: string | null;
  description?: string | null;
  season_tag?: string | null;
  sort_order?: number | null;
}

export interface GiftTransaction {
  id: string;
  sender_id: string;
  recipient_id: string;
  gift_id: string;
  credits_spent: number;
  message: string | null;
  thank_you_reaction: string | null;
  created_at: string | null;
  conversation_id?: string | null;
  credit_to_usd_rate?: number;
  earner_amount?: number;
  gross_value_usd?: number;
  platform_fee?: number;
  status?: string | null;
  gift?: Gift | null;
  sender_name?: string;
}

export interface SendGiftResult {
  success: boolean;
  transaction_id?: string | null;
  gift_name?: string | null;
  gift_emoji?: string | null;
  animation_type?: 'standard' | 'premium' | 'ultra' | null;
  credits_spent?: number;
  new_balance?: number;
  error?: string;
}

// --- Hooks ---

export function useGifts() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(false); // Optimistically set to false for faster load

  useEffect(() => {
    const fetchGifts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('gift_catalog')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (!error && data) {
        setGifts(data.map(g => ({
          ...g,
          animation_type: (g.animation_type as 'standard' | 'premium' | 'ultra') || 'standard'
        })));
      }
      setLoading(false);
    };
    fetchGifts();
  }, []);

  return { gifts, loading };
}

export function useSendGift() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  const sendGift = useCallback(async (
    recipientId: string,
    giftId: string,
    conversationId: string | null = null,
    message?: string
  ): Promise<SendGiftResult> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_gift', {
        p_sender_id: user.id,
        p_recipient_id: recipientId,
        p_conversation_id: conversationId ?? '',
        p_gift_id: giftId,
        p_message: message ?? ''
      });

      if (error) throw error;

      const result = data as unknown as SendGiftResult;
      
      if (result.success) {
        toast.success(`Sent ${result.gift_emoji} ${result.gift_name}!`);
        
        // Fire and forget notification
        supabase.functions.invoke('send-notification-email', {
          body: { type: 'gift', recipientId, giftName: result.gift_name }
        }).catch(e => console.error('Notification failed', e));
      } else {
        toast.error(result.error || 'Failed to send gift');
      }

      return result;
    } catch (error: any) {
      console.error('Send gift error:', error);
      toast.error('Something went wrong');
      return { success: false, error: error.message };
    } finally {
      setSending(false);
    }
  }, [user]);

  return { sendGift, sending };
}

export function useGiftTransactions(conversationId: string | null) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<GiftTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!conversationId || !user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('gift_transactions')
      .select(`*, gift:gift_catalog(*)`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setTransactions(data.map(t => ({
        ...t,
        gift: t.gift ? {
          ...t.gift,
          animation_type: (t.gift.animation_type as 'standard' | 'premium' | 'ultra') || 'standard'
        } : null
      })) as GiftTransaction[]);
    }
    setLoading(false);
  }, [conversationId, user]);

  useEffect(() => {
    fetchTransactions();

    // Optimized Realtime Subscription
    if (conversationId) {
      channelRef.current = supabase
        .channel(`gift-transactions-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'gift_transactions',
            filter: `conversation_id=eq.${conversationId}`
          },
          async (payload) => {
            // Realtime payload doesn't include the 'gift' relation, so we fetch it
            const { data } = await supabase
              .from('gift_transactions')
              .select(`*, gift:gift_catalog(*)`)
              .eq('id', payload.new.id)
              .single();
            
            if (data) {
              const mappedData: GiftTransaction = {
                ...data,
                gift: data.gift ? {
                  ...data.gift,
                  animation_type: (data.gift.animation_type as 'standard' | 'premium' | 'ultra') || 'standard'
                } : null
              };
              setTransactions(prev => [...prev, mappedData]);
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [conversationId, fetchTransactions]);

  const updateThankYouReaction = useCallback(async (transactionId: string, reaction: string) => {
    const { error } = await supabase
      .from('gift_transactions')
      .update({ thank_you_reaction: reaction })
      .eq('id', transactionId);

    if (!error) {
      setTransactions(prev => 
        prev.map(t => t.id === transactionId ? { ...t, thank_you_reaction: reaction } : t)
      );
      toast.success('Reaction sent!');
    } else {
      toast.error('Failed to send reaction');
    }
  }, []);

  return { transactions, loading, updateThankYouReaction };
}
