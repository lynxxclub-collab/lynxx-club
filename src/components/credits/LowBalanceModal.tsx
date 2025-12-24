import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Gem } from 'lucide-react';

interface LowBalanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  requiredCredits: number;
  onBuyCredits: () => void;
}

export default function LowBalanceModal({ 
  open, 
  onOpenChange, 
  currentBalance, 
  requiredCredits,
  onBuyCredits 
}: LowBalanceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border text-center">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl">Insufficient Credits</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            You need at least {requiredCredits} credits to send a message.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-secondary/50">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Your Balance</div>
              <div className="text-2xl font-bold flex items-center gap-2 text-destructive">
                <Gem className="w-5 h-5" />
                {currentBalance.toLocaleString()}
              </div>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Required</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Gem className="w-5 h-5 text-primary" />
                {requiredCredits.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={onBuyCredits}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <Gem className="w-4 h-4 mr-2" />
            Buy Credits
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}