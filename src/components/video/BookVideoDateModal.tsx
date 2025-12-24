import { useState, useEffect } from 'react';
import { format, addDays, addHours, setHours, setMinutes, isBefore, isAfter } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Video, Gem, CalendarIcon, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import LowBalanceModal from '@/components/credits/LowBalanceModal';
import BuyCreditsModal from '@/components/credits/BuyCreditsModal';

interface BookVideoDateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  earnerId: string;
  earnerName: string;
  video30Rate: number;
  video60Rate: number;
}

export default function BookVideoDateModal({
  open,
  onOpenChange,
  conversationId,
  earnerId,
  earnerName,
  video30Rate,
  video60Rate
}: BookVideoDateModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<'30' | '60'>('30');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [existingDates, setExistingDates] = useState<Date[]>([]);

  const creditsNeeded = duration === '30' ? video30Rate : video60Rate;
  const usdAmount = creditsNeeded * 0.10;
  const earnerAmount = usdAmount * 0.70;
  const hasEnoughCredits = (profile?.credit_balance || 0) >= creditsNeeded;

  // Generate time slots (8am - 10pm)
  const timeSlots = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 8;
    return {
      value: `${hour.toString().padStart(2, '0')}:00`,
      label: format(setHours(setMinutes(new Date(), 0), hour), 'h:mm a')
    };
  });

  // Fetch existing video dates for the earner to prevent double-booking
  useEffect(() => {
    const fetchExistingDates = async () => {
      const { data } = await supabase
        .from('video_dates')
        .select('scheduled_start, scheduled_duration')
        .eq('earner_id', earnerId)
        .eq('status', 'scheduled')
        .gte('scheduled_start', new Date().toISOString());

      if (data) {
        setExistingDates(data.map(d => new Date(d.scheduled_start)));
      }
    };

    if (open) {
      fetchExistingDates();
    }
  }, [open, earnerId]);

  const validateBooking = (): string | null => {
    if (!selectedDate) return 'Please select a date';
    if (!selectedTime) return 'Please select a time';

    const [hours] = selectedTime.split(':').map(Number);
    const scheduledStart = setMinutes(setHours(selectedDate, hours), 0);
    const now = new Date();
    const minTime = addHours(now, 1);
    const maxTime = addDays(now, 7);

    if (isBefore(scheduledStart, minTime)) {
      return 'Must book at least 1 hour in advance';
    }

    if (isAfter(scheduledStart, maxTime)) {
      return 'Cannot book more than 7 days in advance';
    }

    // Check for conflicts
    const durationMs = (duration === '30' ? 30 : 60) * 60 * 1000;
    const endTime = new Date(scheduledStart.getTime() + durationMs);

    for (const existing of existingDates) {
      const existingEnd = new Date(existing.getTime() + 60 * 60 * 1000); // Assume 60min max
      if (
        (scheduledStart >= existing && scheduledStart < existingEnd) ||
        (endTime > existing && endTime <= existingEnd)
      ) {
        return 'This time slot is already booked';
      }
    }

    return null;
  };

  const handleBook = async () => {
    if (!user || !selectedDate || !selectedTime) return;

    if (!hasEnoughCredits) {
      setShowLowBalance(true);
      return;
    }

    const validationError = validateBooking();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      const [hours] = selectedTime.split(':').map(Number);
      const scheduledStart = setMinutes(setHours(selectedDate, hours), 0);
      const platformFee = usdAmount * 0.30;

      const { error } = await supabase.from('video_dates').insert({
        conversation_id: conversationId,
        seeker_id: user.id,
        earner_id: earnerId,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_duration: parseInt(duration),
        credits_reserved: creditsNeeded,
        earner_amount: earnerAmount,
        platform_fee: platformFee,
        status: 'scheduled'
      });

      if (error) throw error;

      toast.success(`Video date booked with ${earnerName}!`, {
        description: `${format(scheduledStart, 'EEEE, MMMM d')} at ${format(scheduledStart, 'h:mm a')}`
      });

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to book video date');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDuration('30');
    setSelectedDate(undefined);
    setSelectedTime('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Book Video Date with {earnerName}
            </DialogTitle>
            <DialogDescription>
              Schedule a private video call
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Duration Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Select duration</Label>
              <RadioGroup 
                value={duration} 
                onValueChange={(v) => setDuration(v as '30' | '60')}
                className="space-y-3"
              >
                <div 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                    duration === '30' 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setDuration('30')}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="30" id="30min" />
                    <div>
                      <Label htmlFor="30min" className="font-medium cursor-pointer">30 minutes</Label>
                      <p className="text-sm text-muted-foreground">
                        {video30Rate} credits (${(video30Rate * 0.10).toFixed(2)})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-teal font-medium">
                      She earns ${(video30Rate * 0.10 * 0.70).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                    duration === '60' 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setDuration('60')}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="60" id="60min" />
                    <div>
                      <Label htmlFor="60min" className="font-medium cursor-pointer">60 minutes</Label>
                      <p className="text-sm text-muted-foreground">
                        {video60Rate} credits (${(video60Rate * 0.10).toFixed(2)})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-teal font-medium">
                      She earns ${(video60Rate * 0.10 * 0.70).toFixed(2)}
                    </span>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Date & Time Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Select date & time</Label>
              <div className="grid grid-cols-2 gap-3">
                {/* Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "MMM d") : "Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) =>
                        isBefore(date, new Date()) ||
                        isAfter(date, addDays(new Date(), 7))
                      }
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>

                {/* Time Picker */}
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className={cn(!selectedTime && "text-muted-foreground")}>
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Balance Summary */}
            <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your credit balance</span>
                <span className="flex items-center gap-1 font-medium">
                  <Gem className="w-4 h-4 text-primary" />
                  {(profile?.credit_balance || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Credits needed</span>
                <span className={cn(
                  "font-medium",
                  hasEnoughCredits ? "text-foreground" : "text-destructive"
                )}>
                  {creditsNeeded.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-gold/10 border border-gold/20 text-sm">
              <AlertTriangle className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                Credits will be reserved until the call ends. They will only be charged 
                after successful completion.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleBook} 
              disabled={loading || !selectedDate || !selectedTime}
              className="bg-primary hover:bg-primary/90"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Video className="w-4 h-4 mr-2" />
              Book Video Date
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LowBalanceModal
        open={showLowBalance}
        onOpenChange={setShowLowBalance}
        currentBalance={profile?.credit_balance || 0}
        requiredCredits={creditsNeeded}
        onBuyCredits={() => {
          setShowLowBalance(false);
          setShowBuyCredits(true);
        }}
      />

      <BuyCreditsModal
        open={showBuyCredits}
        onOpenChange={setShowBuyCredits}
      />
    </>
  );
}