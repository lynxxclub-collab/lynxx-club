import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, Coins, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/hooks/useWallet';

interface ExtendCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoDateId: string;
  rate15min: number;
  rate30min: number;
  onExtended: (additionalSeconds: number) => void;
}

const EXTENSION_OPTIONS = [
  { duration: 15, label: '15 minutes' },
  { duration: 30, label: '30 minutes' },
];

export default function ExtendCallModal({
  open,
  onOpenChange,
  videoDateId,
  rate15min,
  rate30min,
  onExtended,
}: ExtendCallModalProps) {
  const { wallet, refetch } = useWallet();
  const [selectedDuration, setSelectedDuration] = useState<number>(15);
  const [extending, setExtending] = useState(false);

  const getCreditsNeeded = () => {
    if (selectedDuration === 15) return rate15min;
    if (selectedDuration === 30) return rate30min;
    return 0;
  };

  const creditsNeeded = getCreditsNeeded();
  const hasEnoughCredits = (wallet?.credit_balance || 0) >= creditsNeeded;

  const handleExtend = async () => {
    if (!hasEnoughCredits) {
      toast.error('Insufficient credits');
      return;
    }

    setExtending(true);
    try {
      // Deduct credits from user's balance
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ 
          credit_balance: (wallet?.credit_balance || 0) - creditsNeeded 
        })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (deductError) throw deductError;

      // Update video date with extended duration
      const { data: currentVd, error: fetchError } = await supabase
        .from('video_dates')
        .select('scheduled_duration, credits_reserved')
        .eq('id', videoDateId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('video_dates')
        .update({ 
          scheduled_duration: (currentVd?.scheduled_duration || 0) + selectedDuration,
          credits_reserved: (currentVd?.credits_reserved || 0) + creditsNeeded
        })
        .eq('id', videoDateId);

      if (updateError) throw updateError;

      // Record the transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          transaction_type: 'video_extension',
          credits_amount: -creditsNeeded,
          description: `Extended video call by ${selectedDuration} minutes`
        });

      if (txError) console.error('Failed to record transaction:', txError);

      await refetch();
      onExtended(selectedDuration * 60);
      onOpenChange(false);
      toast.success(`Call extended by ${selectedDuration} minutes!`);
    } catch (error) {
      console.error('Error extending call:', error);
      toast.error('Failed to extend call');
    } finally {
      setExtending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Extend Video Call
          </DialogTitle>
          <DialogDescription>
            Add more time to keep the conversation going.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Duration Selection */}
          <RadioGroup
            value={String(selectedDuration)}
            onValueChange={(val) => setSelectedDuration(Number(val))}
            className="space-y-3"
          >
            {EXTENSION_OPTIONS.map((option) => {
              const cost = option.duration === 15 ? rate15min : rate30min;
              return (
                <div
                  key={option.duration}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <RadioGroupItem value={String(option.duration)} id={`ext-${option.duration}`} />
                  <Label
                    htmlFor={`ext-${option.duration}`}
                    className="flex-1 flex justify-between cursor-pointer"
                  >
                    <span>{option.label}</span>
                    <span className="text-muted-foreground">{cost} credits</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          {/* Credit Balance */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-sm">Your balance</span>
            </div>
            <span className="font-medium">{wallet?.credit_balance || 0} credits</span>
          </div>

          {/* Warning if insufficient credits */}
          {!hasEnoughCredits && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Insufficient credits. You need {creditsNeeded - (wallet?.credit_balance || 0)} more.</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleExtend}
            disabled={!hasEnoughCredits || extending}
          >
            {extending ? 'Extending...' : `Add ${selectedDuration} min (${creditsNeeded} credits)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
