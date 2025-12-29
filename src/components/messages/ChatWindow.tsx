import { useState, useRef, useEffect } from "react";
import { Message, useSendMessage } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { toast } from "sonner";
import LowBalanceModal from "@/components/credits/LowBalanceModal";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";
import RatingModal from "@/components/ratings/RatingModal";
import BookVideoDateModal from "@/components/video/BookVideoDateModal";
import ChatImage from "@/components/messages/ChatImage";
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
  const { wallet } = useWallet();
  const { sendMessage, sending } = useSendMessage();
  const [inputValue, setInputValue] = useState("");
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showVideoBooking, setShowVideoBooking] = useState(false);
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSeeker = profile?.user_type === "seeker";
  const TEXT_MESSAGE_COST = 5;
  const IMAGE_MESSAGE_COST = 10;
  // Scroll handling
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (isNearBottom) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
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

  // Rating modal is only triggered after video calls (handled by VideoCall page)
  // Removed automatic trigger based on message count

  // Simulate typing indicator
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Math.random() > 0.7 && messages.length > 0) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 2000 + Math.random() * 2000);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [messages.length]);

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

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, Message[]>,
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
        <div className="p-4 border-b border-white/10 backdrop-blur-sm flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full bg-white/5" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 bg-white/5" />
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
      <div className="p-4 border-b border-white/10 backdrop-blur-sm bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-white/10 shadow-lg">
              <AvatarImage src={recipientPhoto} alt={recipientName} />
              <AvatarFallback className="bg-gradient-to-br from-rose-500 to-purple-600 text-white">
                {recipientName?.charAt(0) || <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg text-white">{recipientName}</h3>
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
                    className="h-10 w-10 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Video className="w-5 h-5" />
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
                  className="h-10 w-10 rounded-xl text-white/50 hover:text-white hover:bg-white/5"
                >
                  <MoreVertical className="w-5 h-5" />
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
      <ScrollArea className="flex-1 p-4" ref={scrollRef} onScrollCapture={handleScroll}>
        <div className="space-y-6 pb-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="font-semibold text-lg text-white mb-1">Start the conversation</h3>
              <p className="text-white/40 text-sm">Send a message to begin chatting with {recipientName}</p>
            </div>
          )}

          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/40 bg-[#0a0a0f] px-3 py-1 rounded-full border border-white/10">
                  {formatDateHeader(date)}
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Messages for this date */}
              <div className="space-y-3">
                {dateMessages.map((message, index) => {
                  const isMine = message.sender_id === user?.id;
                  const showAvatar =
                    !isMine && (index === 0 || dateMessages[index - 1]?.sender_id !== message.sender_id);
                  const isLastInGroup =
                    index === dateMessages.length - 1 || dateMessages[index + 1]?.sender_id !== message.sender_id;

                  return (
                    <div key={message.id} className={cn("flex gap-2 group", isMine && "justify-end")}>
                      {!isMine && (
                        <div className="w-8 flex-shrink-0">
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

                      <div className={cn("max-w-[70%] relative", isMine && "order-1")}>
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2.5 shadow-sm",
                            isMine
                              ? cn(
                                  "bg-gradient-to-br from-rose-500 to-purple-500 text-white",
                                  isLastInGroup ? "rounded-br-md" : "",
                                )
                              : cn("bg-white/[0.03] border border-white/10", isLastInGroup ? "rounded-bl-md" : ""),
                          )}
                        >
                          {message.message_type === "image" ? (
                            <ChatImage content={message.content} alt="Shared image" />
                          ) : (
                            <p
                              className={cn(
                                "break-words text-[15px] leading-relaxed",
                                isMine ? "text-white" : "text-white/80",
                              )}
                            >
                              {message.content}
                            </p>
                          )}
                        </div>

                        {/* Time and status */}
                        <div
                          className={cn(
                            "flex items-center gap-1.5 mt-1 px-1",
                            isMine ? "justify-end" : "justify-start",
                          )}
                        >
                          <span className="text-[10px] text-white/30">
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2 items-end">
              <Avatar className="w-8 h-8 border border-white/10">
                <AvatarImage src={recipientPhoto} />
                <AvatarFallback className="text-xs bg-white/5 text-white/70">{recipientName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div
                    className="w-2 h-2 bg-white/30 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-white/30 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 w-10 h-10 rounded-xl bg-white/5 border border-white/10 shadow-lg flex items-center justify-center hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      )}

      {/* Input */}
      {readOnly ? (
        <div className="p-4 border-t border-white/10 bg-white/[0.02] backdrop-blur-sm">
          <div className="flex items-center justify-center gap-3 text-white/40 py-2">
            <Lock className="w-5 h-5" />
            <div className="text-center">
              <p className="font-medium text-white/60">Alumni Access - Read Only</p>
              <p className="text-sm">You can view but not send messages</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-white/10 bg-white/[0.02] backdrop-blur-sm">
          {/* Credit info for seekers */}
          {isSeeker && (
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
                <span
                  className={cn(wallet?.credit_balance && wallet.credit_balance < 20 ? "text-amber-400" : "text-white")}
                >
                  {wallet?.credit_balance?.toLocaleString() || 0}
                </span>
              </span>
            </div>
          )}

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

            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                className="pr-12 h-11 rounded-full bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20"
                disabled={sending || uploadingImage}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || sending || uploadingImage}
                size="icon"
                className={cn(
                  "absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full",
                  "bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400",
                  "disabled:opacity-50",
                  "transition-all duration-200",
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

      {/* Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
