import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getFunctionErrorMessage } from "@/lib/supabaseFunctionError";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from '@/components/ui/badge';
import { Wallet, Loader2, ExternalLink, DollarSign, Check, AlertCircle, Building, Shield, Zap, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  stripeOnboardingComplete: boolean;
  onSuccess?: () => void;
}

const MINIMUM_WITHDRAWAL = 25;

export default function WithdrawModal({
  open,
  onOpenChange,
  availableBalance: propAvailableBalance,
  stripeOnboardingComplete,
  onSuccess,
}: WithdrawModalProps) {
  const { user, refreshProfile } = useAuth();
  const [currentBalance, setCurrentBalance] = useState(propAvailableBalance);
  const [amount, setAmount] = useState(Math.min(propAvailableBalance, MINIMUM_WITHDRAWAL));
  const [withdrawing, setWithdrawing] = useState(false);
  const [settingUpStripe, setSettingUpStripe] = useState(false);

  // Sync prop to state and listen for real-time updates
  useEffect(() => {
    setCurrentBalance(propAvailableBalance);
    if (amount > propAvailableBalance) {
      setAmount(propAvailableBalance);
    }
  }, [propAvailableBalance]);

  // REAL-TIME: Watch wallet for balance changes
  useEffect(() => {
    if (!open || !user) return;

    const channel = supabase
      .channel(`wallet_withdraw_modal_${user.id}`)
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
          toast.info("Wallet balance updated.");
          
          // Adjust amount if it exceeds new balance
          setAmount(prev => Math.min(prev, newBalance));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [open, user]);

  const handleSetupStripe = async () => {
    setSettingUpStripe(true);

    try {
      const result = await supabase.functions.invoke("stripe-connect-onboard", {
        body: {
          returnUrl: `${window.location.origin}/dashboard?stripe_success=true`,
          refreshUrl: `${window.location.origin}/dashboard?stripe_refresh=true`,
        },
      });

      const errorMessage = getFunctionErrorMessage(result);
      if (errorMessage) throw new Error(errorMessage);

      if (result.data?.url) {
        toast.info("Redirecting to Stripe...");
        window.location.href = result.data.url;
      } else if (result.data?.onboardingComplete) {
        toast.success("Bank account already connected!");
        await refreshProfile();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start setup");
    } finally {
      setSettingUpStripe(false);
    }
  };

  const handleWithdraw = async () => {
    if (amount < MINIMUM_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is $${MINIMUM_WITHDRAWAL}`);
      return;
    }

    if (amount > currentBalance) {
      toast.error("Amount exceeds available balance");
      return;
    }

    setWithdrawing(true);

    try {
      const result = await supabase.functions.invoke("stripe-withdraw", {
        body: { amount },
      });

      const errorMessage = getFunctionErrorMessage(result);
      if (errorMessage) throw new Error(errorMessage);

      toast.success(`$${amount.toFixed(2)} withdrawal initiated!`, {
        description: "Funds will arrive in 1-2 business days.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to withdraw");
    } finally {
      setWithdrawing(false);
    }
  };

  const canWithdraw = stripeOnboardingComplete && currentBalance >= MINIMUM_WITHDRAWAL;
  const isDeficit = currentBalance < MINIMUM_WITHDRAWAL;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0f] border-white/10 p-0 overflow-hidden">
        
        {/* Header */}
        <DialogHeader className="p-6 pb-2 border-b border-white/10">
          <DialogTitle className="flex items-center gap-3 text-xl text-white">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Wallet className="w-6 h-6 text-amber-400" />
            </div>
            {stripeOnboardingComplete ? "Withdraw Earnings" : "Set Up Payouts"}
          </DialogTitle>
          <DialogDescription className="text-white/50 pt-2">
            {stripeOnboardingComplete
              ? "Transfer your earnings to your bank account instantly."
              : "Connect your bank account to receive payouts securely."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {!stripeOnboardingComplete ? (
            /* Stripe Setup View */
            <div className="space-y-6">
              <div className="text-center pt-4">
                <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6 border border-white/10">
                  <Building className="w-12 h-12 text-amber-400" />
                  <div className="absolute -bottom-2 -right-2 p-1.5 bg-[#0a0a0f] rounded-full border border-white/10">
                    <CreditCard className="w-4 h-4 text-white/50" />
                  </div>
                </div>
                <h3 className="font-bold text-xl text-white mb-2">Connect Your Bank</h3>
                <p className="text-sm text-white/60 max-w-xs mx-auto">
                  Securely link your bank account. This is a one-time setup powered by Stripe.
                </p>
              </div>

              <div className="space-y-4">
                <FeatureRow icon={Shield} title="Secure & Encrypted" desc="Bank-level security" />
                <FeatureRow icon={Zap} title="Fast Transfers" desc="1-2 business days" />
                <FeatureRow icon={Check} title="No Hidden Fees" desc="100% of your earnings" />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-white/30">
                <span>Powered by</span>
                <span className="font-bold text-white/50">Stripe Connect</span>
              </div>

              <Button
                onClick={handleSetupStripe}
                disabled={settingUpStripe}
                className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-base shadow-lg shadow-amber-900/20"
              >
                {settingUpStripe ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="w-5 h-5 mr-2" />
                )}
                Connect Bank Account
              </Button>
            </div>
          ) : (
            /* Withdraw View */
            <div className="space-y-6">
              {/* Balance Card */}
              <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Wallet className="w-24 h-24" />
                </div>
                <p className="text-xs uppercase tracking-wider text-white/50 font-bold mb-2">Available Balance</p>
                <div className="flex items-center justify-center gap-1 text-4xl font-bold text-white">
                  <span className="text-2xl text-amber-400">$</span>
                  {currentBalance.toFixed(2)}
                </div>
              </div>

              {isDeficit ? (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-white">Minimum not reached</p>
                    <p className="text-xs text-white/60 mt-1">
                      You need ${(MINIMUM_WITHDRAWAL - currentBalance).toFixed(2)} more. Minimum is ${MINIMUM_WITHDRAWAL}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pt-2">
                  <div className="space-y-4">
                    <Label className="text-white">Withdrawal Amount</Label>
                    
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Math.min(Number(e.target.value), currentBalance))}
                        className="pl-10 text-2xl font-bold h-14 bg-white/5 border-white/10 text-white focus:border-amber-500"
                        min={MINIMUM_WITHDRAWAL}
                        max={currentBalance}
                        step="1"
                      />
                    </div>

                    <Slider
                      value={[amount]}
                      onValueChange={([v]) => setAmount(v)}
                      min={MINIMUM_WITHDRAWAL}
                      max={currentBalance}
                      step={1}
                      className="py-4"
                    />

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white/40">Min: ${MINIMUM_WITHDRAWAL}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setAmount(currentBalance)} 
                        className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-8 px-3"
                      >
                        Withdraw All
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {stripeOnboardingComplete && (
          <DialogFooter className="p-6 pt-0 flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={!canWithdraw || withdrawing || amount < MINIMUM_WITHDRAWAL}
              className="flex-1 h-12 bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-900/20 border-0"
            >
              {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
              Withdraw
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper Sub-component for Setup Features
function FeatureRow({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/50">{desc}</p>
      </div>
    </div>
  );
}