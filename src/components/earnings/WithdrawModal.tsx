import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, Loader2, Check, ExternalLink, AlertCircle, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  stripeOnboardingComplete: boolean;
  onSuccess?: () => void;
}

export default function WithdrawModal({ 
  open, 
  onOpenChange, 
  availableBalance,
  stripeOnboardingComplete,
  onSuccess 
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'amount' | 'confirm' | 'success'>('amount');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = numAmount >= 20 && numAmount <= availableBalance;

  // Check authentication status when modal opens
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.access_token);
    };
    
    if (open) {
      checkAuth();
    }
  }, [open]);

  const safeJsonParse = (value: unknown): any | null => {
    if (typeof value !== 'string') return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const mapStripeConnectError = (message: string) => {
    if (
      message.includes("signed up for Connect") ||
      message.toLowerCase().includes('connect')
    ) {
      return "Stripe Connect isn’t enabled for this Stripe account yet. Enable Connect in Stripe (Settings → Connect), then try again.";
    }
    return message;
  };

  const handleSetupBank = async () => {
    // Verify session before making the call
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast.error('Please log in to set up your bank account');
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('stripe-connect-onboard');

      // Prefer server-provided error payloads (otherwise Supabase may surface only “non-2xx”)
      const payloadError =
        response.data &&
        typeof response.data === 'object' &&
        'error' in response.data &&
        typeof (response.data as any).error === 'string'
          ? (response.data as any).error
          : null;

      if (payloadError) {
        throw new Error(mapStripeConnectError(payloadError));
      }

      if (response.error) {
        const rawBody = (response.error as any)?.context?.response?.body ?? (response.error as any)?.context?.body;
        const parsed = safeJsonParse(rawBody);
        const detailed = typeof parsed?.error === 'string' ? parsed.error : null;
        throw new Error(mapStripeConnectError(detailed || response.error.message || 'Failed to connect to payment service'));
      }

      if (response.data?.onboardingComplete) {
        toast.success('Bank account already connected!');
        onSuccess?.();
      } else if (response.data?.onboardingUrl) {
        window.open(response.data.onboardingUrl, '_blank');
        toast.info('Complete the bank setup in the new tab');
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to setup bank account';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!isValidAmount) return;

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('process-withdrawal', {
        body: { amount: numAmount }
      });

      if (response.error) throw new Error(response.error.message);
      
      if (response.data.success) {
        setStep('success');
        onSuccess?.();
      } else {
        throw new Error(response.data.error || 'Withdrawal failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Withdrawal failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('amount');
    setAmount('');
    onOpenChange(false);
  };

  const setQuickAmount = (pct: number) => {
    const value = Math.floor(availableBalance * pct);
    if (value >= 20) {
      setAmount(value.toString());
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="w-6 h-6 text-gold" />
            {step === 'success' ? 'Withdrawal Initiated' : 'Withdraw Earnings'}
          </DialogTitle>
          {step !== 'success' && (
            <DialogDescription>
              Available: ${availableBalance.toFixed(2)}
            </DialogDescription>
          )}
        </DialogHeader>

        {!stripeOnboardingComplete ? (
          <div className="space-y-6 py-4">
            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-start gap-3">
                <Building className="w-6 h-6 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Set Up Bank Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect your bank account to receive withdrawals. This only takes a few minutes.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSetupBank}
              disabled={isLoading}
              className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Set Up Bank Account
                </>
              )}
            </Button>
          </div>
        ) : step === 'amount' ? (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="amount">Withdrawal Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg h-12 bg-secondary border-border"
                  min={20}
                  max={availableBalance}
                />
              </div>
              
              {/* Quick amount buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setQuickAmount(0.25)}
                  className="flex-1"
                >
                  25%
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setQuickAmount(0.5)}
                  className="flex-1"
                >
                  50%
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setQuickAmount(0.75)}
                  className="flex-1"
                >
                  75%
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setQuickAmount(1)}
                  className="flex-1"
                >
                  Max
                </Button>
              </div>

              {numAmount > 0 && numAmount < 20 && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Minimum withdrawal is $20
                </p>
              )}
              
              {numAmount > availableBalance && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Amount exceeds available balance
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing time</span>
                <span>2-3 business days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee</span>
                <span className="text-green-500">$0.00</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-border">
                <span>You'll receive</span>
                <span>${numAmount > 0 ? numAmount.toFixed(2) : '0.00'}</span>
              </div>
            </div>

            <Button 
              onClick={() => setStep('confirm')}
              disabled={!isValidAmount}
              className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
            >
              Continue
            </Button>
          </div>
        ) : step === 'confirm' ? (
          <div className="space-y-6 py-4">
            <div className="p-6 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 text-center">
              <p className="text-sm text-muted-foreground mb-1">Withdrawal Amount</p>
              <p className="text-4xl font-bold text-gold">${numAmount.toFixed(2)}</p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span>Lynxx Club Earnings</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To</span>
                <span>Your Bank Account</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arrival</span>
                <span>2-3 business days</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep('amount')}
                className="flex-1"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button 
                onClick={handleWithdraw}
                disabled={isLoading}
                className="flex-1 bg-gold text-gold-foreground hover:bg-gold/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Withdrawal'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">Withdrawal Initiated!</h3>
              <p className="text-muted-foreground">
                ${numAmount.toFixed(2)} is on its way to your bank account.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 text-sm text-left">
              <p className="text-muted-foreground">
                Funds typically arrive within 2-3 business days. You'll receive an email confirmation once the transfer is complete.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}