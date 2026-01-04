import { useState } from "react";
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
import { Wallet, Loader2, ExternalLink, DollarSign, Check, AlertCircle, Building } from "lucide-react";
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
  availableBalance,
  stripeOnboardingComplete,
  onSuccess,
}: WithdrawModalProps) {
  const { refreshProfile } = useAuth();
  const [amount, setAmount] = useState(Math.min(availableBalance, MINIMUM_WITHDRAWAL));
  const [withdrawing, setWithdrawing] = useState(false);
  const [settingUpStripe, setSettingUpStripe] = useState(false);

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

    if (amount > availableBalance) {
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

  const canWithdraw = stripeOnboardingComplete && availableBalance >= MINIMUM_WITHDRAWAL;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-500" />
            {stripeOnboardingComplete ? "Withdraw Earnings" : "Set Up Payouts"}
          </DialogTitle>
          <DialogDescription>
            {stripeOnboardingComplete
              ? "Transfer your earnings to your bank account."
              : "Connect your bank account to receive payouts."}
          </DialogDescription>
        </DialogHeader>

        {!stripeOnboardingComplete ? (
          /* Stripe Setup View */
          <div className="py-6 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <Building className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Connect Your Bank</h3>
              <p className="text-muted-foreground text-sm">
                Securely link your bank account to receive your earnings. This is a one-time setup powered by Stripe.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Secure & encrypted</p>
                  <p className="text-xs text-muted-foreground">Your data is protected by bank-level security</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Fast transfers</p>
                  <p className="text-xs text-muted-foreground">Receive funds in 1-2 business days</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">No hidden fees</p>
                  <p className="text-xs text-muted-foreground">We don't charge withdrawal fees</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSetupStripe}
              disabled={settingUpStripe}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90"
            >
              {settingUpStripe ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Connect Bank Account
            </Button>
          </div>
        ) : (
          /* Withdraw View */
          <div className="py-6 space-y-6">
            {/* Balance Display */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
              <p className="text-4xl font-bold text-amber-500">${availableBalance.toFixed(2)}</p>
            </div>

            {availableBalance < MINIMUM_WITHDRAWAL ? (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-500/10 border border-amber-500/20">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Minimum not reached</p>
                  <p className="text-xs text-muted-foreground">
                    You need ${(MINIMUM_WITHDRAWAL - availableBalance).toFixed(2)} more to withdraw. Minimum withdrawal
                    is ${MINIMUM_WITHDRAWAL}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Withdrawal Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Math.min(Number(e.target.value), availableBalance))}
                      className="pl-9 text-lg font-semibold"
                      min={MINIMUM_WITHDRAWAL}
                      max={availableBalance}
                    />
                  </div>
                </div>

                <Slider
                  value={[amount]}
                  onValueChange={([v]) => setAmount(v)}
                  min={MINIMUM_WITHDRAWAL}
                  max={availableBalance}
                  step={1}
                  className="py-2"
                />

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Min: ${MINIMUM_WITHDRAWAL}</span>
                  <button onClick={() => setAmount(availableBalance)} className="text-primary hover:underline">
                    Withdraw all
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {stripeOnboardingComplete && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={!canWithdraw || withdrawing || amount < MINIMUM_WITHDRAWAL}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {withdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
              Withdraw ${amount.toFixed(2)}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
