import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Message interface matching your actual schema
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: string;
  credits_cost: number;
  earner_amount: number;
  platform_fee: number;
  is_billable_volley: boolean;
  billed_at: string | null;
  created_at: string;
  read_at: string | null;
}

// Conversation interface matching your actual schema
export interface Conversation {
  id: string;
  seeker_id: string;
  earner_id: string;
  payer_user_id: string;
  last_message_at: string;
  total_messages: number;
  total_credits_spent: number;
  created_at: string;
  other_user?: {
    id: string;
    name: string;
    profile_photos: string[];
    video_30min_rate?: number;
    video_60min_rate?: number;
  };
  unread_count?: number;
  last_message?: Message | null;
}

// Credit costs
const TEXT_MESSAGE_COST = 5;
const IMAGE_MESSAGE_COST = 10;

export function useConversations() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const isEarner = profile?.user_type === "earner";
      const column = isEarner ? "earner_id" : "seeker_id";

      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq(column, user.id)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (conv: any) => {
          const otherId = conv.seeker_id === user.id ? conv.earner_id : conv.seeker_id;

          const [{ data: otherUser }, { count: unreadCount }, { data: lastMsg }] = await Promise.all([
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
            supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          return {
            ...conv,
            other_user: otherUser || undefined,
            unread_count: unreadCount || 0,
            last_message: lastMsg || null,
          } as Conversation;
        }),
      );

      setConversations(enriched);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchConversations();

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
        setMessages((data || []) as Message[]);

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

      // Try to use the send_message RPC if it exists
      try {
        const { data: result, error: rpcError } = await supabase.rpc("send_message", {
          p_sender_id: user.id,
          p_conversation_id: conversationId || "",
          p_recipient_id: recipientId,
          p_content: content,
          p_message_type: messageType,
        });

        if (!rpcError && result) {
          // RPC succeeded - result might be the conversation_id or an object
          const convId =
            typeof result === "object" && result !== null ? (result as any).conversation_id : conversationId;
          return {
            success: true,
            conversationId: convId || undefined,
          };
        }

        // If RPC failed, fall through to manual method
        if (rpcError) {
          console.log("send_message RPC error:", rpcError.message);
        }
      } catch (rpcErr) {
        // RPC doesn't exist or failed, fall back to manual insert
        console.log("send_message RPC not available, using manual insert");
      }

      // Manual fallback
      let finalConversationId = conversationId;

      // Create conversation if needed
      if (!finalConversationId) {
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id")
          .or(
            `and(seeker_id.eq.${user.id},earner_id.eq.${recipientId}),and(seeker_id.eq.${recipientId},earner_id.eq.${user.id})`,
          )
          .maybeSingle();

        if (existingConv) {
          finalConversationId = existingConv.id;
        } else {
          const seekerId = isSeeker ? user.id : recipientId;
          const earnerId = isSeeker ? recipientId : user.id;

          const { data: newConv, error: convError } = await supabase
            .from("conversations")
            .insert({
              seeker_id: seekerId,
              earner_id: earnerId,
              payer_user_id: seekerId,
            })
            .select()
            .single();

          if (convError) throw convError;
          finalConversationId = newConv.id;
        }
      }

      // Calculate amounts
      const creditValue = creditsToCharge * 0.1;
      const earnerAmount = creditValue * 0.7;
      const platformFee = creditValue * 0.3;

      // Insert message
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: finalConversationId,
        sender_id: user.id,
        recipient_id: recipientId,
        content,
        message_type: messageType,
        credits_cost: isSeeker ? creditsToCharge : 0,
        earner_amount: isSeeker ? earnerAmount : 0,
        platform_fee: isSeeker ? platformFee : 0,
        is_billable_volley: isSeeker,
      });

      if (msgError) throw msgError;

      // Deduct credits from seeker wallet
      if (isSeeker) {
        // First get current balance
        const { data: currentWallet } = await supabase
          .from("wallets")
          .select("credit_balance")
          .eq("user_id", user.id)
          .single();

        if (currentWallet) {
          const newBalance = currentWallet.credit_balance - creditsToCharge;

          await supabase.from("wallets").update({ credit_balance: newBalance }).eq("user_id", user.id);
        }

        // Credit earner - get current available_earnings and update
        const { data: earnerWallet } = await supabase
          .from("wallets")
          .select("available_earnings")
          .eq("user_id", recipientId)
          .single();

        if (earnerWallet) {
          const currentEarnings = earnerWallet.available_earnings || 0;
          await supabase
            .from("wallets")
            .update({
              available_earnings: currentEarnings + earnerAmount,
            })
            .eq("user_id", recipientId);
        }
      }

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
        })
        .eq("id", finalConversationId);

      // Send notification (non-blocking)
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
