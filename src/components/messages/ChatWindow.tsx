import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";

import { Message, useSendMessage } from "@/hooks/useMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useGiftTransactions, GiftTransaction } from "@/hooks/useGifts";
import { supabase } from "@/integrations/supabase/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import LowBalanceModal from "@/components/credits/LowBalanceModal";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";
import RatingModal from "@/components/ratings/RatingModal";
import BookVideoDateModal from "@/components/video/BookVideoDateModal";
import ChatImage from "@/components/messages/ChatImage";
import GiftModal from "@/components/gifts/GiftModal";
import GiftAnimation from "@/components/gifts/GiftAnimation";
import GiftMessage from "@/components/gifts/GiftMessage";
import ReplyDeadlineTimer from "@/components/messages/ReplyDeadlineTimer";

import { cn } from "@/lib/utils";

import {
  Send,
  Image as ImageIcon,
  Gem,
  User,
  Loader2,
  Check,
  CheckCheck,
  Video,
  MoreVertical,
  Info,
  ArrowDown,
  Lock,
  Gift,
  Flag,
} from "lucide-react";

const messageSchema = z
  .string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(2000, "Message must be less than 2000 characters");

interface ChatWindowProps {
  messages: Message[];
  loading: boolean;
  conversationId: string | null;
  recipientId: string;
  recipientName: string;
  recipientPhoto?: string;
  recipientUserType?: "seeker" | "earner";
  isOnline?: boolean;
  onNewConversation?: (conversationId: string) => void;
  totalMessages?: number;
  video15Rate?: number;
  video30Rate?: number;
  video60Rate?: number;
  video90Rate?: number;
  readOnly?: boolean;
}

const TEXT_MESSAGE_COST = 5;
const IMAGE_MESSAGE_COST = 10;

type GiftAnim = { emoji: string; type: "standard" | "premium" | "ultra" };

type TimelineItem =
  | { type: "message"; data: Message; ts: string }
  | { type: "gift"; data: GiftTransaction; ts: string };

function safeDateHeader(dateString: string) {
  const d = new Date(dateString);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM d");
}

