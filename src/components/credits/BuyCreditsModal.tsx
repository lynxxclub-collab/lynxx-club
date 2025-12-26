import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Gem, Sparkles, Crown, Star, Zap, Check, Loader2 } from 'lucide-react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Only initialize Stripe if the publishable key is available
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise: Promise<Stripe | null> = stripePublishableKey 
  ? loadStripe(stripePublishableKey) 
  : Promise.resolve(null);

interface Package {
  id: string;
  name: string;
  price: number;
  credits: number;
  bonus: number;
  icon: React.ReactNode;
  popular?: boolean;
}

const PACKAGES: Package[] = [
  { 
    id: 'starter', 
    name: 'Starter', 
    price: 50, 
    credits: 500, 
    bonus: 0,
    icon: <Zap className="w-5 h-5" />,
  },
  { 
    id: 'popular', 
    name: 'Popular', 
    price: 100, 
    credits: 1100, 
    bonus: 10,
    icon: <Star className="w-5 h-5" />,
    popular: true,
  },
  { 
    id: 'premium', 
    name: 'Premium', 
    price: 200, 
    credits: 2400, 
    bonus: 20,
    icon: <Sparkles className="w-5 h-5" />,
  },
  { 
    id: 'vip', 
    name: 'VIP', 
    price: 500, 
    credits: 6500, 
    bonus: 30,
    icon: <Crown className="w-5 h-5" />,
  },
];

interface BuyCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function CheckoutForm({ 
  packageId, 
  onSuccess, 
  onCancel 
}: { 
  packageId: string; 
  onSuccess: () => void; 
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !isReady) {
      toast.error('Payment form is still loading. Please wait a moment.');
      return;
    }

    setIsProcessing(true);

    try {
      // First submit the elements to validate
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast.error(submitError.message || 'Please check your payment details');
        setIsProcessing(false);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        const response = await supabase.functions.invoke('confirm-payment', {
          body: { paymentIntentId: paymentIntent.id },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        toast.success(`${response.data.creditsAdded} credits added to your account!`);
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'Payment confirmation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        onReady={() => setIsReady(true)}
        onLoadError={(error) => {
          console.error('PaymentElement load error:', error);
          toast.error('Failed to load payment form. Please try again.');
        }}
      />
      {!isReady && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading payment form...</span>
        </div>
      )}
      <div className="flex gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="flex-1"
          disabled={isProcessing}
        >
          Back
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || !isReady || isProcessing}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Pay Now'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function BuyCreditsModal({ open, onOpenChange, onSuccess }: BuyCreditsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>('popular');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleProceed = async () => {
    if (!stripePublishableKey) {
      toast.error('Payment system is not configured. Please contact support.');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('create-payment-intent', {
        body: { packageId: selectedPackage },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setClientSecret(response.data.clientSecret);
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setClientSecret(null);
    setSelectedPackage('popular');
    onOpenChange(false);
  };

  const handleSuccess = () => {
    handleClose();
    onSuccess?.();
  };

  const selectedPkg = PACKAGES.find(p => p.id === selectedPackage);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gem className="w-6 h-6 text-primary" />
            Buy Credits
          </DialogTitle>
        </DialogHeader>

        {!clientSecret ? (
          <div className="space-y-6">
            <RadioGroup 
              value={selectedPackage} 
              onValueChange={setSelectedPackage}
              className="space-y-3"
            >
              {PACKAGES.map((pkg) => (
                <div key={pkg.id} className="relative">
                  {pkg.popular && (
                    <div className="absolute -top-2 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full z-10">
                      Most Popular
                    </div>
                  )}
                  <Label
                    htmlFor={pkg.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      selectedPackage === pkg.id 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50 bg-secondary/50"
                    )}
                  >
                    <RadioGroupItem value={pkg.id} id={pkg.id} className="sr-only" />
                    
                    <div className={cn(
                      "p-2 rounded-lg",
                      selectedPackage === pkg.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {pkg.icon}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{pkg.name}</span>
                        {pkg.bonus > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded-full">
                            +{pkg.bonus}% bonus
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pkg.credits.toLocaleString()} credits
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-lg">${pkg.price}</div>
                      <div className="text-xs text-muted-foreground">
                        ${(pkg.price / pkg.credits * 100).toFixed(1)}¢/credit
                      </div>
                    </div>

                    {selectedPackage === pkg.id && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">You'll receive</div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Gem className="w-5 h-5 text-primary" />
                    {selectedPkg?.credits.toLocaleString()} credits
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-2xl font-bold">${selectedPkg?.price}</div>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleProceed}
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 h-12 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Gem className="w-5 h-5 mr-2" />
                  Continue to Payment
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by Stripe. Credits are non-refundable.
            </p>
          </div>
        ) : (
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: 'hsl(263 70% 58%)',
                  colorBackground: 'hsl(220 26% 18%)',
                  colorText: 'hsl(210 40% 98%)',
                  colorDanger: 'hsl(0 84% 60%)',
                  borderRadius: '0.75rem',
                },
              },
            }}
          >
            <CheckoutForm 
              packageId={selectedPackage} 
              onSuccess={handleSuccess}
              onCancel={() => setClientSecret(null)}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}