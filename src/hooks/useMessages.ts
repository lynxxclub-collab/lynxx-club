import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isValidUUID, requireValidUUID } from '@/lib/sanitize';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: 'text' | 'image';
  credits_cost: number;
  earner_amount: number;
  platform_fee: number;
  created_at: string;
  read_at: string | null;
  is_billable_volley?: boolean;
  billed_at?: string | null;
}

export interface Conversation {
  id: string;
  seeker_id: string;
  earner_id: string;
  payer_user_id?: string | null;
  total_messages: number;
  total_credits_spent: number;
  last_message_at: string;
  created_at: string;
  other_user?: {
    id: string;
    name: string;
    profile_photos: string[];
    video_30min_rate?: number;
    video_60min_rate?: number;
  };
  last_message?: Message;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user || !isValidUUID(user.id)) return;

    try {
      const validUserId = requireValidUUID(user.id, 'user ID');
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`seeker_id.eq.${validUserId},earner_id.eq.${validUserId}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const enrichedConversations = await Promise.all(
        (data || []).map(async (conv) => {
          const otherId = conv.seeker_id === user.id ? conv.earner_id : conv.seeker_id;
          
          const [profileRes, messageRes] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, name, profile_photos, video_30min_rate, video_60min_rate')
              .eq('id', otherId)
              .maybeSingle(),
            supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          ]);

          return {
            ...conv,
            other_user: profileRes.data || undefined,
            last_message: messageRes.data || undefined
          } as Conversation;
        })
      );

      setConversations(enrichedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `seeker_id=eq.${user.id}`
        },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `earner_id=eq.${user.id}`
        },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !user) return;

    const markAsRead = async () => {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', user.id)
        .is('read_at', null);
    };

    markAsRead();
  }, [conversationId, user, messages]);

  return { messages, loading, refetch: fetchMessages };
}

export function useSendMessage() {
  const { user, refreshProfile } = useAuth();
  const [sending, setSending] = useState(false);

  const sendMessage = async (
    recipientId: string,
    content: string,
    conversationId: string | null,
    messageType: 'text' | 'image' = 'text'
  ): Promise<{ success: boolean; conversationId?: string; error?: string; billedVolley?: boolean }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    setSending(true);

    try {
      // Ensure we have a valid session before calling edge function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        return { success: false, error: 'Session expired. Please log in again.' };
      }

      const { data, error } = await supabase.functions.invoke('send-message-volley', {
        body: {
          conversationId,
          recipientId,
          content,
          messageType
        }
      });

      if (error) throw error;

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to send message' };
      }

      // Refresh profile to update credit/earnings balance
      await refreshProfile();

      return { 
        success: true, 
        conversationId: data.conversationId,
        billedVolley: data.billedVolley
      };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    } finally {
      setSending(false);
    }
  };

  return { sendMessage, sending };
}
