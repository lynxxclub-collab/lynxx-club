import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TypingState {
  user_id: string;
  is_typing: boolean;
  timestamp: string;
}

export function useTypingIndicator(
  conversationId: string | null,
  userId: string | undefined,
  recipientId: string
) {
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!conversationId || !userId) return;

    const channelName = `typing-${conversationId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: `${userId}` } }
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<TypingState>();
        // Check if recipient is typing
        const recipientState = state[recipientId];
        if (recipientState && recipientState.length > 0) {
          const isTyping = recipientState.some((s) => s.is_typing);
          setIsRecipientTyping(isTyping);
        } else {
          setIsRecipientTyping(false);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === recipientId) {
          const isTyping = newPresences.some((p) => (p as unknown as TypingState).is_typing);
          setIsRecipientTyping(isTyping);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === recipientId) {
          setIsRecipientTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Initial state: not typing
          await channel.track({
            user_id: userId,
            is_typing: false,
            timestamp: new Date().toISOString()
          });
        }
      });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, userId, recipientId]);

  const setIsTyping = useCallback(async (typing: boolean) => {
    if (!channelRef.current || !userId) return;

    try {
      await channelRef.current.track({
        user_id: userId,
        is_typing: typing,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating typing state:', error);
    }
  }, [userId]);

  const handleTyping = useCallback(() => {
    // Signal that user is typing
    setIsTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  }, [setIsTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
  }, [setIsTyping]);

  return { isRecipientTyping, handleTyping, stopTyping };
}
