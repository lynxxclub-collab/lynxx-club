import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: "text" | "image" | "system";
  credits_charged: number;
  created_at: string;
  read_at: string | null;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  last_message_preview: string;
  created_at: string;
  total_messages: number;
  other_user?: {
    id: string;
    name: string;
    profile_photos: string[];
    video_30min_rate?: number;
    video_60min_rate?: number;
  };
  unread_count?: number;
}

// Credit costs
const TEXT_MESSAGE_COST = 5;
const IMAGE_MESSAGE_COST = 10;

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      // Enrich with other user data and unread counts
      const enriched = await Promise.all(
        (data || []).map(async (conv) => {
          const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;

          const [{ data: otherUser }, { count: unreadCount }] = await Promise.all([
            supabase
              .from("profiles")
              .select("id, name, profile_photos, video_30min_rate, video_60min_rate")
              .eq("id", otherId)
              .single(),
            supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id)
              .eq("recipient_id", user.id)
              .is("read_at", null),
          ]);

          return {
            ...conv,
            other_user: otherUser || undefined,
            unread_count: unreadCount || 0,
          } as Conversation;
        }),
      );

      setConversations(enriched);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();

    // Subscribe to new messages for conversation updates
    const channel = supabase
      .channel("conversations-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    refetch: fetchConversations,
  };
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setMessages(data || []);

        // Mark messages as read
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .eq("recipient_id", user.id)
          .is("read_at", null);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);

          // Mark as read if we're the recipient
          if (newMessage.recipient_id === user.id) {
            supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", newMessage.id);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  return { messages, loading };
}

export function useSendMessage() {
  const { user, profile } = useAuth();
  const [sending, setSending] = useState(false);

  const sendMessage = async (
    recipientId: string,
    content: string,
    conversationId: string | null,
    messageType: "text" | "image" = "text",
  ): Promise<{
    success: boolean;
    conversationId?: string;
    error?: string;
  }> => {
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    setSending(true);

    try {
      const isSeeker = profile?.user_type === "seeker";

      // Calculate credits based on message type
      const creditsToCharge = messageType === "image" ? IMAGE_MESSAGE_COST : TEXT_MESSAGE_COST;

      // Check seeker balance
      if (isSeeker) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("credit_balance")
          .eq("user_id", user.id)
          .single();

        if (!wallet || wallet.credit_balance < creditsToCharge) {
          return { success: false, error: "Insufficient credits" };
        }
      }

      let finalConversationId = conversationId;

      // Create conversation if needed
      if (!finalConversationId) {
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id")
          .or(
            `and(participant_1.eq.${user.id},participant_2.eq.${recipientId}),and(participant_1.eq.${recipientId},participant_2.eq.${user.id})`,
          )
          .single();

        if (existingConv) {
          finalConversationId = existingConv.id;
        } else {
          const { data: newConv, error: convError } = await supabase
            .from("conversations")
            .insert({
              participant_1: user.id,
              participant_2: recipientId,
              last_message_preview: messageType === "image" ? "📷 Photo" : content.substring(0, 50),
            })
            .select()
            .single();

          if (convError) throw convError;
          finalConversationId = newConv.id;
        }
      }

      // Insert message
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: finalConversationId,
        sender_id: user.id,
        recipient_id: recipientId,
        content,
        message_type: messageType,
        credits_charged: isSeeker ? creditsToCharge : 0,
      });

      if (msgError) throw msgError;

      // Deduct credits from seeker
      if (isSeeker) {
        const { error: walletError } = await supabase.rpc("deduct_credits", {
          p_user_id: user.id,
          p_amount: creditsToCharge,
          p_description: messageType === "image" ? "Image message sent" : "Text message sent",
        });

        if (walletError) {
          console.error("Failed to deduct credits:", walletError);
          // Message was sent but credits failed - log for reconciliation
        }

        // Credit earner (70% of message value)
        const earnerCredit = creditsToCharge * 0.07; // $0.07 per credit charged
        await supabase.rpc("credit_earner", {
          p_user_id: recipientId,
          p_amount: earnerCredit,
          p_description: messageType === "image" ? "Image message received" : "Text message received",
        });
      }

      // Update conversation preview
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: messageType === "image" ? "📷 Photo" : content.substring(0, 50),
        })
        .eq("id", finalConversationId);

      // Send notification to recipient (non-blocking)
      supabase.functions
        .invoke("send-notification-email", {
          body: {
            type: "message_received",
            recipientId,
            senderName: profile?.name || "Someone",
          },
        })
        .catch((e) => console.error("Notification failed:", e));

      return { success: true, conversationId: finalConversationId };
    } catch (error: any) {
      console.error("Send message error:", error);
      return { success: false, error: error.message };
    } finally {
      setSending(false);
    }
  };

  return { sendMessage, sending };
}
