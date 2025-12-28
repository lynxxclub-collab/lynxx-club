import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Message, useSendMessage } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useNudges } from "@/hooks/useNudges";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Send, Image as ImageIcon, Gem, User, Loader2, Check, CheckCheck, Video, Lock } from "lucide-react";
import { toast } from "sonner";
import LowBalanceModal from "@/components/credits/LowBalanceModal";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";
import RatingModal from "@/components/ratings/RatingModal";
import BookVideoDateModal from "@/components/video/BookVideoDateModal";
import ChatImage from "@/components/messages/ChatImage";
import ChatNudge from "@/components/messages/ChatNudge";
import { z } from "zod";

// =============================================================================
// TYPES
// =============================================================================

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

interface ModalState {
  lowBalance: boolean;
  buyCredits: boolean;
  rating: boolean;
  videoBooking: boolean;
}

type ModalType = keyof ModalState;

// =============================================================================
// CONSTANTS
// =============================================================================

const CONFIG = {
  textMessageCost: 5,
  imageMessageCost: 10,
  maxMessageLength: 2000,
  maxImageSize: 5 * 1024 * 1024, // 5MB
  ratingPromptInterval: 10, // Show rating modal every N messages
} as const;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// =============================================================================
// VALIDATION
// =============================================================================

const messageSchema = z
  .string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(CONFIG.maxMessageLength, `Message must be less than ${CONFIG.maxMessageLength} characters`);

const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Please select an image file" };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: "Only JPG, PNG, GIF, and WebP images are allowed" };
  }

  if (file.size > CONFIG.maxImageSize) {
    return { valid: false, error: `Image must be less than ${CONFIG.maxImageSize / 1024 / 1024}MB` };
  }

  return { valid: true };
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const LoadingSkeleton = () => (
  <div className="flex flex-col h-full">
    <div className="p-4 border-b border-border flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
    <div className="flex-1 p-4 space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={cn("flex gap-2", i % 2 === 0 && "justify-end")}>
          {i % 2 !== 0 && <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />}
          <Skeleton className={cn("h-16 rounded-2xl", i % 2 === 0 ? "w-48" : "w-56")} />
        </div>
      ))}
    </div>
    <div className="p-4 border-t border-border">
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  </div>
);

interface ChatHeaderProps {
  name: string;
  photo?: string;
  isSeeker: boolean;
  readOnly: boolean;
  onBookVideo: () => void;
}

const ChatHeader = ({ name, photo, isSeeker, readOnly, onBookVideo }: ChatHeaderProps) => (
  <div className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
    <div className="flex items-center gap-3">
      <Avatar className="w-10 h-10 border-2 border-border">
        <AvatarImage src={photo} alt={name} />
        <AvatarFallback className="bg-secondary">
          <User className="w-4 h-4 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div>
        <h3 className="font-semibold">{name}</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </div>
    </div>

    {isSeeker && !readOnly && (
      <Button
        variant="outline"
        size="sm"
        onClick={onBookVideo}
        className="gap-2 border-teal/30 text-teal hover:bg-teal/10 hover:border-teal/50 transition-colors"
      >
        <Video className="w-4 h-4" />
        <span className="hidden sm:inline">Book Video Date</span>
      </Button>
    )}
  </div>
);

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  recipientPhoto?: string;
}

