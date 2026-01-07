import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Gift {
  id: string;
  name: string;
  emoji: string;
  credits_cost: number;
  description: string | null;
  animation_type: 'standard' | 'premium' | 'ultra';
  sort_order: number;
  is_seasonal: boolean;
  season_tag: string | null;
}

export interface GiftTransaction {
  id: string;
  sender_id: string;
  recipient_id: string;
  conversation_id: string | null;
  gift_id: string;
  credits_spent: number;
  earner_amount: number;
  platform_fee: number;
  message: string | null;
  thank_you_reaction: string | null;
  created_at: string;
  gift?: Gift;
}

interface SendGiftResult {
  success: boolean;
  transaction_id?: string | null;
  gift_name?: string | null;
  gift_emoji?: string | null;
  animation_type?: 'standard' | 'premium' | 'ultra' | null;
  credits_spent?: number;
  new_balance?: number;
  error?: string;
}

export function useGifts() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGifts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gift_catalog')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setGifts((data as Gift[]) || []);
      } catch (error) {
        console.error('Error fetching gifts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGifts();
  }, []);

  return { gifts, loading };
}

export function useSendGift() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  const sendGift = async (
    recipientId: string,
    giftId: string,
    conversationId: string | null,
    message?: string
  ): Promise<SendGiftResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_gift', {
        p_sender_id: user.id,
        p_recipient_id: recipientId,
        p_conversation_id: conversationId,
        p_gift_id: giftId,
        p_message: message || null
      });

      if (error) throw error;

      const result = data as unknown as SendGiftResult;
      
      if (!result.success) {
        return result;
      }

      // Trigger notification email (fire and forget)
      supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'gift_received',
          recipientId,
          senderName: user.user_metadata?.name || 'Someone',
          giftName: result.gift_name,
          giftEmoji: result.gift_emoji
        }
      }).catch(console.error);

      return result;
    } catch (error: any) {
      console.error('Error sending gift:', error);
      return { success: false, error: error.message || 'Failed to send gift' };
    } finally {
      setSending(false);
    }
  };

  return { sendGift, sending };
}

export function useGiftTransactions(conversationId: string | null) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<GiftTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!conversationId || !user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gift_transactions')
          .select(`
            *,
            gift:gift_catalog(*)
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setTransactions((data as GiftTransaction[]) || []);
      } catch (error) {
        console.error('Error fetching gift transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();

    // Subscribe to realtime updates - only when on messages page
    // This subscription is scoped to a specific conversation, so it's fine
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
          // Fetch the full transaction with gift details
          const { data } = await supabase
            .from('gift_transactions')
            .select(`*, gift:gift_catalog(*)`)
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            setTransactions(prev => [...prev, data as GiftTransaction]);
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
  }, [conversationId, user]);

  const updateThankYouReaction = async (transactionId: string, reaction: string) => {
    try {
      const { error } = await supabase
        .from('gift_transactions')
        .update({ thank_you_reaction: reaction })
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(prev =>
        prev.map(t => t.id === transactionId ? { ...t, thank_you_reaction: reaction } : t)
      );

      toast.success('Sent your thank you!');
    } catch (error) {
      console.error('Error updating reaction:', error);
      toast.error('Failed to send reaction');
    }
  };

  return { transactions, loading, updateThankYouReaction };
}
