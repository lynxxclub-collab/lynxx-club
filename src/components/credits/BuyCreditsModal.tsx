import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Gem, Sparkles, Crown, Star, Zap, Check, Loader2, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getFunctionErrorMessage } from '@/lib/supabaseFunctionError';

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  stripe_price_id: string;
}

interface BuyCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const getPackIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('starter')) return <Zap className="w-5 h-5" />;
  if (lower.includes('popular')) return <Star className="w-5 h-5" />;
  if (lower.includes('premium')) return <Crown className="w-5 h-5" />;
  return <Sparkles className="w-5 h-5" />;
};

export default function BuyCreditsModal({ open, onOpenChange, onSuccess }: BuyCreditsModalProps) {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPacks, setIsFetchingPacks] = useState(true);

  // Fetch credit packs from database
  useEffect(() => {
    if (!open) return;

    const fetchPacks = async () => {
      setIsFetchingPacks(true);
      try {
        const { data, error } = await supabase
          .from('credit_packs')
          .select('*')
          .eq('active', true)
          .order('price_cents', { ascending: true });

        if (error) throw error;
        
        setPacks(data || []);
        // Default select the middle pack or first one
        if (data && data.length > 0) {
          const middleIndex = Math.floor(data.length / 2);
          setSelectedPackId(data[middleIndex].id);
        }
      } catch (error) {
        console.error('Error fetching credit packs:', error);
        toast.error('Failed to load credit packs');
      } finally {
        setIsFetchingPacks(false);
      }
    };

    fetchPacks();
  }, [open]);

  const handlePurchase = async () => {
    if (!selectedPackId) {
      toast.error('Please select a credit pack');
      return;
    }

    setIsLoading(true);
    try {
      // Ensure we have a valid session before calling edge function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        toast.error('Session expired. Please log in again.');
        setIsLoading(false);
        return;
      }

      const result = await supabase.functions.invoke('create-checkout-session', {
        body: { packId: selectedPackId }
      });

      // Use the reusable error parser
      const errorMessage = getFunctionErrorMessage(result, 'Failed to start checkout');
      if (errorMessage) {
        toast.error(errorMessage);
        return;
      }
      
      if (!result.data?.url) {
        toast.error('No checkout URL received');
        return;
      }

      // Redirect to Stripe Checkout (same tab to avoid popup blocker)
      toast.success('Redirecting to Stripe...');
      window.location.href = result.data.url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPackId('');
    onOpenChange(false);
  };

  const selectedPack = packs.find(p => p.id === selectedPackId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gem className="w-6 h-6 text-primary" />
            Buy Credits
          </DialogTitle>
        </DialogHeader>

        {isFetchingPacks ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : packs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No credit packs available at the moment.</p>
            <p className="text-sm mt-2">Please check back later.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <RadioGroup 
              value={selectedPackId} 
              onValueChange={setSelectedPackId}
              className="space-y-3"
            >
              {packs.map((pack, index) => {
                const isPopular = index === Math.floor(packs.length / 2);
                
                return (
                  <div key={pack.id} className="relative">
                    {isPopular && (
                      <div className="absolute -top-2 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full z-10">
                        Most Popular
                      </div>
                    )}
                    <Label
                      htmlFor={pack.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        selectedPackId === pack.id 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50 bg-secondary/50"
                      )}
                    >
                      <RadioGroupItem value={pack.id} id={pack.id} className="sr-only" />
                      
                      <div className={cn(
                        "p-2 rounded-lg",
                        selectedPackId === pack.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {getPackIcon(pack.name)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{pack.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {pack.credits.toLocaleString()} credits
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-lg">${(pack.price_cents / 100).toFixed(2)}</div>
                      </div>

                      {selectedPackId === pack.id && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            {selectedPack && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">You'll receive</div>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      <Gem className="w-5 h-5 text-primary" />
                      {selectedPack.credits.toLocaleString()} credits
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-2xl font-bold">${(selectedPack.price_cents / 100).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={handlePurchase}
              disabled={isLoading || !selectedPackId}
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

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Secure payment powered by Stripe.</span>
              <Link 
                to="/faq/pricing" 
                className="inline-flex items-center gap-1 text-primary hover:underline"
                onClick={() => onOpenChange(false)}
              >
                <HelpCircle className="w-3 h-3" />
                Pricing FAQ
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
