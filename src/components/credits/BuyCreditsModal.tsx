import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gem, Sparkles, Crown, Star, Zap, Check, Loader2, HelpCircle, Gift, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getFunctionErrorMessage } from '@/lib/supabaseFunctionError';
import { useIsMobile } from '@/hooks/use-mobile';

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  stripe_price_id: string;
  bonus_credits: number;
  badge: string | null;
  is_vip?: boolean;
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
  if (lower.includes('flex')) return <Sparkles className="w-5 h-5" />;
  if (lower.includes('vip')) return <Crown className="w-5 h-5" />;
  return <Gift className="w-5 h-5" />;
};

export default function BuyCreditsModal({ open, onOpenChange, onSuccess }: BuyCreditsModalProps) {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPacks, setIsFetchingPacks] = useState(true);
  const isMobile = useIsMobile();

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
        
        setPacks((data as CreditPack[]) || []);
        // Default select the popular pack or the highest value pack
        if (data && data.length > 0) {
          const popularPack = data.find((p: CreditPack) => p.badge === 'Most Popular');
          setSelectedPackId(popularPack?.id || data[1]?.id || data[0].id);
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast.error('Session expired. Please log in again.');
        setIsLoading(false);
        return;
      }

      const result = await supabase.functions.invoke('create-checkout-session', {
        body: { packId: selectedPackId }
      });

      const errorMessage = getFunctionErrorMessage(result, 'Failed to start checkout');
      if (errorMessage) {
        toast.error(errorMessage);
        return;
      }
      
      if (!result.data?.url) {
        toast.error('No checkout URL received');
        return;
      }

      toast.success('Redirecting to secure payment...');
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
  const isVip = selectedPack?.name.toLowerCase().includes('vip') || selectedPack?.badge === 'VIP';

  const Content = (
    <div className="flex flex-col h-full">
      {/* Scrollable List of Packs */}
      <ScrollArea className={cn("flex-1 -mx-1 px-1", isMobile && "pb-24")}>
        {isFetchingPacks ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
              <p className="text-white/50 text-sm">Loading offers...</p>
            </div>
          </div>
        ) : packs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Lock className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60 font-medium">No credit packs available</p>
            <p className="text-xs text-white/30 mt-1">Please check back later.</p>
          </div>
        ) : (
          <RadioGroup 
            value={selectedPackId} 
            onValueChange={setSelectedPackId}
            className="space-y-3 pt-2"
          >
            {packs.map((pack) => {
              const isSelected = selectedPackId === pack.id;
              const totalCredits = pack.credits + (pack.bonus_credits || 0);
              const isPackVip = pack.name.toLowerCase().includes('vip');
              
              return (
                <div key={pack.id} className="relative group">
                  {pack.badge && (
                    <div className={cn(
                      "absolute -top-3 left-6 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg z-10",
                      pack.badge === 'Most Popular' 
                        ? "bg-gradient-to-r from-rose-500 to-purple-500 text-white border border-white/10"
                        : "bg-gradient-to-r from-amber-400 to-orange-500 text-black border border-white/10"
                    )}>
                      {pack.badge === 'Most Popular' ? '🔥 Popular' : '👑 Best Value'}
                    </div>
                  )}
                  
                  <Label
                    htmlFor={pack.id}
                    className={cn(
                      "flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden",
                      "hover:scale-[1.01] active:scale-[0.98]",
                      isSelected 
                        ? isPackVip
                          ? "bg-gradient-to-br from-amber-500/20 to-orange-600/10 border-amber-400/50 shadow-[0_0_20px_-5px_rgba(251,191,36,0.3)]"
                          : "bg-gradient-to-br from-rose-500/20 to-purple-600/10 border-rose-500/50 shadow-[0_0_20px_-5px_rgba(244,63,94,0.3)]"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                    )}
                  >
                    {/* Background Pattern for VIP */}
                    {isPackVip && isSelected && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.1),transparent_50%)] pointer-events-none" />
                    )}
                    
                    {/* Selection Indicator */}
                    <div className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0 transition-all",
                      isSelected
                        ? isPackVip ? "border-amber-400 bg-amber-400" : "border-rose-500 bg-rose-500"
                        : "border-white/20 bg-transparent"
                    )}>
                      <Check className={cn("w-4 h-4 transition-all", isSelected ? "opacity-100 scale-100" : "opacity-0 scale-50")} />
                    </div>

                    {/* Icon */}
                    <div className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isSelected 
                        ? isPackVip 
                          ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                          : "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                        : "bg-white/10 text-white/60 group-hover:text-white group-hover:bg-white/20"
                    )}>
                      {getPackIcon(pack.name)}
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                          "font-bold text-base sm:text-lg truncate",
                          isSelected ? "text-white" : "text-white/80 group-hover:text-white"
                        )}>
                          {pack.name}
                        </h3>
                        {pack.badge && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={isSelected ? "text-white/70" : "text-white/50"}>
                          {pack.credits.toLocaleString()} credits
                        </span>
                        {pack.bonus_credits > 0 && (
                          <span className="text-teal-400 font-semibold text-xs bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                            +{pack.bonus_credits} FREE
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Price */}
                    <div className="text-right shrink-0">
                      <div className={cn(
                        "font-black text-xl sm:text-2xl tracking-tight",
                        isSelected && isPackVip ? "text-amber-400" : isSelected ? "text-white" : "text-white/60"
                      )}>
                        ${(pack.price_cents / 100).toFixed(2)}
                      </div>
                    </div>

                    {/* Hidden Input */}
                    <RadioGroupItem value={pack.id} id={pack.id} className="sr-only" />
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        )}
      </ScrollArea>

      {/* Sticky Footer / Summary */}
      {!isFetchingPacks && selectedPack && (
        <div className={cn(
          "shrink-0 p-4 sm:p-0 sm:pt-6 space-y-4",
          isMobile && "absolute bottom-0 left-0 right-0 bg-[#0a0a0f]/95 backdrop-blur-md border-t border-white/10 z-20 pb-6",
          isVip ? "border-amber-500/30" : "border-rose-500/30"
        )}>
          {/* Summary Card */}
          <div className={cn(
            "p-4 rounded-xl border flex items-center justify-between",
            isVip
              ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-amber-500/30"
              : "bg-gradient-to-r from-rose-500/20 to-purple-500/10 border-rose-500/30"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                isVip ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"
              )}>
                <Gem className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase text-white/50 font-bold tracking-wider">Total Credits</div>
                <div className="font-bold text-xl text-white leading-none mt-0.5">
                  {(selectedPack.credits + (selectedPack.bonus_credits || 0)).toLocaleString()}
                </div>
                {selectedPack.bonus_credits > 0 && (
                  <div className="text-[10px] text-teal-400 mt-0.5">
                    Includes bonus!
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-white/50 font-bold tracking-wider">Total Price</div>
              <div className="font-bold text-2xl text-white leading-none mt-0.5">
                ${(selectedPack.price_cents / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Purchase Button */}
          <Button 
            onClick={handlePurchase}
            disabled={isLoading || !selectedPackId}
            className={cn(
              "w-full h-14 text-base font-bold rounded-xl shadow-xl transition-all active:scale-[0.98]",
              isVip
                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-amber-900/20"
                : "bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white shadow-rose-900/20"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment
                <div className="bg-white/20 p-1 rounded ml-2">
                  <Lock className="w-4 h-4" />
                </div>
              </>
            )}
          </Button>

          {/* FAQ Link */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-white/30">
            <Lock className="w-3 h-3" />
            <span>Secure payment powered by</span>
            <span className="font-semibold text-white/50">Stripe</span>
            <Link 
              to="/faq/pricing" 
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1 ml-2 text-rose-400 hover:text-rose-300 transition-colors"
            >
              <HelpCircle className="w-3 h-3" />
              Help
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  // Mobile: use bottom drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="bg-[#0a0a0f] border-white/10 h-[85vh]">
          <DrawerHeader className="text-left pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 rounded-lg">
                <Gem className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <DrawerTitle className="text-white text-2xl">Buy Credits</DrawerTitle>
                <p className="text-xs text-white/50 mt-0.5">Choose a pack to get started</p>
              </div>
            </div>
          </DrawerHeader>
          <div className="h-full overflow-hidden pb-20"> {/* pb-20 for sticky footer space */}
            {Content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: use centered dialog
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-[#0a0a0f] border-white/10 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b border-white/10">
          <DialogTitle className="flex items-center gap-3 text-xl text-white">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <Gem className="w-6 h-6 text-rose-400" />
            </div>
            Buy Credits
          </DialogTitle>
        </DialogHeader>
        <div className="h-[70vh] overflow-hidden">
          {Content}
        </div>
      </DialogContent>
    </Dialog>
  );
}