import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Heart, 
  Coffee, 
  Search, 
  DollarSign, 
  Shield, 
  MessageSquare, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { format, addYears } from 'date-fns';

interface PauseAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShareStory: () => void;
}

const PAUSE_REASONS = [
  { id: 'found_love', label: 'Found someone special', icon: Heart, highlight: true, color: 'text-rose-400' },
  { id: 'break', label: 'Taking a break', icon: Coffee, color: 'text-blue-400' },
  { id: 'no_matches', label: 'Not finding good matches', icon: Search, color: 'text-purple-400' },
  { id: 'expensive', label: 'Too expensive', icon: DollarSign, color: 'text-emerald-400' },
  { id: 'safety', label: 'Safety concerns', icon: Shield, color: 'text-orange-400' },
  { id: 'other', label: 'Other', icon: MessageSquare, color: 'text-gray-400' },
];

export default function PauseAccountModal({ open, onOpenChange, onShareStory }: PauseAccountModalProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [step, setStep] = useState<'reason' | 'found_love' | 'confirm' | 'done'>('reason');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState('');
  const [pausing, setPausing] = useState(false);

  const deletionDate = addYears(new Date(), 2);

  const handleContinue = () => {
    if (!selectedReason) {
      toast.error('Please select a reason');
      return;
    }

    if (selectedReason === 'found_love') {
      setStep('found_love');
    } else {
      handlePause();
    }
  };

  const handlePause = async () => {
    if (!user) return;

    setPausing(true);
    try {
      const reason = selectedReason === 'other' ? otherReason : selectedReason;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          account_status: 'paused',
          paused_date: new Date().toISOString(),
          exit_reason: reason,
          reactivation_eligible_date: deletionDate.toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setStep('done');
    } catch (error: any) {
      console.error('Error pausing account:', error);
      toast.error(error.message || 'Failed to pause account');
    } finally {
      setPausing(false);
    }
  };

  const handleDone = async () => {
    await signOut();
    navigate('/');
  };

  const handleShareStory = () => {
    onOpenChange(false);
    onShareStory();
  };

  const handleSkipToShare = () => {
    handlePause();
  };

  const handleClose = () => {
    setStep('reason');
    setSelectedReason('');
    setOtherReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-[#0a0a0f] border-white/10 p-0 overflow-hidden">
        
        {/* Step 1: Select Reason */}
        {step === 'reason' && (
          <div className="p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <DialogHeader className="space-y-2 text-center">
              <DialogTitle className="text-2xl font-bold text-white">Pause Account</DialogTitle>
              <p className="text-sm text-white/50">We're sorry to see you go. Why are you pausing?</p>
            </DialogHeader>
            
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              <div className="space-y-3">
                {PAUSE_REASONS.map((reason) => {
                  const Icon = reason.icon;
                  const isSelected = selectedReason === reason.id;
                  return (
                    <label
                      key={reason.id}
                      className={cn(
                        "relative flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all active:scale-[0.98]",
                        isSelected
                          ? reason.highlight 
                            ? "border-rose-500/50 bg-rose-500/10 shadow-[0_0_20px_-5px_rgba(244,63,94,0.3)]" 
                            : "border-primary/50 bg-primary/10"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10",
                      )}
                    >
                      <div className={cn("p-2.5 rounded-xl bg-white/5", isSelected ? "bg-white/10" : "")}>
                        <Icon className={cn("w-5 h-5", isSelected ? reason.color : "text-white/40")} />
                      </div>
                      
                      <div className="flex-1">
                        <span className={cn(
                          "text-base font-medium",
                          isSelected ? "text-white" : "text-white/70"
                        )}>
                          {reason.label}
                        </span>
                        {reason.highlight && <span className="ml-2 text-rose-400">❤️</span>}
                      </div>

                      {/* Custom Radio Indicator */}
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected 
                          ? (reason.highlight ? "border-rose-500 bg-rose-500" : "border-primary bg-primary")
                          : "border-white/20"
                      )}>
                        {isSelected && <ChevronRight className="w-4 h-4 text-white" />}
                      </div>
                      
                      {/* Hidden default input for accessibility */}
                      <RadioGroupItem value={reason.id} className="sr-only" />
                    </label>
                  );
                })}
              </div>
            </RadioGroup>

            {selectedReason === 'other' && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <Label className="text-xs uppercase text-white/50 font-semibold tracking-wider mb-2 block">
                  Please specify
                </Label>
                <Input
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Type your reason here..."
                  className="bg-white/5 border-white/10 text-white focus:border-rose-500 h-12"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                className="h-12 border-white/10 text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleContinue} 
                disabled={!selectedReason || (selectedReason === 'other' && !otherReason.trim())}
                className="h-12 bg-rose-600 hover:bg-rose-500 text-white font-semibold"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Found Love - Share Story Prompt */}
        {step === 'found_love' && (
          <div className="p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <DialogHeader className="text-center space-y-4">
              <div className="relative mx-auto w-fit">
                <div className="absolute inset-0 blur-xl bg-rose-500/40 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-2xl shadow-rose-900/40">
                  <Heart className="w-10 h-10 text-white fill-white" />
                </div>
              </div>
              
              <DialogTitle className="text-2xl font-bold text-white">Congratulations! 🎉</DialogTitle>
              <p className="text-white/60 px-2">
                Before you go, share your story and get rewarded!
              </p>
            </DialogHeader>

            {/* Reward Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/5 border border-pink-500/20 text-left space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white uppercase tracking-wider">Reward</span>
                <span className="text-lg font-black text-pink-400">$50</span>
              </div>
              
              <div className="h-px bg-white/10 w-full" />

              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-white/80">
                  <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <span><span className="text-white font-semibold">You & your partner</span> get $25 each</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-white/80">
                  <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <span><span className="text-white font-semibold">6 Months Alumni Access</span> (Free)</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-white/80">
                  <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <span>Featured in our <span className="text-white font-semibold">Success Stories</span></span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleShareStory} 
                className="w-full h-14 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-base font-bold shadow-xl shadow-pink-900/20 border-0 active:scale-[0.98] transition-all"
              >
                Claim Reward
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleSkipToShare} 
                className="w-full h-12 text-white/50 hover:text-white hover:bg-white/5"
                disabled={pausing}
              >
                {pausing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Skip, just pause account
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <div className="p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <DialogHeader className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-teal-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-teal-400" />
              </div>
              
              <DialogTitle className="text-2xl font-bold text-white">Account Paused</DialogTitle>
              <p className="text-white/60">Your account is safe with us.</p>
            </DialogHeader>

            {/* Info Grid */}
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" /> What's Preserved
                </h4>
                <ul className="space-y-2">
                  <li className="text-xs text-white/60 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-teal-400" /> All data for 2 years
                  </li>
                  <li className="text-xs text-white/60 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-teal-400" /> Reactivate anytime
                  </li>
                  <li className="text-xs text-white/60 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-teal-400" /> Can still withdraw earnings
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400" /> Restrictions
                </h4>
                <ul className="space-y-2">
                  <li className="text-xs text-white/60 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-rose-400" /> Cannot browse or message
                  </li>
                  <li className="text-xs text-white/60 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-rose-400" /> Profile hidden from search
                  </li>
                </ul>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="text-sm text-orange-200/80 leading-relaxed">
                Data will be permanently deleted on: <br />
                <span className="font-bold text-orange-500">{format(deletionDate, 'MMMM d, yyyy')}</span>
              </div>
            </div>

            <Button onClick={handleDone} className="w-full h-14 bg-white text-black hover:bg-white/90 font-bold">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}