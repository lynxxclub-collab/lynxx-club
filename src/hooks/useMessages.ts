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
const TEXT_MESSAGE_COST = 5; // All text messages cost 5 credits
const IMAGE_MESSAGE_COST = 10; // All images cost 10 credits

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
      const isEarner = profile?.user_type === "earner";

      // Calculate credits based on message type
      const creditsToCharge = messageType === "image" ? IMAGE_MESSAGE_COST : TEXT_MESSAGE_COST;

      // Determine seeker and earner IDs
      let seekerId: string;
      let earnerId: string;

      if (isSeeker) {
        seekerId = user.id;
        earnerId = recipientId;
      } else {
        seekerId = recipientId;
        earnerId = user.id;
      }

      // For SEEKER sending: check balance and charge immediately
      // For EARNER sending TEXT: check seeker balance and charge immediately
      // For EARNER sending IMAGE: NO charge yet (seeker unlocks later)

      const isEarnerImage = isEarner && messageType === "image";

      if (!isEarnerImage) {
        // Check seeker's balance
        const { data: seekerWallet } = await supabase
          .from("wallets")
          .select("credit_balance")
          .eq("user_id", seekerId)
          .single();

        if (!seekerWallet || seekerWallet.credit_balance < creditsToCharge) {
          if (isSeeker) {
            return { success: false, error: "Insufficient credits" };
          } else {
            return { success: false, error: "Seeker has insufficient credits" };
          }
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
          const convId =
            typeof result === "object" && result !== null ? (result as any).conversation_id : conversationId;
          return {
            success: true,
            conversationId: convId || undefined,
          };
        }

        if (rpcError) {
          console.log("send_message RPC error:", rpcError.message);
        }
      } catch (rpcErr) {
        console.log("send_message RPC not available, using manual insert");
      }

      // Manual fallback
      let finalConversationId = conversationId;

      // Create conversation if needed
      if (!finalConversationId) {
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id")
          .or(`and(seeker_id.eq.${seekerId},earner_id.eq.${earnerId})`)
          .maybeSingle();

        if (existingConv) {
          finalConversationId = existingConv.id;
        } else {
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
      // For earner images: credits_cost = 0, billed_at = null (will be set when unlocked)
      // For all other messages: charge immediately
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: finalConversationId,
        sender_id: user.id,
        recipient_id: recipientId,
        content,
        message_type: messageType,
        credits_cost: isEarnerImage ? 0 : creditsToCharge,
        earner_amount: isEarnerImage ? 0 : earnerAmount,
        platform_fee: isEarnerImage ? 0 : platformFee,
        is_billable_volley: !isEarnerImage, // Earner images are billed on unlock
        billed_at: isEarnerImage ? null : new Date().toISOString(),
      });

      if (msgError) throw msgError;

      // Process payment (skip for earner images - will be charged on unlock)
      if (!isEarnerImage) {
        // Get fresh seeker wallet balance
        const { data: seekerWallet } = await supabase
          .from("wallets")
          .select("credit_balance")
          .eq("user_id", seekerId)
          .single();

        if (seekerWallet) {
          // Deduct from seeker
          const newSeekerBalance = seekerWallet.credit_balance - creditsToCharge;
          await supabase.from("wallets").update({ credit_balance: newSeekerBalance }).eq("user_id", seekerId);

          // Credit earner
          const { data: earnerWallet } = await supabase
            .from("wallets")
            .select("available_earnings")
            .eq("user_id", earnerId)
            .single();

          if (earnerWallet) {
            await supabase
              .from("wallets")
              .update({
                available_earnings: (earnerWallet.available_earnings || 0) + earnerAmount,
              })
              .eq("user_id", earnerId);
          }
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
