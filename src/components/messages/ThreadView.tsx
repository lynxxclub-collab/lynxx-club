import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowDown } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useGiftTransactions } from "@/hooks/useGifts";
import { supabase } from "@/integrations/supabase/client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import ThreadHeader from "./ThreadHeader";
import MessageList from "./MessageList";
import Composer from "./Composer";

import LowBalanceModal from "@/components/credits/LowBalanceModal";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";
import RatingModal from "@/components/ratings/RatingModal";
import BookVideoDateModal from "@/components/video/BookVideoDateModal";
import GiftModal from "@/components/gifts/GiftModal";
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

  const isSeeker = profile?.user_type === "seeker";
  const isEarner = profile?.user_type === "earner";

  const TEXT_MESSAGE_COST = 5;
  const IMAGE_MESSAGE_COST = 10;

  // UI state
  const [inputValue, setInputValue] = useState("");
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showVideoBooking, setShowVideoBooking] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);

  const [giftAnimation, setGiftAnimation] = useState<{
    emoji: string;
    type: "standard" | "premium" | "ultra";
  } | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [unlockingImage, setUnlockingImage] = useState<string | null>(null);
  const [unlockedImages, setUnlockedImages] = useState<Set<string>>(new Set());

  // scroll state
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // Typing indicator
  const { isRecipientTyping, handleTyping, stopTyping } = useTypingIndicator(
    conversationId || null,
    user?.id,
    recipientId,
  );

  // ========= Helpers =========
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const validateCanSpend = useCallback(
    (cost: number) => {
      if (!isSeeker) return true;
      const bal = wallet?.credit_balance || 0;
      if (bal < cost) {
        setShowLowBalance(true);
        return false;
      }
      return true;
    },
    [isSeeker, wallet?.credit_balance],
  );

  // ========= Presence scroll tracking =========
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollHeight, scrollTop, clientHeight } = el;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    const nearBottom = distanceFromBottom < 120;
    setIsNearBottom(nearBottom);
    setShowScrollDown(distanceFromBottom > 240);
  }, []);

  // ========= Initial scroll on conversation change =========
  useLayoutEffect(() => {
    if (!loading) {
      // reset prior length so we don't treat initial load as "new messages"
      prevMessagesLengthRef.current = messages.length;
      // snap to bottom on conversation change
      scrollToBottom("auto");
      // also reset UI bits that often “stick” between threads
      setInputValue("");
      setShowScrollDown(false);
      setIsNearBottom(true);
    }
  }, [conversationId, loading, scrollToBottom]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========= Auto-scroll ONLY when already near bottom =========
  useEffect(() => {
    const prev = prevMessagesLengthRef.current;
    const next = messages.length;
    if (next > prev && isNearBottom) {
      scrollToBottom("auto");
    }
    prevMessagesLengthRef.current = next;
  }, [messages.length, isNearBottom, scrollToBottom]);

  // ========= Gift animation realtime (earners) =========
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
          if (payload.new.conversation_id !== conversationId) return;

          const { data: gift, error } = await supabase
            .from("gift_catalog")
            .select("emoji, animation_type")
            .eq("id", payload.new.gift_id)
            .single();

          if (error || !gift) return;

          setGiftAnimation({
            emoji: gift.emoji,
            type: gift.animation_type as "standard" | "premium" | "ultra",
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isEarner, conversationId]);

  // ========= Fetch unlocked images (dedup + cancel-safe) =========
  const imageMessageIds = useMemo(
    () => messages.filter((m) => m.message_type === "image").map((m) => m.id),
    [messages],
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user?.id || imageMessageIds.length === 0) return;

      const { data, error } = await supabase
        .from("image_unlocks")
        .select("message_id")
        .eq("unlocked_by", user.id)
        .in("message_id", imageMessageIds);

      if (cancelled) return;
      if (error || !data) return;

      setUnlockedImages(new Set(data.map((d) => d.message_id)));
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user?.id, imageMessageIds]);

  // ========= Actions =========
  const handleSend = useCallback(async () => {
    if (readOnly) return;
    if (!inputValue.trim() || sending) return;

    const validation = messageSchema.safeParse(inputValue);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (!validateCanSpend(TEXT_MESSAGE_COST)) return;

    stopTyping();

    const result = await sendMessage(recipientId, validation.data, conversationId, "text");

    if (result.success) {
      setInputValue("");
      if (!conversationId && result.conversationId) {
        onNewConversation?.(result.conversationId);
      }
      // snap after DOM paint
      requestAnimationFrame(() => scrollToBottom("auto"));
    } else if (result.error === "Insufficient credits") {
      setShowLowBalance(true);
    } else {
      toast.error(result.error || "Failed to send message");
    }
  }, [
    readOnly,
    inputValue,
    sending,
    validateCanSpend,
    stopTyping,
    sendMessage,
    recipientId,
    conversationId,
    onNewConversation,
    scrollToBottom,
  ]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      handleTyping();
    },
    [handleTyping],
  );

  const handleUnlockImage = useCallback(
    async (messageId: string) => {
      if (readOnly) return;
      if (!validateCanSpend(IMAGE_MESSAGE_COST)) return;

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
        console.error("unlock_image error:", err);
        toast.error("Failed to unlock image");
      } finally {
        setUnlockingImage(null);
      }
    },
    [readOnly, validateCanSpend],
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (readOnly) return;

      const file = e.target.files?.[0];
      if (!file || !user) return;

      // clear input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      if (!validateCanSpend(IMAGE_MESSAGE_COST)) return;

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
          requestAnimationFrame(() => scrollToBottom("auto"));
        } else if (result.error === "Insufficient credits") {
          setShowLowBalance(true);
        } else {
          toast.error(result.error || "Failed to send image");
        }
      } catch (err: any) {
        console.error("upload image error:", err);
        toast.error(err?.message || "Failed to upload image");
      } finally {
        setUploadingImage(false);
      }
    },
    [
      readOnly,
      user,
      validateCanSpend,
      sendMessage,
      recipientId,
      conversationId,
      onNewConversation,
      scrollToBottom,
    ],
  );

  // ========= Loading UI =========
  if (loading) {
    return (
      <div className="h-full flex flex-col bg-transparent">
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full bg-white/5" />
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
    <div className="h-full flex flex-col bg-transparent relative" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <ThreadHeader
        recipientId={recipientId}
        recipientName={recipientName}
        recipientPhoto={recipientPhoto}
        isOnline={isOnline}
        onBack={onBack}
        onVideoBooking={isSeeker && !readOnly ? () => setShowVideoBooking(true) : undefined}
        showBack={showBackOnDesktop !== false}
        isSeeker={isSeeker}
        readOnly={readOnly}
      />

      {/* THE scroll container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        <MessageList
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
        {/* bottom sentinel */}
        <div ref={bottomRef} />
      </div>

      {showScrollDown && (
        <Button
          onClick={() => scrollToBottom("smooth")}
          size="sm"
          className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-lg backdrop-blur-xl gap-1 z-20"
        >
          <ArrowDown className="w-4 h-4" />
          Jump to latest
        </Button>
      )}

      <Composer
        value={inputValue}
        onChange={handleInputChange}
        onSend={handleSend}
        onImageUpload={handleImageUpload}
        onGiftClick={isSeeker && !readOnly ? () => setShowGiftModal(true) : undefined}
        sending={sending}
        uploadingImage={uploadingImage}
        isSeeker={isSeeker}
        readOnly={readOnly}
        creditBalance={wallet?.credit_balance || 0}
        textCost={TEXT_MESSAGE_COST}
        imageCost={IMAGE_MESSAGE_COST}
      />

      {/* Keep ONE file input (Composer already has one, but if you're using this, remove Composer's) */}
      <input ref={fileInputRef} type="file" onChange={handleImageUpload} accept="image/*" className="hidden" />

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