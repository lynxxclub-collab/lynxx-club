import { useState, useEffect } from 'react';
import { format, addDays, addHours, setHours, setMinutes, isBefore, isAfter, startOfDay } from 'date-fns';
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
import { useWallet } from '@/hooks/useWallet';
import { getFunctionErrorMessage } from '@/lib/supabaseFunctionError';

interface BookVideoDateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  earnerId: string;
  earnerName: string;
  video15Rate?: number;
  video30Rate: number;
  video60Rate: number;
  video90Rate?: number;
}

export default function BookVideoDateModal({
  open,
  onOpenChange,
  conversationId,
  earnerId,
  earnerName,
  video15Rate = 75,
  video30Rate = 150,
  video60Rate = 300,
  video90Rate = 450
}: BookVideoDateModalProps) {
  const { user } = useAuth();
  const { wallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<'15' | '30' | '60' | '90'>('30');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [existingDates, setExistingDates] = useState<Date[]>([]);
  const [earnerAvailability, setEarnerAvailability] = useState<{
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[]>([]);

  const getCreditsNeeded = () => {
    switch (duration) {
      case '15': return video15Rate;
      case '30': return video30Rate;
      case '60': return video60Rate;
      case '90': return video90Rate;
      default: return video30Rate;
    }
  };
  const creditsNeeded = getCreditsNeeded();
  const usdAmount = creditsNeeded * 0.10;
  const earnerAmount = usdAmount * 0.70;
  const hasEnoughCredits = (wallet?.credit_balance || 0) >= creditsNeeded;

  // Generate time slots filtered by earner availability for selected date
  const getAvailableTimeSlots = () => {
    const allSlots = Array.from({ length: 15 }, (_, i) => {
      const hour = i + 8;
      return {
        value: `${hour.toString().padStart(2, '0')}:00`,
        label: format(setHours(setMinutes(new Date(), 0), hour), 'h:mm a')
      };
    });

    // If no date selected or no availability set, show all slots
    if (!selectedDate || earnerAvailability.length === 0) {
      return allSlots;
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = selectedDate.getDay();
    
    // Find availability for this day
    const dayAvailability = earnerAvailability.filter(a => a.day_of_week === dayOfWeek);
    
    if (dayAvailability.length === 0) {
      return []; // Earner not available on this day
    }

    // Filter slots to only those within availability windows
    return allSlots.filter(slot => {
      const slotHour = parseInt(slot.value.split(':')[0]);
      return dayAvailability.some(avail => {
        const startHour = parseInt(avail.start_time.split(':')[0]);
        const endHour = parseInt(avail.end_time.split(':')[0]);
        return slotHour >= startHour && slotHour < endHour;
      });
    });
  };

  const timeSlots = getAvailableTimeSlots();

  // Check if a date has any available slots
  const dateHasAvailability = (date: Date) => {
    if (earnerAvailability.length === 0) return true; // No availability set = all days available
    const dayOfWeek = date.getDay();
    return earnerAvailability.some(a => a.day_of_week === dayOfWeek);
  };

  // Fetch existing video dates and earner availability
  useEffect(() => {
    const fetchData = async () => {
      // Fetch existing bookings
      const { data: bookings } = await supabase
        .from('video_dates')
        .select('scheduled_start, scheduled_duration')
        .eq('earner_id', earnerId)
        .eq('status', 'scheduled')
        .gte('scheduled_start', new Date().toISOString());

      if (bookings) {
        setExistingDates(bookings.map(d => new Date(d.scheduled_start)));
      }

      // Fetch earner availability
      const { data: availability } = await supabase
        .from('earner_availability')
        .select('day_of_week, start_time, end_time')
        .eq('user_id', earnerId)
        .eq('is_active', true);

      if (availability) {
        setEarnerAvailability(availability);
      }
    };

    if (open) {
      fetchData();
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
    const durationMinutes = parseInt(duration);
    const durationMs = durationMinutes * 60 * 1000;
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

      // Create video date record
      const { data: videoDate, error: insertError } = await supabase
        .from('video_dates')
        .insert({
          conversation_id: conversationId,
          seeker_id: user.id,
          earner_id: earnerId,
          scheduled_start: scheduledStart.toISOString(),
          scheduled_duration: parseInt(duration),
          credits_reserved: creditsNeeded,
          earner_amount: earnerAmount,
          platform_fee: platformFee,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create Daily.co room - use getUser() first to force session refresh
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expired. Please log in again.');
        return;
      }
      
      const roomResult = await supabase.functions.invoke('create-daily-room', {
        body: { videoDateId: videoDate.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const roomError = getFunctionErrorMessage(roomResult, 'Failed to create video room');
      if (roomError) {
        // Delete the video date if room creation failed
        await supabase.from('video_dates').delete().eq('id', videoDate.id);
        throw new Error(roomError);
      }

      console.log('Daily.co room created:', roomResult.data?.roomUrl);

      toast.success(`Video date booked with ${earnerName}!`, {
        description: `${format(scheduledStart, 'EEEE, MMMM d')} at ${format(scheduledStart, 'h:mm a')}`
      });

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Booking error:', error);
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

  const durationOptions = [
    { value: '15', label: '15 minutes', rate: video15Rate },
    { value: '30', label: '30 minutes', rate: video30Rate },
    { value: '60', label: '60 minutes', rate: video60Rate },
    { value: '90', label: '90 minutes', rate: video90Rate },
  ];

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
                onValueChange={(v) => setDuration(v as '15' | '30' | '60' | '90')}
                className="grid grid-cols-2 gap-3"
              >
                {durationOptions.map((option) => (
                  <div 
                    key={option.value}
                    className={cn(
                      "flex flex-col p-3 rounded-lg border cursor-pointer transition-all",
                      duration === option.value 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setDuration(option.value as '15' | '30' | '60' | '90')}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={option.value} id={`${option.value}min`} />
                      <Label htmlFor={`${option.value}min`} className="font-medium cursor-pointer text-sm">
                        {option.label}
                      </Label>
                    </div>
                    <div className="mt-2 pl-6">
                      <p className="text-sm font-semibold text-primary">
                        {option.rate} credits
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${(option.rate * 0.10).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
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
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSelectedTime(''); // Reset time when date changes
                      }}
                      disabled={(date) =>
                        isBefore(date, startOfDay(new Date())) ||
                        isAfter(date, addDays(new Date(), 7)) ||
                        !dateHasAvailability(date)
                      }
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>

                {/* Time Picker */}
                <Select 
                  value={selectedTime} 
                  onValueChange={setSelectedTime}
                  disabled={!selectedDate || timeSlots.length === 0}
                >
                  <SelectTrigger className={cn(!selectedTime && "text-muted-foreground")}>
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder={timeSlots.length === 0 ? "No slots" : "Time"} />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No available times
                      </div>
                    ) : (
                      timeSlots.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))
                    )}
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
                  {(wallet?.credit_balance || 0).toLocaleString()}
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
        currentBalance={wallet?.credit_balance || 0}
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