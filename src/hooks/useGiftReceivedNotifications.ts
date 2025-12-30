import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useGiftReceivedNotifications() {
  const { user, profile } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isEarner = profile?.user_type === 'earner';

  useEffect(() => {
    if (!user?.id || !isEarner) return;

    const timeout = setTimeout(() => {
      channelRef.current = supabase
        .channel(`gift-received-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'gift_transactions',
            filter: `recipient_id=eq.${user.id}`
          },
          async (payload) => {
            try {
              // Fetch gift details
              const { data: giftData } = await supabase
                .from('gift_catalog')
                .select('name, emoji')
                .eq('id', payload.new.gift_id)
                .single();

              // Fetch sender details using RPC
              const { data: senderData } = await supabase.rpc(
                'get_public_profile_by_id', 
                { profile_id: payload.new.sender_id }
              );

              const senderName = senderData?.[0]?.name?.split(' ')[0] || 'Someone';
              const giftEmoji = giftData?.emoji || '🎁';
              const giftName = giftData?.name || 'a gift';

              toast.success(`${senderName} sent you ${giftEmoji} ${giftName}!`, {
                description: 'Check your messages to thank them',
                duration: 5000,
              });
            } catch (error) {
              console.error('Error fetching gift notification details:', error);
            }
          }
        )
        .subscribe();
    }, 2000);

    return () => {
      clearTimeout(timeout);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, isEarner]);
}
