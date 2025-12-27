import { useState, useRef, useEffect } from 'react';
import { Message, useSendMessage } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Send, Image as ImageIcon, Gem, User, Loader2, Check, CheckCheck, Video } from 'lucide-react';
import { toast } from 'sonner';
import LowBalanceModal from '@/components/credits/LowBalanceModal';
import BuyCreditsModal from '@/components/credits/BuyCreditsModal';
import RatingModal from '@/components/ratings/RatingModal';
import BookVideoDateModal from '@/components/video/BookVideoDateModal';
import { z } from 'zod';

// Message validation schema
const messageSchema = z.string()
  .trim()
  .min(1, 'Message cannot be empty')
  .max(2000, 'Message must be less than 2000 characters');

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
  readOnly = false
}: ChatWindowProps) {
  const { user, profile } = useAuth();
  const { wallet } = useWallet();
  const { sendMessage, sending } = useSendMessage();
  const [inputValue, setInputValue] = useState('');
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showVideoBooking, setShowVideoBooking] = useState(false);
  const [lastRatingCount, setLastRatingCount] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSeeker = profile?.user_type === 'seeker';
  const TEXT_MESSAGE_COST = 5;
  const IMAGE_MESSAGE_COST = 10;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Show rating modal every 10 messages
  useEffect(() => {
    const currentCount = totalMessages;
    const ratingThreshold = Math.floor(currentCount / 10);
    const lastThreshold = Math.floor(lastRatingCount / 10);
    
    if (ratingThreshold > lastThreshold && currentCount > 0) {
      setShowRating(true);
    }
    setLastRatingCount(currentCount);
  }, [totalMessages, lastRatingCount]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    // Validate message content
    const validation = messageSchema.safeParse(inputValue);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Check balance for seekers
    if (isSeeker && (wallet?.credit_balance || 0) < TEXT_MESSAGE_COST) {
      setShowLowBalance(true);
      return;
    }

    const result = await sendMessage(recipientId, validation.data, conversationId, 'text');

    if (result.success) {
      setInputValue('');
      if (!conversationId && result.conversationId) {
        onNewConversation?.(result.conversationId);
      }
    } else if (result.error === 'Insufficient credits') {
      setShowLowBalance(true);
    } else {
      toast.error(result.error || 'Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Check balance for seekers
    if (isSeeker && (wallet?.credit_balance || 0) < IMAGE_MESSAGE_COST) {
      setShowLowBalance(true);
      return;
    }

    setUploadingImage(true);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/${timestamp}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);

      // Send message with image URL
      const result = await sendMessage(recipientId, publicUrl, conversationId, 'image');

      if (result.success) {
        if (!conversationId && result.conversationId) {
          onNewConversation?.(result.conversationId);
        }
      } else if (result.error === 'Insufficient credits') {
        setShowLowBalance(true);
      } else {
        toast.error(result.error || 'Failed to send image');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("flex gap-2", i % 2 === 0 && "justify-end")}>
              <Skeleton className={cn("h-16 rounded-xl", i % 2 === 0 ? "w-48" : "w-56")} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-border">
            <AvatarImage src={recipientPhoto} alt={recipientName} />
            <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{recipientName}</h3>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
        
        {/* Video Date Button - Only for seekers (not in read-only mode) */}
        {isSeeker && !readOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVideoBooking(true)}
            className="gap-2 border-teal/30 text-teal hover:bg-teal/10 hover:border-teal/50"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Book Video Date</span>
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No messages yet. Say hello!</p>
            </div>
          )}
          {messages.map((message) => {
            const isMine = message.sender_id === user?.id;
            return (
              <div 
                key={message.id}
                className={cn("flex gap-2", isMine && "justify-end")}
              >
                {!isMine && (
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={recipientPhoto} />
                    <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2",
                    isMine 
                      ? "bg-primary text-primary-foreground rounded-br-sm" 
                      : "bg-secondary rounded-bl-sm"
                  )}
                >
                  {message.message_type === 'image' ? (
                      <img 
                        src={message.content} 
                        alt="Shared image" 
                        className="rounded-lg max-w-xs max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(message.content, '_blank')}
                      />
                  ) : (
                    <p className="break-words">{message.content}</p>
                  )}
                  <div className={cn(
                    "flex items-center gap-1 mt-1 text-xs",
                    isMine ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
                  )}>
                    <span>{format(new Date(message.created_at), 'h:mm a')}</span>
                    {isMine && (
                      message.read_at 
                        ? <CheckCheck className="w-3 h-3" />
                        : <Check className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      {readOnly ? (
        <div className="p-4 border-t border-border bg-secondary/50">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <span className="text-lg">🔒</span>
            <div className="text-center">
              <p className="font-medium">Alumni Access - Read Only</p>
              <p className="text-sm">You can view but not send messages</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-border bg-card/50">
          {isSeeker && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Gem className="w-3 h-3 text-primary" />
              <span>{TEXT_MESSAGE_COST} credits / text</span>
              <span className="text-muted-foreground/50">•</span>
              <span>{IMAGE_MESSAGE_COST} credits / image</span>
              <span className="text-muted-foreground/50">•</span>
              <span>Balance: {wallet?.credit_balance?.toLocaleString() || 0}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploadingImage}
              className="shrink-0 text-muted-foreground hover:text-primary"
            >
              {uploadingImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5" />
              )}
            </Button>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-secondary border-border"
              disabled={sending || uploadingImage}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || sending || uploadingImage}
              size="icon"
              className="bg-primary hover:bg-primary/90"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}

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

      <BuyCreditsModal
        open={showBuyCredits}
        onOpenChange={setShowBuyCredits}
      />

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
    </div>
  );
}