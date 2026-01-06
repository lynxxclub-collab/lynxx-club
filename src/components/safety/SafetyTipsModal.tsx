import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Check, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";

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
      <DialogContent 
        className="sm:max-w-md bg-[#0f0f12] border-white/10 shadow-2xl overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Decorative Header Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-purple-500" />
        
        <DialogHeader className="text-center pt-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mb-4 border border-white/10 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            <Shield className="w-8 h-8 text-rose-400" />
          </div>
          <DialogTitle className="text-2xl font-bold text-white tracking-tight">
            Stay Safe
          </DialogTitle>
          <DialogDescription className="text-white/60 text-sm mt-2 max-w-[80%] mx-auto">
            Before you start chatting, please review these safety tips.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {SAFETY_TIPS.map((tip, index) => (
            <div 
              key={index}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border transition-all",
                "bg-white/[0.02] border-white/5",
                "animate-in fade-in slide-in-from-bottom-2",
                `duration-500 delay-${index * 50}`
              )}
            >
              <div className={cn(
                "p-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 shrink-0 mt-0.5"
              )}>
                <Check className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <p className="text-sm text-white/80 leading-relaxed font-medium">
                {tip}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-2 pb-6">
          <Button 
            onClick={handleAcknowledge} 
            className={cn(
              "w-full h-11 text-base font-bold transition-all duration-300",
              "bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400",
              "shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30",
              "border-0"
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              I Understand, Start Chatting
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}