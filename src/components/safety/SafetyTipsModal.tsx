import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Check } from 'lucide-react';

interface SafetyTipsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => void;
}

const SAFETY_TIPS = [
  'Never share personal information like your address, phone number, or financial details',
  'Keep conversations within the app — avoid moving to other platforms',
  'Report suspicious behavior immediately using the report button',
  'Trust your instincts — if something feels off, it probably is',
  'Video calls are safer than meeting in person for first interactions',
  'Never send money or gift cards to someone you haven\'t met',
];

export default function SafetyTipsModal({
  open,
  onOpenChange,
  onAcknowledge
}: SafetyTipsModalProps) {
  const handleAcknowledge = () => {
    onAcknowledge();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/20">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            Stay Safe on Lynxx Club
          </DialogTitle>
          <DialogDescription>
            Before you start chatting, please review these safety tips.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {SAFETY_TIPS.map((tip, index) => (
            <div 
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-1 rounded-full bg-teal/20 shrink-0">
                <Check className="w-3 h-3 text-teal" />
              </div>
              <p className="text-sm text-muted-foreground">{tip}</p>
            </div>
          ))}
        </div>

        <Button onClick={handleAcknowledge} className="w-full">
          I Understand, Start Chatting
        </Button>
      </DialogContent>
    </Dialog>
  );
}