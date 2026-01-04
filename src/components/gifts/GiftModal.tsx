import { useState } from 'react';
import { useGifts, useSendGift } from '@/hooks/useGifts';
import { useWallet } from '@/hooks/useWallet';
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
import { Gem, Loader2, Sparkles, Gift as GiftIcon } from 'lucide-react';
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

  const selectedGift = gifts.find(g => g.id === selectedGiftId);
  const balance = wallet?.credit_balance || 0;
  const hasEnoughCredits = selectedGift ? balance >= selectedGift.credits_cost : true;

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
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
        </div>
      ) : (
        <>
          {/* Balance indicator */}
          <div className={cn(
            "flex items-center justify-between p-3 rounded-xl border",
            balance < 100 
              ? "bg-amber-500/10 border-amber-500/30 animate-pulse" 
              : "bg-white/5 border-white/10"
          )}>
            <span className="text-sm text-white/60">Your Balance</span>
            <div className="flex items-center gap-1.5">
              <Gem className={cn("w-4 h-4", balance < 100 ? "text-amber-400" : "text-purple-400")} />
              <span className={cn("font-semibold", balance < 100 ? "text-amber-400" : "text-white")}>
                {balance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Gift grid */}
          <div className="grid grid-cols-3 gap-3">
            {gifts.map((gift) => {
              const isSelected = selectedGiftId === gift.id;
              const canAfford = balance >= gift.credits_cost;
              
              return (
                <button
                  key={gift.id}
                  onClick={() => setSelectedGiftId(gift.id)}
                  disabled={!canAfford}
                  className={cn(
                    "relative p-4 rounded-xl border transition-all duration-200",
                    "flex flex-col items-center gap-2",
                    isSelected
                      ? "border-rose-500 bg-rose-500/20 scale-105"
                      : canAfford
                        ? "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                        : "border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed",
                    gift.animation_type === 'premium' && "ring-1 ring-purple-500/30",
                    gift.animation_type === 'ultra' && "ring-2 ring-amber-500/50"
                  )}
                >
                  {/* Premium/Ultra badge */}
                  {gift.animation_type !== 'standard' && (
                    <div className={cn(
                      "absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                      gift.animation_type === 'premium' 
                        ? "bg-purple-500 text-white" 
                        : "bg-gradient-to-r from-amber-400 to-orange-500 text-black"
                    )}>
                      {gift.animation_type === 'premium' ? '✨' : '👑'}
                    </div>
                  )}
                  
                  <span className="text-3xl animate-float" style={{ animationDelay: `${Math.random() * 2}s` }}>
                    {gift.emoji}
                  </span>
                  <span className="text-xs font-medium text-white/80">{gift.name}</span>
                  <div className="flex items-center gap-1 text-xs text-white/50">
                    <Gem className="w-3 h-3" />
                    {gift.credits_cost}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Message input */}
          {selectedGift && (
            <div className="space-y-2 animate-fade-in">
              <label className="text-sm text-white/60">Add a message (optional)</label>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 100))}
                placeholder="Say something sweet..."
                maxLength={100}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <p className="text-xs text-white/40 text-right">{message.length}/100</p>
            </div>
          )}

          {/* Send button */}
          {selectedGift && (
            <div className="pt-2">
              <Button
                onClick={handleSend}
                disabled={sending || !hasEnoughCredits}
                className={cn(
                  "w-full h-12 text-lg font-semibold rounded-xl transition-all",
                  hasEnoughCredits
                    ? "bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                )}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : hasEnoughCredits ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Send {selectedGift.emoji} {selectedGift.name}
                    <span className="ml-2 text-white/70">({selectedGift.credits_cost} credits)</span>
                  </>
                ) : (
                  <>
                    <Gem className="w-5 h-5 mr-2" />
                    Need {selectedGift.credits_cost - balance} more credits
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Mobile: use bottom drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="bg-[#0a0a0f] border-white/10">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 text-white">
              <GiftIcon className="w-5 h-5 text-rose-400" />
              Send a Gift to {recipientName}
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8">
            {Content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: use dialog
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0f] border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <GiftIcon className="w-5 h-5 text-rose-400" />
            Send a Gift to {recipientName}
          </DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
