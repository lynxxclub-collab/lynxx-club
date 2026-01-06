import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Gem, ArrowRight, Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LowBalanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  requiredCredits: number;
  onBuyCredits: () => void;
  onRetry?: () => void; // Optional callback if balance updates
}

export default function LowBalanceModal({ 
  open, 
  onOpenChange, 
  currentBalance: initialBalance, 
  requiredCredits,
  onBuyCredits,
  onRetry
}: LowBalanceModalProps) {
  const { user } = useAuth();
  const [currentBalance, setCurrentBalance] = useState(initialBalance);
  const [isBuying, setIsBuying] = useState(false);
  
  const deficit = requiredCredits - currentBalance;
  const canRetry = deficit <= 0;

  // REAL-TIME: Listen for wallet updates while modal is open
  useEffect(() => {
    setCurrentBalance(initialBalance); // Sync with prop on open
  }, [initialBalance, open]);

  useEffect(() => {
    if (!open || !user) return;

    const channel = supabase
      .channel(`wallet_balance_modal_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newBalance = payload.new.current_balance_credits;
          setCurrentBalance(newBalance);
          
          // If balance hits requirement, notify user
          if (newBalance >= requiredCredits) {
            toast.success("Balance updated! You can now send your message.");
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [open, user, requiredCredits]);

  const handleRetry = () => {
    onOpenChange(false);
    onRetry?.();
  };

  const handleBuy = () => {
    setIsBuying(true);
    onBuyCredits();
    // Note: We don't set buying to false here because the onBuyCredits usually navigates away
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0f] border-white/10 p-0 overflow-hidden">
        
        {/* Header with Alert Visual */}
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 p-6 pb-8 text-center border-b border-white/5">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-orange-500/20 border-2 border-orange-500/50 flex items-center justify-center">
              <Gem className="w-10 h-10 text-orange-400 fill-orange-400/20" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            Insufficient Credits
          </h2>
          <p className="text-sm text-white/60">
            You need more credits to complete this action.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Balance Comparison Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="grid grid-cols-2 gap-4 divide-x divide-white/10">
              
              {/* Current Balance */}
              <div className="text-center">
                <p className="text-xs uppercase text-white/40 font-bold tracking-wider mb-1">Your Balance</p>
                <div className="flex items-center justify-center gap-1.5 text-xl font-bold text-white">
                  <Gem className="w-4 h-4 text-white/50" />
                  {currentBalance.toLocaleString()}
                </div>
              </div>

              {/* Required Balance */}
              <div className="text-center">
                <p className="text-xs uppercase text-white/40 font-bold tracking-wider mb-1">Required</p>
                <div className="flex items-center justify-center gap-1.5 text-xl font-bold text-rose-400">
                  <Gem className="w-4 h-4 text-rose-500/50 fill-rose-500/20" />
                  {requiredCredits.toLocaleString()}
                </div>
              </div>

            </div>
          </div>

          {/* Deficit / Success State */}
          {!canRetry ? (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">
                Short by <span className="font-bold text-white">{deficit} credits</span>
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Sparkles className="w-5 h-5 text-teal-400 shrink-0" />
              <p className="text-sm text-teal-300 font-medium">
                Balance updated! You're good to go.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {canRetry ? (
              <Button 
                onClick={handleRetry}
                className="w-full h-14 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-base"
              >
                <Gem className="w-5 h-5 mr-2" />
                Retry Now
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleBuy}
                  disabled={isBuying}
                  className="w-full h-14 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-bold text-base shadow-lg shadow-rose-900/20"
                >
                  {isBuying ? (
                    <span>Redirecting...</span>
                  ) : (
                    <>
                      <Gem className="w-5 h-5 mr-2" />
                      Buy Credits Now
                      <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
                    </>
                  )}
                </Button>
              </>
            )}
            
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="w-full h-10 text-white/50 hover:text-white hover:bg-white/5"
            >
              Cancel
            </Button>
          </div>

          {/* Secure Footer */}
          <div className="text-center">
             <p className="text-[10px] text-white/30">
               Secure payment powered by Stripe.
             </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}