const MessageBubble = ({ message, isMine, recipientPhoto }: MessageBubbleProps) => {
  const formattedTime = useMemo(() => {
    try {
      return format(new Date(message.created_at), "h:mm a");
    } catch {
      return "";
    }
  }, [message.created_at]);

  return (
    <div className={cn("flex gap-2 group", isMine && "justify-end")}>
      {!isMine && (
        <Avatar className="w-8 h-8 shrink-0 opacity-0 group-first:opacity-100">
          <AvatarImage src={recipientPhoto} />
          <AvatarFallback className="bg-secondary">
            <User className="w-3 h-3 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
          isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary rounded-bl-md",
        )}
      >
        {message.message_type === "image" ? (
          <ChatImage content={message.content} alt="Shared image" />
        ) : (
          <p className="break-words whitespace-pre-wrap">{message.content}</p>
        )}

        <div
          className={cn(
            "flex items-center gap-1.5 mt-1.5 text-xs",
            isMine ? "text-primary-foreground/70 justify-end" : "text-muted-foreground",
          )}
        >
          <span>{formattedTime}</span>
          {isMine && (
            <span className="flex items-center">
              {message.read_at ? (
                <CheckCheck className="w-3.5 h-3.5" aria-label="Read" />
              ) : (
                <Check className="w-3.5 h-3.5" aria-label="Sent" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyMessages = () => (
  <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
      <Send className="w-7 h-7 text-primary" />
    </div>
    <p className="text-muted-foreground font-medium">No messages yet</p>
    <p className="text-sm text-muted-foreground mt-1">Say hello to start the conversation!</p>
  </div>
);

interface ReadOnlyFooterProps {}

const ReadOnlyFooter = ({}: ReadOnlyFooterProps) => (
  <div className="p-4 border-t border-border bg-secondary/50">
    <div className="flex items-center justify-center gap-3 text-muted-foreground">
      <Lock className="w-5 h-5" />
      <div className="text-center">
        <p className="font-medium">Alumni Access - Read Only</p>
        <p className="text-sm">You can view but not send messages</p>
      </div>
    </div>
  </div>
);

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onImageClick: () => void;
  disabled: boolean;
  uploading: boolean;
  sending: boolean;
  isSeeker: boolean;
  balance: number;
}

const MessageInput = ({
  value,
  onChange,
  onSend,
  onImageClick,
  disabled,
  uploading,
  sending,
  isSeeker,
  balance,
}: MessageInputProps) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend],
  );

  const isProcessing = sending || uploading;
  const canSend = value.trim().length > 0 && !isProcessing;

  return (
    <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
      {isSeeker && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Gem className="w-3.5 h-3.5 text-primary" />
          <span>{CONFIG.textMessageCost} credits / text</span>
          <span className="text-muted-foreground/40">•</span>
          <span>{CONFIG.imageMessageCost} credits / image</span>
          <span className="ml-auto font-medium">
            Balance: <span className="text-primary">{balance.toLocaleString()}</span>
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onImageClick}
          disabled={isProcessing}
          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
          aria-label="Upload image"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
        </Button>

        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-secondary/80 border-border focus-visible:ring-primary"
          disabled={disabled || isProcessing}
          maxLength={CONFIG.maxMessageLength}
          aria-label="Message input"
        />

        <Button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          size="icon"
          className="bg-primary hover:bg-primary/90 transition-colors"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

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

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [inputValue, setInputValue] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lastRatingCount, setLastRatingCount] = useState(0);
  const [modals, setModals] = useState<ModalState>({
    lowBalance: false,
    buyCredits: false,
    rating: false,
    videoBooking: false,
  });

  // Derived values
  const isSeeker = profile?.user_type === "seeker";
  const balance = wallet?.credit_balance || 0;

  const lastMessageTime = useMemo(() => {
    if (messages.length === 0) return undefined;
    return new Date(messages[messages.length - 1].created_at);
  }, [messages]);

  // Nudge system
  const { activeNudge, dismissNudge, recordNudgeClicked } = useNudges({
    conversationId,
    messageCount: messages.length,
    hasUnlockedImage: messages.some((m) => m.message_type === "image"),
    hasUnlockedVideo: false,
    isCreatorOnline: true,
    lastMessageTime,
  });

  // Modal helpers
  const openModal = useCallback((modal: ModalType) => {
    setModals((prev) => ({ ...prev, [modal]: true }));
  }, []);

  const closeModal = useCallback((modal: ModalType) => {
    setModals((prev) => ({ ...prev, [modal]: false }));
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Show rating modal periodically
  useEffect(() => {
    const currentThreshold = Math.floor(totalMessages / CONFIG.ratingPromptInterval);
    const lastThreshold = Math.floor(lastRatingCount / CONFIG.ratingPromptInterval);

    if (currentThreshold > lastThreshold && totalMessages > 0) {
      openModal("rating");
    }
    setLastRatingCount(totalMessages);
  }, [totalMessages, lastRatingCount, openModal]);

  // Handle sending text message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || sending) return;

    const validation = messageSchema.safeParse(inputValue);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (isSeeker && balance < CONFIG.textMessageCost) {
      openModal("lowBalance");
      return;
    }

    const result = await sendMessage(recipientId, validation.data, conversationId, "text");

    if (result.success) {
      setInputValue("");
      if (!conversationId && result.conversationId) {
        onNewConversation?.(result.conversationId);
      }
    } else if (result.error === "Insufficient credits") {
      openModal("lowBalance");
    } else {
      toast.error(result.error || "Failed to send message");
    }
  }, [inputValue, sending, isSeeker, balance, recipientId, conversationId, sendMessage, onNewConversation, openModal]);

  // Handle image upload
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      if (isSeeker && balance < CONFIG.imageMessageCost) {
        openModal("lowBalance");
        return;
      }

      setUploadingImage(true);

      try {
        const timestamp = Date.now();
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${user.id}/${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("chat-images")
          .upload(filePath, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        const result = await sendMessage(recipientId, filePath, conversationId, "image");

        if (result.success) {
          if (!conversationId && result.conversationId) {
            onNewConversation?.(result.conversationId);
          }
        } else if (result.error === "Insufficient credits") {
          openModal("lowBalance");
        } else {
          toast.error(result.error || "Failed to send image");
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        toast.error("Failed to upload image. Please try again.");
      } finally {
        setUploadingImage(false);
      }
    },
    [user, isSeeker, balance, recipientId, conversationId, sendMessage, onNewConversation, openModal],
  );

  // Handle nudge actions
  const handleNudgeAction = useCallback(() => {
    if (!activeNudge) return;

    recordNudgeClicked(activeNudge);

    switch (activeNudge) {
      case "low_credits":
        openModal("buyCredits");
        break;
      case "video_unlock":
      case "online_availability":
        openModal("videoBooking");
        break;
      case "image_unlock":
        fileInputRef.current?.click();
        break;
    }
  }, [activeNudge, recordNudgeClicked, openModal]);

  // Loading state
  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        name={recipientName}
        photo={recipientPhoto}
        isSeeker={isSeeker}
        readOnly={readOnly}
        onBookVideo={() => openModal("videoBooking")}
      />

      {/* Nudge Banner */}
      {activeNudge && !readOnly && (
        <ChatNudge type={activeNudge} onAction={handleNudgeAction} onDismiss={() => dismissNudge(activeNudge)} />
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <EmptyMessages />
        ) : (
          <div className="space-y-3" role="log" aria-label="Chat messages">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isMine={message.sender_id === user?.id}
                recipientPhoto={recipientPhoto}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      {readOnly ? (
        <ReadOnlyFooter />
      ) : (
        <>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            className="hidden"
            aria-hidden="true"
          />
          <MessageInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            onImageClick={() => fileInputRef.current?.click()}
            disabled={false}
            uploading={uploadingImage}
            sending={sending}
            isSeeker={isSeeker}
            balance={balance}
          />
        </>
      )}

      {/* Modals */}
      <LowBalanceModal
        open={modals.lowBalance}
        onOpenChange={(open) => (open ? openModal("lowBalance") : closeModal("lowBalance"))}
        currentBalance={balance}
        requiredCredits={CONFIG.imageMessageCost}
        onBuyCredits={() => {
          closeModal("lowBalance");
          openModal("buyCredits");
        }}
      />

      <BuyCreditsModal
        open={modals.buyCredits}
        onOpenChange={(open) => (open ? openModal("buyCredits") : closeModal("buyCredits"))}
      />

      <RatingModal
        open={modals.rating}
        onOpenChange={(open) => (open ? openModal("rating") : closeModal("rating"))}
        ratedUserId={recipientId}
        ratedUserName={recipientName}
        conversationId={conversationId || undefined}
      />

      <BookVideoDateModal
        open={modals.videoBooking}
        onOpenChange={(open) => (open ? openModal("videoBooking") : closeModal("videoBooking"))}
        conversationId={conversationId}
        earnerId={recipientId}
        earnerName={recipientName}
        video15Rate={video15Rate}
        video30Rate={video30Rate}
        video60Rate={video60Rate}
        video90Rate={video90Rate}
      />
    </div>
  );
}
