import { useState, useEffect } from 'react';
import { useGifts, useSendGift } from '@/hooks/useGifts';
import { useWallet } from '@/hooks/useWallet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gem, Loader2, Sparkles, Gift as GiftIcon, Send, Crown, Wand2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface GiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  recipientName: string;
  conversationId: string | null;
  onGiftSent?: (result: {
    gift_name: string;
    gift_emoji: string;
    animation_type: 'standard' | 'premium' | 'ultra';
    message?: string;
  }) => void;
  onLowBalance?: () => void;
}

export default function GiftModal({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  conversationId,
  onGiftSent,
  onLowBalance
}: GiftModalProps) {
  const { gifts, loading } = useGifts();
  const { sendGift, sending } = useSendGift();
  const { wallet, refetch } = useWallet();
  const isMobile = useIsMobile();
  
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isPollingBalance, setIsPollingBalance] = useState(false);

  const selectedGift = gifts.find(g => g.id === selectedGiftId);
  const balance = wallet?.credit_balance || wallet?.current_balance_credits || 0;
  const hasEnoughCredits = selectedGift ? balance >= selectedGift.credits_cost : true;
  const isDeficit = balance < 50; // Warn user if very low

  // Poll wallet balance while modal is open
  useEffect(() => {
    if (open) {
      refetch();
      
      const interval = setInterval(() => {
        setIsPollingBalance(true);
        refetch().finally(() => setIsPollingBalance(false));
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [open, refetch]);

  const handleSend = async () => {
    if (!selectedGiftId || !selectedGift) {
      toast.error('Please select a gift');
      return;
    }

    if (!hasEnoughCredits) {
      onLowBalance?.();
      return;
    }

    const result = await sendGift(recipientId, selectedGiftId, conversationId, message);

    if (result.success) {
      toast.success(`Sent ${result.gift_emoji} ${result.gift_name} to ${recipientName}!`);
      refetch();
      onGiftSent?.({
        gift_name: result.gift_name!,
        gift_emoji: result.gift_emoji!,
        animation_type: result.animation_type!,
        message: message || undefined
      });
      setSelectedGiftId(null);
      setMessage('');
      onOpenChange(false);
    } else if (result.error === 'Insufficient credits') {
      onLowBalance?.();
    } else {
      toast.error(result.error || 'Failed to send gift');
    }
  };

  const handleClose = () => {
    setSelectedGiftId(null);
    setMessage('');
    onOpenChange(false);
  };

  const Content = (
    <div className="flex flex-col h-full">
      {/* Header: Balance */}
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl border mb-4 transition-colors",
        isDeficit
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-white/5 border-white/10"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            isDeficit ? "bg-amber-500/20" : "bg-purple-500/20"
          )}>
            <Gem className={cn("w-5 h-5", isDeficit ? "text-amber-400 animate-pulse" : "text-purple-400")} />
          </div>
          <div>
            <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Your Balance</div>
            <div className={cn("font-bold text-lg text-white", isPollingBalance && "opacity-70")}>
              {balance.toLocaleString()}
            </div>
          </div>
        </div>
        {isPollingBalance && <Loader2 className="w-4 h-4 text-white/30 animate-spin" />}
      </div>

      {/* Gift Grid */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
            </div>
          ) : (
            // Added pb-32 to prevent last row being hidden behind sticky footer on mobile
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pb-32 sm:pb-0">
              {gifts.map((gift) => {
                const isSelected = selectedGiftId === gift.id;
                const canAfford = balance >= gift.credits_cost;
                
                return (
                  <button
                    key={gift.id}
                    onClick={() => setSelectedGiftId(gift.id)}
                    disabled={!canAfford}
                    className={cn(
                      "group relative p-3 sm:p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2",
                      "active:scale-[0.95]",
                      isSelected
                        ? "border-rose-500 bg-gradient-to-br from-rose-500/20 to-purple-500/20 shadow-[0_0_20px_-5px_rgba(244,63,94,0.3)] scale-105 z-10"
                        : canAfford
                          ? "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                          : "border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed",
                      gift.animation_type === 'premium' && "ring-1 ring-purple-500/30",
                      gift.animation_type === 'ultra' && "ring-2 ring-amber-500/50"
                    )}
                  >
                    {/* Badges */}
                    {gift.animation_type === 'premium' && !isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[10px] shadow-lg shadow-purple-500/20">
                        <Wand2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {gift.animation_type === 'ultra' && !isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[10px] shadow-lg shadow-amber-500/20">
                        <Crown className="w-3 h-3 text-black" />
                      </div>
                    )}
                    
                    {/* Emoji */}
                    <div className="relative">
                      <span className="text-3xl sm:text-4xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-300">
                        {gift.emoji}
                      </span>
                      {isSelected && (
                        <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping opacity-75" />
                      )}
                    </div>
                    
                    {/* Name */}
                    <span className="text-xs font-semibold text-white/80 text-center line-clamp-1 w-full">
                      {gift.name}
                    </span>
                    
                    {/* Cost */}
                    <div className="flex items-center gap-1 text-xs font-medium">
                      <Gem className="w-3 h-3 text-white/40" />
                      <span className={cn(canAfford ? "text-white/60" : "text-red-400/50")}>
                        {gift.credits_cost}
                      </span>
                    </div>

                    {/* Checkmark for selected */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-[10px] text-white shadow-lg shadow-rose-500/30">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Sticky Footer: Input & Send */}
      {selectedGift && (
        <div className={cn(
          "mt-4 space-y-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
          // Mobile: Absolute positioning over the scroll area
          isMobile && "absolute bottom-0 left-0 right-0 p-4 bg-[#0a0a0f]/95 backdrop-blur-md border-t border-white/10 z-20"
        )}>
          <div className="space-y-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 100))}
              placeholder="Add a sweet note (optional)..."
              maxLength={100}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 focus-visible:ring-rose-500/50"
            />
            <div className="flex justify-end px-1">
              <span className="text-[10px] text-white/30 font-mono">{message.length}/100</span>
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={sending || !hasEnoughCredits}
            className={cn(
              "w-full h-12 text-base font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98]",
              hasEnoughCredits
                ? "bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white shadow-rose-500/20"
                : "bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20"
            )}
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending...
              </>
            ) : hasEnoughCredits ? (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send {selectedGift.emoji} {selectedGift.name}
                <span className="ml-auto text-white/70 text-xs font-normal px-2 py-0.5 rounded bg-black/20">
                  -{selectedGift.credits_cost}
                </span>
              </>
            ) : (
              <>
                <Gem className="w-5 h-5 mr-2" />
                Need {selectedGift.credits_cost - balance} credits
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );

  // Mobile: use bottom drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="bg-[#0a0a0f] border-white/10 h-[85vh] pb-0">
          <DrawerHeader className="text-left pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 rounded-lg">
                <GiftIcon className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <DrawerTitle className="text-white text-lg font-medium">Send a Gift</DrawerTitle>
                <p className="text-sm text-white/50">To {recipientName}</p>
              </div>
            </div>
          </DrawerHeader>
          <div className="h-full overflow-hidden pt-4 relative">
            {Content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: use dialog
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0f] border-white/10 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <GiftIcon className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <DialogTitle className="text-white">Send a Gift</DialogTitle>
              <p className="text-sm text-white/50">To {recipientName}</p>
            </div>
          </div>
        </DialogHeader>
        <div className="p-6">
          {Content}
        </div>
      </DialogContent>
    </Dialog>
  );
}