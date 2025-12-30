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
  Check, 
  AlertTriangle,
  ArrowRight 
} from 'lucide-react';
import { format, addYears } from 'date-fns';

interface PauseAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShareStory: () => void;
}

const PAUSE_REASONS = [
  { id: 'found_love', label: 'Found someone special', icon: Heart, highlight: true },
  { id: 'break', label: 'Taking a break', icon: Coffee },
  { id: 'no_matches', label: 'Not finding good matches', icon: Search },
  { id: 'expensive', label: 'Too expensive', icon: DollarSign },
  { id: 'safety', label: 'Safety concerns', icon: Shield },
  { id: 'other', label: 'Other', icon: MessageSquare },
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
      <DialogContent className="max-w-md">
        {/* Step 1: Select Reason */}
        {step === 'reason' && (
          <>
            <DialogHeader>
              <DialogTitle>Pause Your Account</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Why are you leaving?</p>
              
              <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                <div className="space-y-2">
                  {PAUSE_REASONS.map((reason) => {
                    const Icon = reason.icon;
                    const isSelected = selectedReason === reason.id;
                    return (
                      <label
                        key={reason.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          isSelected
                            ? reason.highlight 
                              ? "border-pink-500 bg-pink-500/10" 
                              : "border-primary bg-primary/10"
                            : "border-border hover:border-muted-foreground/50",
                          reason.highlight && "border-pink-500/30"
                        )}
                      >
                        <RadioGroupItem value={reason.id} />
                        <Icon className={cn(
                          "w-4 h-4",
                          reason.highlight && "text-pink-500"
                        )} />
                        <span className={cn(
                          "text-sm",
                          reason.highlight && "text-pink-500 font-medium"
                        )}>
                          {reason.label}
                          {reason.highlight && " ❤️"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </RadioGroup>

              {selectedReason === 'other' && (
                <Input
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Please specify..."
                  className="mt-2"
                />
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleContinue} 
                disabled={!selectedReason || (selectedReason === 'other' && !otherReason.trim())}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Found Love - Share Story Prompt */}
        {step === 'found_love' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                Congratulations! 🎉
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto">
                <Heart className="w-8 h-8 text-white fill-white" />
              </div>
              
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Before you go, share your story and earn $25 each!
                </p>
              </div>

              <div className="p-4 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-lg border border-pink-500/20 text-left space-y-2">
                <p className="text-sm font-medium">Share your success story:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✅ Both earn $25 Amazon gift card</li>
                  <li>✅ 6 months Alumni Access (free)</li>
                  <li>✅ Featured in our success stories</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleShareStory} 
                className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
              >
                Share Success Story
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleSkipToShare} 
                className="w-full text-muted-foreground"
                disabled={pausing}
              >
                {pausing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Skip, Just Pause Account
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                Account Paused ✓
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal to-teal/80 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-white" />
              </div>

              <p className="text-muted-foreground">
                Your account is now paused:
              </p>

              <div className="text-left space-y-3 p-4 bg-secondary rounded-lg">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-teal">What's preserved:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✅ All data preserved (2 years)</li>
                    <li>✅ Can reactivate anytime</li>
                    <li>✅ Can still withdraw earnings</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Restrictions:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>❌ Can't browse or message</li>
                    <li>❌ Profile hidden from search</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-rose-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm">
                    Your data will auto-delete on: <strong>{format(deletionDate, 'MMMM d, yyyy')}</strong>
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={handleDone} className="w-full">
              Done
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
