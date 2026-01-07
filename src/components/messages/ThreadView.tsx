import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useGiftTransactions } from "@/hooks/useGifts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { z } from "zod";

import ThreadHeader from "./ThreadHeader";
import MessageList from "./MessageList";
import Composer from "./Composer";
import LowBalanceModal from "@/components/credits/LowBalanceModal";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";
import RatingModal from "@/components/ratings/RatingModal";
import BookVideoDateModal from "@/components/video/BookVideoDateModal";
import MobileGiftSheet from "@/components/gifts/MobileGiftSheet"; // ✅ NEW IMPORT
import GiftAnimation from "@/components/gifts/GiftAnimation";

const messageSchema = z
  .string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(2000, "Message must be less than 2000 characters");

interface ThreadViewProps {
  conversationId: string | null;
  recipientId: string;
  recipientName: string;
  recipientPhoto?: string;
  recipientUserType?: "seeker" | "earner";
  isOnline?: boolean;
  onBack: () => void;
  onNewConversation?: (conversationId: string) => void;
  totalMessages?: number;
  video15Rate?: number;
  video30Rate?: number;
  video60Rate?: number;
  video90Rate?: number;
  readOnly?: boolean;
  showBackOnDesktop?: boolean;
}

export default function ThreadView({
  conversationId,
  recipientId,
  recipientName,
  recipientPhoto,
  recipientUserType,
  isOnline,
  onBack,
  onNewConversation,
  totalMessages = 0,
  video15Rate = 75,
  video30Rate = 150,
  video60Rate = 300,
  video90Rate = 450,
  readOnly = false,
  showBackOnDesktop = false,
}: ThreadViewProps) {
  const { user, profile } = useAuth();
  const { wallet } = useWallet();
  const { messages, loading } = useMessages(conversationId);
  const { sendMessage, sending } = useSendMessage();
  const { transactions: giftTransactions, updateThankYouReaction } = useGiftTransactions(conversationId);

  // State
  const [inputValue, setInputValue] = useState("");
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showVideoBooking, setShowVideoBooking] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false); // Reused for MobileGiftSheet
  const [giftAnimation, setGiftAnimation] = useState<{emoji: string; type: 'standard' | 'premium' | 'ultra'} | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [unlockingImage, setUnlockingImage] = useState<string | null>(null);
  const [unlockedImages, setUnlockedImages] = useState<Set<string>>(new Set());
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  const isSeeker = profile?.user_type === "seeker";
  const isEarner = profile?.user_type === "earner";

  const TEXT_MESSAGE_COST = 5;
  const IMAGE_MESSAGE_COST = 10;

  // Real-time gift animation for earners
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

  // Typing indicator
  const { isRecipientTyping, handleTyping, stopTyping } = useTypingIndicator(
    conversationId || null,
    user?.id,
    recipientId
  );

  // Fetch unlocked images
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

  // Scroll to bottom on initial load and conversation change
  useLayoutEffect(() => {
    if (!loading && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [loading, conversationId]);

  // Auto-scroll on new messages only if near bottom
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isNearBottom]);

  // Scroll handler
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsNearBottom(nearBottom);
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    } else if (result.error === "Insufficient credits") {
      setShowLowBalance(true);
    } else {
      toast.error(result.error || "Failed to send message");
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    handleTyping();
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
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }, 100);
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

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-[#0a0a0f] relative" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-full bg-white/5 border border-white/5" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 bg-white/5" />
            <Skeleton className="h-3 w-20 bg-white/5" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4 bg-[#0a0a0f]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn("flex gap-2", i % 2 === 0 && "justify-end")}>
              <Skeleton className={cn(
                "h-16 rounded-2xl border border-white/5", 
                i % 2 === 0 ? "w-48 bg-gradient-to-br from-rose-500/10 to-purple-500/10" : "w-56 bg-white/5"
              )} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] relative" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sticky Header */}
      <ThreadHeader
        recipientId={recipientId}
        recipientName={recipientName}
        recipientPhoto={recipientPhoto}
        isOnline={isOnline}
        onBack={onBack}
        onVideoBooking={isSeeker ? () => setShowVideoBooking(true) : undefined}
        showBack={showBackOnDesktop !== false}
        isSeeker={isSeeker}
        readOnly={readOnly}
      />

      {/* Messages - THE ONLY SCROLL CONTAINER */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative"
        onScroll={handleScroll}
      >
        <MessageList
          ref={messagesEndRef}
          messages={messages}
          giftTransactions={giftTransactions}
          userId={user?.id}
          recipientName={recipientName}
          recipientPhoto={recipientPhoto}
          recipientUserType={recipientUserType}
          isSeeker={isSeeker}
          unlockedImages={unlockedImages}
          unlockingImage={unlockingImage}
          onUnlockImage={handleUnlockImage}
          onReact={updateThankYouReaction}
          isRecipientTyping={isRecipientTyping}
        />
      </div>

      {/* Jump to latest button */}
      {showScrollDown && (
        <Button
          onClick={scrollToBottom}
          size="sm"
          className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 shadow-2xl backdrop-blur-xl gap-1.5 z-20 transition-all duration-300 hover:scale-105"
        >
          <ArrowDown className="w-4 h-4" />
          <span className="text-xs font-medium">Jump to latest</span>
        </Button>
      )}

      {/* Sticky Composer */}
      <Composer
        value={inputValue}
        onChange={handleInputChange}
        onSend={handleSend}
        onImageUpload={handleImageUpload}
        onGiftClick={isSeeker ? () => setShowGiftModal(true) : undefined}
        sending={sending}
        uploadingImage={uploadingImage}
        isSeeker={isSeeker}
        readOnly={readOnly}
        creditBalance={wallet?.credit_balance || 0}
        textCost={TEXT_MESSAGE_COST}
        imageCost={IMAGE_MESSAGE_COST}
      />

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

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

      {/* --- NEW MOBILE FIRST GIFT SHEET --- */}
      <MobileGiftSheet 
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        recipientId={recipientId}
        recipientName={recipientName}
        conversationId={conversationId}
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
