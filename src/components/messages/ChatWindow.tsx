import { useState, useRef, useEffect, useMemo } from "react";
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
import { format, isToday, isYesterday } from "date-fns";
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
} from "lucide-react";
import { toast } from "sonner";
import LowBalanceModal from "@/components/credits/LowBalanceModal";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";
import RatingModal from "@/components/ratings/RatingModal";
import BookVideoDateModal from "@/components/video/BookVideoDateModal";
import ChatImage from "@/components/messages/ChatImage";
import GiftModal from "@/components/gifts/GiftModal";
import GiftAnimation from "@/components/gifts/GiftAnimation";
import GiftMessage from "@/components/gifts/GiftMessage";
import ReplyDeadlineTimer from "@/components/messages/ReplyDeadlineTimer";
import { z } from "zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { user, profile } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const { sendMessage, sending } = useSendMessage();
  const { transactions: giftTransactions, updateThankYouReaction } = useGiftTransactions(conversationId);
  const [inputValue, setInputValue] = useState("");
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showVideoBooking, setShowVideoBooking] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftAnimation, setGiftAnimation] = useState<{emoji: string; type: 'standard' | 'premium' | 'ultra'} | null>(null);
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [unlockingImage, setUnlockingImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [unlockedImages, setUnlockedImages] = useState<Set<string>>(new Set());

  const isSeeker = profile?.user_type === "seeker";
  const isEarner = profile?.user_type === "earner";

  // Real-time gift animation for earners (recipients)
  useEffect(() => {
    if (!user?.id || !isEarner || !conversationId) return;

    const channel = supabase
      .channel(`gift-animation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gift_transactions',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.new.conversation_id === conversationId) {
            const { data: gift } = await supabase
              .from('gift_catalog')
              .select('emoji, animation_type')
              .eq('id', payload.new.gift_id)
              .single();
            
            if (gift) {
              setGiftAnimation({
                emoji: gift.emoji,
                type: gift.animation_type as 'standard' | 'premium' | 'ultra'
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isEarner, conversationId]);

  // Real-time typing indicator
  const { isRecipientTyping, handleTyping, stopTyping } = useTypingIndicator(
    conversationId || null,
    user?.id,
    recipientId
  );

  // Fetch already unlocked images on mount
  useEffect(() => {
    const fetchUnlockedImages = async () => {
      if (!user?.id || messages.length === 0) return;
      
      const messageIds = messages
        .filter(m => m.message_type === 'image')
        .map(m => m.id);
      
      if (messageIds.length === 0) return;

      const { data, error } = await supabase
        .from('image_unlocks')
        .select('message_id')
        .eq('unlocked_by', user.id)
        .in('message_id', messageIds);

      if (!error && data) {
        setUnlockedImages(new Set(data.map(d => d.message_id)));
      }
    };

    fetchUnlockedImages();
  }, [user?.id, messages]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages, conversationId]);

  const TEXT_MESSAGE_COST = 5;
  const IMAGE_MESSAGE_COST = 10;

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
    }
  };

  const handleUnlockImage = async (messageId: string) => {
    if (!wallet || wallet.credit_balance < 10) {
      setShowLowBalance(true);
      return;
    }

    setUnlockingImage(messageId);

    try {
      const { data, error } = await supabase.rpc('unlock_image', {
        p_message_id: messageId
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; already_unlocked?: boolean };

      if (!result.success) {
        if (result.error === 'Insufficient credits') {
          setShowLowBalance(true);
        } else {
          toast.error(result.error || 'Failed to unlock image');
        }
        return;
      }

      setUnlockedImages(prev => new Set(prev).add(messageId));
      
      if (!result.already_unlocked) {
        toast.success('Image unlocked!');
      }
    } catch (error) {
      console.error('Error unlocking image:', error);
      toast.error('Failed to unlock image');
    } finally {
      setUnlockingImage(null);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const validation = messageSchema.safeParse(inputValue);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (isSeeker && (wallet?.credit_balance || 0) < TEXT_MESSAGE_COST) {
      setShowLowBalance(true);
      return;
    }

    stopTyping();

    const result = await sendMessage(recipientId, validation.data, conversationId, "text");

    if (result.success) {
      setInputValue("");
      if (!conversationId && result.conversationId) {
        onNewConversation?.(result.conversationId);
      }
    } else if (result.error === "Insufficient credits") {
      setShowLowBalance(true);
    } else {
      toast.error(result.error || "Failed to send message");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    handleTyping();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    if (isSeeker && (wallet?.credit_balance || 0) < IMAGE_MESSAGE_COST) {
      setShowLowBalance(true);
      return;
    }

    setUploadingImage(true);

    try {
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("chat-images").upload(filePath, file);

      if (uploadError) throw uploadError;

      const result = await sendMessage(recipientId, filePath, conversationId, "image");

      if (result.success) {
        if (!conversationId && result.conversationId) {
          onNewConversation?.(result.conversationId);
        }
      } else if (result.error === "Insufficient credits") {
        setShowLowBalance(true);
      } else {
        toast.error(result.error || "Failed to send image");
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  type TimelineItem = 
    | { type: 'message'; data: Message; timestamp: string }
    | { type: 'gift'; data: GiftTransaction; timestamp: string };

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [
      ...messages.map(m => ({ type: 'message' as const, data: m, timestamp: m.created_at })),
      ...giftTransactions.map(g => ({ type: 'gift' as const, data: g, timestamp: g.created_at }))
    ];
    return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, giftTransactions]);

  const groupedTimeline = timelineItems.reduce(
    (groups, item) => {
      const date = new Date(item.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    },
    {} as Record<string, TimelineItem[]>,
  );

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMMM d");
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0f]">
        <div className="p-3 sm:p-4 border-b border-white/10 backdrop-blur-sm flex items-center gap-3">
          <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-white/5" />
            <Skeleton className="h-3 w-20 bg-white/5" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn("flex gap-2", i % 2 === 0 && "justify-end")}>
              <Skeleton className={cn("h-16 rounded-2xl bg-white/5", i % 2 === 0 ? "w-48" : "w-56")} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-white/10 backdrop-blur-md bg-[#0a0a0f]/90 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-white/10 shadow-lg">
                <AvatarImage src={recipientPhoto} alt={recipientName} />
                <AvatarFallback className="bg-gradient-to-br from-rose-500 to-purple-600 text-white">
                  {recipientName?.charAt(0) || <User className="w-5 h-5" />}
                </AvatarFallback>
              </Avatar>
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0f]" />
              )}
            </div>
              
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">{recipientName}</h3>
              {isOnline && <span className="text-xs font-medium text-green-400">Online</span>}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isSeeker && !readOnly && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowVideoBooking(true)}
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1a1a1f] border-white/10 text-white">Book Video Date</TooltipContent>
              </Tooltip>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl text-white/50 hover:text-white hover:bg-white/5"
                >
                  <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[#1a1a1f] border-white/10">
                <DropdownMenuItem
                  onClick={() => window.open(`/profile/${recipientId}`, "_blank")}
                  className="text-white/70 hover:text-white focus:bg-white/10"
                >
                  <Info className="w-4 h-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
                {isSeeker && !readOnly && (
                  <DropdownMenuItem
                    onClick={() => setShowVideoBooking(true)}
                    className="text-white/70 hover:text-white focus:bg-white/10"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Book Video Date
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="text-red-400 hover:text-red-300 focus:bg-red-500/10">
                  Report User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          className="h-full overflow-y-auto p-3 sm:p-4 space-y-6 scroll-smooth" 
          ref={scrollRef} 
          onScroll={handleScroll}
        >
          {messages.length === 0 && (
            <div className="text-center py-16 flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/10 to-purple-500/10 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="font-bold text-lg text-white mb-1">Start the conversation</h3>
              <p className="text-white/40 text-sm px-8">Send a message to begin chatting with {recipientName}</p>
            </div>
          )}

          {Object.entries(groupedTimeline).map(([date, dateItems]) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] sm:text-xs text-white/40 bg-[#0a0a0f] px-3 py-1 rounded-full border border-white/10 uppercase tracking-wider font-semibold">
                  {formatDateHeader(date)}
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                {dateItems.map((item, index) => {
                  if (item.type === 'gift') {
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
                  
                  const prevItem = dateItems[index - 1];
                  const prevSenderId = prevItem?.type === 'message' ? prevItem.data.sender_id : null;
                  const showAvatar = !isMine && (index === 0 || prevSenderId !== message.sender_id);
                  
                  const nextItem = dateItems[index + 1];
                  const nextSenderId = nextItem?.type === 'message' ? nextItem.data.sender_id : null;
                  const isLastInGroup = index === dateItems.length - 1 || nextSenderId !== message.sender_id;

                  return (
                    <div key={message.id} className={cn("flex gap-2 sm:gap-3 group", isMine && "justify-end")}>
                      {!isMine && (
                        <div className="w-8 flex-shrink-0 flex items-end">
                          {showAvatar && (
                            <Avatar className="w-8 h-8 border border-white/10">
                              <AvatarImage src={recipientPhoto} />
                              <AvatarFallback className="text-xs bg-white/5 text-white/70">
                                {recipientName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      <div className={cn("max-w-[85%] sm:max-w-[75%] relative", isMine && "order-1")}>
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2 shadow-sm",
                            isMine
                              ? cn(
                                  "bg-gradient-to-br from-rose-600 to-purple-600 text-white",
                                  isLastInGroup ? "rounded-br-md" : "",
                                )
                              : cn("bg-white/[0.03] border border-white/10", isLastInGroup ? "rounded-bl-md" : ""),
                          )}
                        >
                          {message.message_type === "image" ? (
                            isSeeker && !isMine && recipientUserType === "earner" && !unlockedImages.has(message.id) ? (
                              <div className="relative">
                                <div className="blur-lg">
                                  <ChatImage content={message.content} alt="Shared image" />
                                </div>
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl p-4">
                                  <Lock className="w-8 h-8 text-white/80 mb-2" />
                                  <button
                                    className="w-full max-w-[200px] px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-70"
                                    onClick={() => handleUnlockImage(message.id)}
                                    disabled={unlockingImage === message.id}
                                  >
                                    {unlockingImage === message.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Gem className="w-4 h-4" />
                                    )}
                                    {unlockingImage === message.id ? 'Unlocking...' : 'Unlock Image (10 Cr)'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <ChatImage content={message.content} alt="Shared image" />
                            )
                          ) : (
                            <p
                              className={cn(
                                "break-words text-sm sm:text-base leading-relaxed",
                                isMine ? "text-white" : "text-white/80",
                              )}
                            >
                              {message.content}
                            </p>
                          )}
                        </div>

                        <div
                          className={cn(
                            "flex items-center gap-1.5 mt-1 px-1",
                            isMine ? "justify-end" : "justify-start",
                          )}
                        >
                          <span className="text-[10px] text-white/30 font-mono">
                            {format(new Date(message.created_at), "h:mm a")}
                          </span>
                          {isMine && (
                            <span className={cn("text-[10px]", message.read_at ? "text-blue-400" : "text-white/30")}>
                              {message.read_at ? (
                                <CheckCheck className="w-3.5 h-3.5" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                        
                        {message.is_billable_volley && message.reply_deadline && (
                          <ReplyDeadlineTimer
                            deadline={message.reply_deadline}
                            refundStatus={message.refund_status}
                            isSeeker={isMine}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isRecipientTyping && (
            <div className="flex gap-2 items-end">
              <Avatar className="w-8 h-8 border border-white/10">
                <AvatarImage src={recipientPhoto} />
                <AvatarFallback className="text-xs bg-white/5 text-white/70">{recipientName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Scroll to bottom button - Floating above input area */}
        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-6 right-6 h-10 w-10 rounded-xl bg-[#0a0a0f] border border-rose-500/30 shadow-lg shadow-rose-500/10 flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500 transition-all text-rose-400 z-20"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Input */}
      {readOnly ? (
        <div className="p-4 border-t border-white/10 bg-[#0a0a0f]">
          <div className="flex items-center justify-center gap-3 text-white/40 py-3">
            <Lock className="w-5 h-5" />
            <div className="text-center">
              <p className="font-semibold text-white/60">Alumni Access - Read Only</p>
              <p className="text-xs">You can view but not send messages</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#0a0a0f]/95 backdrop-blur-sm">
          {isSeeker && (
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-white/40 mb-2 px-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Gem className="w-3 h-3 text-purple-400" />
                  {TEXT_MESSAGE_COST} / text
                </span>
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-rose-400" />
                  {IMAGE_MESSAGE_COST} / img
                </span>
              </div>
              <span className="flex items-center gap-1 font-bold">
                Balance:
                <span className={cn(wallet?.credit_balance && wallet.credit_balance < 20 ? "text-amber-400" : "text-white/80")}>
                  {wallet?.credit_balance?.toLocaleString() || 0}
                </span>
              </span>
            </div>
          )}

          <div className="flex items-end gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

            <div className="flex items-end gap-1 flex-1 bg-white/[0.03] border border-white/10 rounded-2xl focus-within:border-rose-500/30 focus-within:ring-1 focus-within:ring-rose-500/20 transition-all px-1">
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

              {isSeeker && (
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
                  <TooltipContent className="bg-[#1a1a1f] border-white/10 text-white">
                    Send a gift
                  </TooltipContent>
                </Tooltip>
              )}

              <Input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 h-10 sm:h-11 border-0 bg-transparent text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:shadow-none px-2"
                disabled={sending || uploadingImage}
              />
              
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || sending || uploadingImage}
                size="icon"
                className={cn(
                  "h-9 sm:h-10 w-9 sm:w-10 rounded-xl shrink-0",
                  "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-lg shadow-rose-500/20",
                  "disabled:opacity-50 disabled:shadow-none transition-all",
                  inputValue.trim() && "scale-100",
                  !inputValue.trim() && "scale-90 opacity-50",
                )}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
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
        onGiftSent={(result) => {
          setGiftAnimation({ emoji: result.gift_emoji, type: result.animation_type });
        }}
      />

      {giftAnimation && (
        <GiftAnimation
          emoji={giftAnimation.emoji}
          animationType={giftAnimation.type}
          onComplete={() => setGiftAnimation(null)}
        />
      )}

    </div>
  );
}