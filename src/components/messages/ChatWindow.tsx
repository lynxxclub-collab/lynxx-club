import { useState, useRef, useEffect } from 'react';
import { Message, useSendMessage } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
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

interface ChatWindowProps {
  messages: Message[];
  loading: boolean;
  conversationId: string | null;
  recipientId: string;
  recipientName: string;
  recipientPhoto?: string;
  onNewConversation?: (conversationId: string) => void;
  totalMessages?: number;
  video30Rate?: number;
  video60Rate?: number;
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
  video30Rate = 300,
  video60Rate = 500
}: ChatWindowProps) {
  const { user, profile } = useAuth();
  const { sendMessage, sending } = useSendMessage();
  const [inputValue, setInputValue] = useState('');
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showVideoBooking, setShowVideoBooking] = useState(false);
  const [lastRatingCount, setLastRatingCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isSeeker = profile?.user_type === 'seeker';
  const MESSAGE_COST = 20;

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

    // Check balance for seekers
    if (isSeeker && (profile?.credit_balance || 0) < MESSAGE_COST) {
      setShowLowBalance(true);
      return;
    }

    const result = await sendMessage(recipientId, inputValue.trim(), conversationId);

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
        
        {/* Video Date Button - Only for seekers */}
        {isSeeker && (
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
                      className="rounded-lg max-w-full"
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
      <div className="p-4 border-t border-border bg-card/50">
        {isSeeker && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Gem className="w-3 h-3 text-primary" />
            <span>{MESSAGE_COST} credits per message</span>
            <span className="text-muted-foreground/50">•</span>
            <span>Balance: {profile?.credit_balance?.toLocaleString() || 0}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-secondary border-border"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
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

      <LowBalanceModal
        open={showLowBalance}
        onOpenChange={setShowLowBalance}
        currentBalance={profile?.credit_balance || 0}
        requiredCredits={MESSAGE_COST}
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
        video30Rate={video30Rate}
        video60Rate={video60Rate}
      />
    </div>
  );
}