export default function ChatWindow({
  messages,
  loading,
  conversationId,
  recipientId,
  recipientUserType,
  isOnline,
  recipientName,
  recipientPhoto,
  onNewConversation,
  totalMessages = 0,
  video15Rate = 75,
  video30Rate = 150,
  video60Rate = 300,
  video90Rate = 450,
  readOnly = false,
}: ChatWindowProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { wallet } = useWallet();
  const { sendMessage, sending } = useSendMessage();
  const { transactions: giftTransactions, updateThankYouReaction } =
    useGiftTransactions(conversationId);

  const isSeeker = profile?.user_type === "seeker";
  const isEarner = profile?.user_type === "earner";

  const [inputValue, setInputValue] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showVideoBooking, setShowVideoBooking] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);

  const [giftAnimation, setGiftAnimation] = useState<GiftAnim | null>(null);

  const [showScrollDown, setShowScrollDown] = useState(false);
  const [unlockingImage, setUnlockingImage] = useState<string | null>(null);
  const [unlockedImages, setUnlockedImages] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nearBottomRef = useRef(true);

  const { isRecipientTyping, handleTyping, stopTyping } = useTypingIndicator(
    conversationId || null,
    user?.id,
    recipientId
  );

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [
      ...messages.map((m) => ({ type: "message" as const, data: m, ts: m.created_at })),
      ...giftTransactions.map((g) => ({ type: "gift" as const, data: g, ts: g.created_at })),
    ];
    items.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    return items;
  }, [messages, giftTransactions]);

  const groupedTimeline = useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {};
    for (const item of timeline) {
      const key = new Date(item.ts).toDateString();
      (groups[key] ||= []).push(item);
    }
    return groups;
  }, [timeline]);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const recomputeNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollHeight, scrollTop, clientHeight } = el;
    const distance = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distance < 140;
    nearBottomRef.current = nearBottom;
    setShowScrollDown(!nearBottom && scrollHeight > clientHeight + 200);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    requestAnimationFrame(() => {
      if (nearBottomRef.current) scrollToBottom(false);
    });
  }, [conversationId, messages.length, giftTransactions.length, scrollToBottom]);

  const handleScroll = () => {
    recomputeNearBottom();
  };

  useEffect(() => {
    const fetchUnlocked = async () => {
      if (!user?.id) return;
      const imageMessageIds = messages.filter((m) => m.message_type === "image").map((m) => m.id);
      if (!imageMessageIds.length) return;

      const { data, error } = await supabase
        .from("image_unlocks")
        .select("message_id")
        .eq("unlocked_by", user.id)
        .in("message_id", imageMessageIds);

      if (error) return;
      setUnlockedImages(new Set((data || []).map((d) => d.message_id)));
    };

    void fetchUnlocked();
  }, [user?.id, messages]);

  useEffect(() => {
    if (!user?.id || !isEarner || !conversationId) return;

    const channel = supabase
      .channel(`gift-animation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gift_transactions",
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          if ((payload.new as any)?.conversation_id !== conversationId) return;

          const giftId = (payload.new as any)?.gift_id as string | undefined;
          if (!giftId) return;

          const { data: gift } = await supabase
            .from("gift_catalog")
            .select("emoji, animation_type")
            .eq("id", giftId)
            .single();

          if (!gift) return;

          setGiftAnimation({
            emoji: gift.emoji,
            type: (gift.animation_type || "standard") as GiftAnim["type"],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isEarner, conversationId]);

  const handleSend = useCallback(async () => {
    if (sending) return;

    const parsed = messageSchema.safeParse(inputValue);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Invalid message");
      return;
    }

    if (readOnly) return;

    if (isSeeker && (wallet?.credit_balance || 0) < TEXT_MESSAGE_COST) {
      setShowLowBalance(true);
      return;
    }

    stopTyping();

    const res = await sendMessage(recipientId, parsed.data, conversationId, "text");

    if (res.success) {
      setInputValue("");
      if (!conversationId && res.conversationId) onNewConversation?.(res.conversationId);
      requestAnimationFrame(() => scrollToBottom(true));
      return;
    }

    if (res.error === "Insufficient credits") setShowLowBalance(true);
    else toast.error(res.error || "Failed to send message");
  }, [
    sending,
    inputValue,
    readOnly,
    isSeeker,
    wallet?.credit_balance,
    stopTyping,
    sendMessage,
    recipientId,
    conversationId,
    onNewConversation,
    scrollToBottom,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      if (fileInputRef.current) fileInputRef.current.value = "";

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      if (readOnly) return;

      if (isSeeker && (wallet?.credit_balance || 0) < IMAGE_MESSAGE_COST) {
        setShowLowBalance(true);
        return;
      }

      setUploadingImage(true);
      try {
        const ts = Date.now();
        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/${ts}.${ext}`;

        const { error: uploadError } = await supabase.storage.from("chat-images").upload(filePath, file);
        if (uploadError) throw uploadError;

        const res = await sendMessage(recipientId, filePath, conversationId, "image");

        if (res.success) {
          if (!conversationId && res.conversationId) onNewConversation?.(res.conversationId);
          requestAnimationFrame(() => scrollToBottom(true));
          return;
        }

        if (res.error === "Insufficient credits") setShowLowBalance(true);
        else toast.error(res.error || "Failed to send image");
      } catch (err: any) {
        console.error("upload/send image error", err);
        toast.error(err?.message || "Failed to upload image");
      } finally {
        setUploadingImage(false);
      }
    },
    [
      user,
      readOnly,
      isSeeker,
      wallet?.credit_balance,
      sendMessage,
      recipientId,
      conversationId,
      onNewConversation,
      scrollToBottom,
    ]
  );

  const handleUnlockImage = useCallback(
    async (messageId: string) => {
      if ((wallet?.credit_balance || 0) < IMAGE_MESSAGE_COST) {
        setShowLowBalance(true);
        return;
      }

      setUnlockingImage(messageId);
      try {
        const { data, error } = await supabase.rpc("unlock_image", { p_message_id: messageId });
        if (error) throw error;

        const result = data as { success: boolean; error?: string; already_unlocked?: boolean };

        if (!result.success) {
          if (result.error === "Insufficient credits") setShowLowBalance(true);
          else toast.error(result.error || "Failed to unlock image");
          return;
        }

        setUnlockedImages((prev) => {
          const next = new Set(prev);
          next.add(messageId);
          return next;
        });

        if (!result.already_unlocked) toast.success("Image unlocked!");
      } catch (err) {
        console.error("unlock image error", err);
        toast.error("Failed to unlock image");
      } finally {
        setUnlockingImage(null);
      }
    },
    [wallet?.credit_balance]
  );

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0f]">
        <div className="p-4 border-b border-white/10 backdrop-blur-sm flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full bg-white/5" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 bg-white/5" />
            <Skeleton className="h-3 w-20 bg-white/5" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn("flex gap-2", i % 2 === 0 ? "justify-end" : "")}>
              <Skeleton className={cn("h-16 rounded-2xl bg-white/5", i % 2 === 0 ? "w-48" : "w-56")} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-[#0a0a0f]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="p-4 border-b border-white/10 backdrop-blur-sm bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="w-12 h-12 border-2 border-white/10 shadow-lg">
                <AvatarImage src={recipientPhoto} alt={recipientName} />
                <AvatarFallback className="bg-gradient-to-br from-rose-500 to-purple-600 text-white">
                  {recipientName?.charAt(0) || <User className="w-5 h-5" />}
                </AvatarFallback>
              </Avatar>
              {isOnline ? (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0a0a0f]" />
              ) : null}
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-lg text-white truncate">{recipientName}</h3>
              {isOnline ? (
                <span className="text-xs text-green-400">Online</span>
              ) : (
                <span className="text-xs text-white/40">Offline</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isSeeker && !readOnly ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowVideoBooking(true)}
                    className="h-10 w-10 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1a1a1f] border-white/10 text-white">
                  Book Video Date
                </TooltipContent>
              </Tooltip>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl text-white/50 hover:text-white hover:bg-white/5"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-52 bg-[#1a1a1f] border-white/10">
                <DropdownMenuItem
                  onClick={() => window.open(`/profile/${recipientId}`, "_blank")}
                  className="text-white/70 hover:text-white focus:bg-white/10"
                >
                  <Info className="w-4 h-4 mr-2" />
                  View Profile
                </DropdownMenuItem>

                {isSeeker && !readOnly ? (
                  <DropdownMenuItem
                    onClick={() => setShowVideoBooking(true)}
                    className="text-white/70 hover:text-white focus:bg-white/10"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Book Video Date
                  </DropdownMenuItem>
                ) : null}

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  onClick={() => toast.info("Hook this up to your Report flow")}
                  className="text-red-300 hover:text-red-200 focus:bg-red-500/10"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Report User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef} onScroll={handleScroll}>
        <div className="space-y-6 pb-4">
          {timeline.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="font-semibold text-lg text-white mb-1">Start the conversation</h3>
              <p className="text-white/40 text-sm">Send a message to begin chatting with {recipientName}</p>
            </div>
          ) : null}

          {Object.entries(groupedTimeline).map(([dateKey, items]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/40 bg-[#0a0a0f] px-3 py-1 rounded-full border border-white/10">
                  {safeDateHeader(dateKey)}
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="space-y-1.5">
                {items.map((item, idx) => {
                  if (item.type === "gift") {
                    return (
                      <GiftMessage
                        key={`gift-${item.data.id}`}
                        transaction={item.data}
                        onReact={updateThankYouReaction}
                      />
                    );
                  }

                  const message = item.data;
                  const isMine = message.sender_id === user?.id;

                  const prev = items[idx - 1];
                  const prevSenderId = prev?.type === "message" ? prev.data.sender_id : null;
                  const showAvatar = !isMine && (idx === 0 || prevSenderId !== message.sender_id);

                  const next = items[idx + 1];
                  const nextSenderId = next?.type === "message" ? next.data.sender_id : null;
                  const isLastInGroup = idx === items.length - 1 || nextSenderId !== message.sender_id;

                  return (
                    <div key={message.id} className={cn("flex gap-2 group", isMine ? "justify-end" : "")}>
                      {!isMine ? (
                        <div className="w-8 flex-shrink-0">
                          {showAvatar ? (
                            <Avatar className="w-8 h-8 border border-white/10">
                              <AvatarImage src={recipientPhoto} />
                              <AvatarFallback className="text-xs bg-white/5 text-white/70">
                                {recipientName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ) : null}
                        </div>
                      ) : null}

                      <div className={cn("max-w-[75%] relative", isMine ? "order-1" : "")}>
                        <div
                          className={cn(
                            "rounded-xl px-3 py-1.5 shadow-sm",
                            isMine
                              ? cn(
                                  "bg-gradient-to-br from-rose-500 to-purple-500 text-white",
                                  isLastInGroup ? "rounded-br-sm" : ""
                                )
                              : cn(
                                  "bg-white/[0.03] border border-white/10",
                                  isLastInGroup ? "rounded-bl-sm" : ""
                                )
                          )}
                        >
                          {message.message_type === "image" ? (
                            isSeeker &&
                            !isMine &&
                            recipientUserType === "earner" &&
                            !unlockedImages.has(message.id) ? (
                              <div className="relative">
                                <div className="blur-md">
                                  <ChatImage content={message.content} alt="Shared image" />
                                </div>

                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <button
                                    className="px-6 py-3 bg-rose-500 hover:bg-rose-400 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => void handleUnlockImage(message.id)}
                                    disabled={unlockingImage === message.id}
                                  >
                                    {unlockingImage === message.id ? (
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                      <Lock className="w-5 h-5" />
                                    )}
                                    {unlockingImage === message.id ? "Unlocking..." : "Unlock Image — 10 credits"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <ChatImage content={message.content} alt="Shared image" />
                            )
                          ) : (
                            <p className={cn("break-words text-sm leading-snug", isMine ? "text-white" : "text-white/80")}>
                              {message.content}
                            </p>
                          )}
                        </div>

                        <div className={cn("flex items-center gap-1.5 mt-1 px-1", isMine ? "justify-end" : "justify-start")}>
                          <span className="text-[10px] text-white/30">
                            {format(new Date(message.created_at), "h:mm a")}
                          </span>
                          {isMine ? (
                            <span className={cn("text-[10px]", message.read_at ? "text-blue-400" : "text-white/30")}>
                              {message.read_at ? (
                                <CheckCheck className="w-3.5 h-3.5" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </span>
                          ) : null}
                        </div>

                        {message.is_billable_volley && message.reply_deadline ? (
                          <ReplyDeadlineTimer
                            deadline={message.reply_deadline}
                            refundStatus={message.refund_status}
                            isSeeker={isMine}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {isRecipientTyping ? (
            <div className="flex gap-2 items-end">
              <Avatar className="w-8 h-8 border border-white/10">
                <AvatarImage src={recipientPhoto} />
                <AvatarFallback className="text-xs bg-white/5 text-white/70">
                  {recipientName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Scroll to bottom */}
      {showScrollDown ? (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-6 w-10 h-10 rounded-xl bg-white/5 border border-white/10 shadow-lg flex items-center justify-center hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      ) : null}

      {/* Composer / Read-only */}
      {readOnly ? (
        <div className="p-4 border-t border-white/10 bg-white/[0.02] backdrop-blur-sm">
          <div className="flex items-center justify-center gap-3 text-white/40 py-2">
            <Lock className="w-5 h-5" />
            <div className="text-center">
              <p className="font-medium text-white/60">Alumni Access — Read Only</p>
              <p className="text-sm">You can view but not send messages</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-white/10 bg-white/[0.02] backdrop-blur-sm">
          {isSeeker ? (
            <div className="flex items-center justify-between text-xs text-white/40 mb-3 px-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Gem className="w-3 h-3 text-purple-400" />
                  {TEXT_MESSAGE_COST} / text
                </span>
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-rose-400" />
                  {IMAGE_MESSAGE_COST} / image
                </span>
              </div>

              <span className="flex items-center gap-1 font-medium">
                Balance:
                <span className={cn((wallet?.credit_balance || 0) < 20 ? "text-amber-400" : "text-white")}>
                  {(wallet?.credit_balance || 0).toLocaleString()}
                </span>
              </span>
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending || uploadingImage}
                  className="h-10 w-10 rounded-xl shrink-0 text-white/40 hover:text-rose-400 hover:bg-rose-500/10"
                >
                  {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#1a1a1f] border-white/10 text-white">
                Send image ({IMAGE_MESSAGE_COST} credits)
              </TooltipContent>
            </Tooltip>

            {isSeeker ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowGiftModal(true)}
                    disabled={sending || uploadingImage}
                    className="h-10 w-10 rounded-xl shrink-0 text-white/40 hover:text-amber-400 hover:bg-amber-500/10"
                  >
                    <Gift className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1a1a1f] border-white/10 text-white">Send a gift</TooltipContent>
              </Tooltip>
            ) : null}

            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="pr-12 h-11 rounded-full bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20"
                disabled={sending || uploadingImage}
              />

              <Button
                onClick={() => void handleSend()}
                disabled={!inputValue.trim() || sending || uploadingImage}
                size="icon"
                className={cn(
                  "absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full",
                  "bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400",
                  "disabled:opacity-50 transition-all duration-200",
                  inputValue.trim() ? "scale-100" : "scale-90 opacity-50"
                )}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <LowBalanceModal
        open={showLowBalance}
        onOpenChange={setShowLowBalance}
        currentBalance={wallet?.credit_balance || 0}
        requiredCredits={IMAGE_MESSAGE_COST}
        onBuyCredits={() => {
          setShowLowBalance(false);
          setShowBuyCredits(true);
        }}
      />

      <BuyCreditsModal open={showBuyCredits} onOpenChange={setShowBuyCredits} />

      <RatingModal
        open={showRating}
        onOpenChange={setShowRating}
        ratedUserId={recipientId}
        ratedUserName={recipientName}
        conversationId={conversationId || undefined}
      />

      <BookVideoDateModal
        open={showVideoBooking}
        onOpenChange={setShowVideoBooking}
        conversationId={conversationId}
        earnerId={recipientId}
        earnerName={recipientName}
        video15Rate={video15Rate}
        video30Rate={video30Rate}
        video60Rate={video60Rate}
        video90Rate={video90Rate}
      />

      <GiftModal
        open={showGiftModal}
        onOpenChange={setShowGiftModal}
        recipientId={recipientId}
        recipientName={recipientName}
        conversationId={conversationId}
        onGiftSent={(result) => setGiftAnimation({ emoji: result.gift_emoji, type: result.animation_type })}
      />

      {giftAnimation ? (
        <GiftAnimation
          emoji={giftAnimation.emoji}
          animationType={giftAnimation.type}
          onComplete={() => setGiftAnimation(null)}
        />
      ) : null}
    </div>
  );
}