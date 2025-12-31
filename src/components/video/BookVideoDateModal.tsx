import { useState, useEffect } from 'react';
import { format, addDays, addMinutes, setHours, setMinutes, isBefore, isAfter, startOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
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
import { Loader2, Video, Gem, CalendarIcon, Clock, AlertTriangle, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import LowBalanceModal from '@/components/credits/LowBalanceModal';
import BuyCreditsModal from '@/components/credits/BuyCreditsModal';
import { useWallet } from '@/hooks/useWallet';
import { getFunctionErrorMessage } from '@/lib/supabaseFunctionError';
import { calculateCreatorEarnings, calculatePlatformFee, deriveAudioRate, CallType } from '@/lib/pricing';

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
  const { user, profile } = useAuth();
  const { wallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<'15' | '30' | '60' | '90'>('30');
  const [callType, setCallType] = useState<CallType>('video');
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

  const getVideoRate = (dur: string) => {
    switch (dur) {
      case '15': return video15Rate;
      case '30': return video30Rate;
      case '60': return video60Rate;
      case '90': return video90Rate;
      default: return video30Rate;
    }
  };

  const getCreditsNeeded = () => {
    const videoRate = getVideoRate(duration);
    return callType === 'video' ? videoRate : deriveAudioRate(videoRate);
  };
  const creditsNeeded = getCreditsNeeded();
  const earnerAmount = calculateCreatorEarnings(creditsNeeded);
  const hasEnoughCredits = (wallet?.credit_balance || 0) >= creditsNeeded;

  // Generate time slots ONLY from earner's actual availability for selected date
  const getAvailableTimeSlots = () => {
    // If no date selected, return empty - user must select a date first
    if (!selectedDate) {
      return [];
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = selectedDate.getDay();
    
    // Find availability for this specific day
    const dayAvailability = earnerAvailability.filter(a => a.day_of_week === dayOfWeek);
    
    // If no availability for this day, return empty
    if (dayAvailability.length === 0) {
      return [];
    }

    // Generate slots ONLY from the earner's available time windows
    const slots: { value: string; label: string }[] = [];
    
    dayAvailability.forEach(avail => {
      const [startH, startM] = avail.start_time.split(':').map(Number);
      // Each availability record represents a single 30-min slot
      // The slot starts at start_time
      const slotValue = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
      const slotDate = setMinutes(setHours(new Date(), startH), startM);
      
      slots.push({
        value: slotValue,
        label: format(slotDate, 'h:mm a')
      });
    });

    // Sort slots by time
    slots.sort((a, b) => a.value.localeCompare(b.value));
    
    // Remove duplicates (in case of overlapping availability records)
    const uniqueSlots = slots.filter((slot, index, self) => 
      index === self.findIndex(s => s.value === slot.value)
    );

    return uniqueSlots;
  };

  const timeSlots = getAvailableTimeSlots();

  // Check if a date has any available slots
  const dateHasAvailability = (date: Date) => {
    if (earnerAvailability.length === 0) return true; // No availability set = all days available
    const dayOfWeek = date.getDay();
    return earnerAvailability.some(a => a.day_of_week === dayOfWeek);
  };

  const fetchAvailability = async () => {
    const { data: availability } = await supabase
      .from('earner_availability')
      .select('day_of_week, start_time, end_time')
      .eq('user_id', earnerId)
      .eq('is_active', true);

    if (availability) {
      setEarnerAvailability(availability);
    }
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
      await fetchAvailability();
    };

    if (open) {
      fetchData();
    }
  }, [open, earnerId]);

  // Real-time subscription for earner availability changes
  useEffect(() => {
    if (!open || !earnerId) return;

    const channel = supabase
      .channel(`earner-availability-${earnerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'earner_availability',
          filter: `user_id=eq.${earnerId}`
        },
        () => {
          // Re-fetch availability when earner updates their schedule
          fetchAvailability();
          // Reset selected time if it might no longer be valid
          setSelectedTime('');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, earnerId]);

  const validateBooking = (): string | null => {
    if (!selectedDate) return 'Please select a date';
    if (!selectedTime) return 'Please select a time';

    const [hours, mins] = selectedTime.split(':').map(Number);
    const scheduledStart = setMinutes(setHours(selectedDate, hours), mins);
    const now = new Date();
    const minTime = addMinutes(now, 15);
    const maxTime = addDays(now, 7);

    if (isBefore(scheduledStart, minTime)) {
      return 'Must book at least 15 minutes in advance';
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

    // Fresh wallet balance check before any database operations
    const { data: freshWallet, error: walletError } = await supabase
      .from('wallets')
      .select('credit_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError || !freshWallet || freshWallet.credit_balance < creditsNeeded) {
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
      const [hours, mins] = selectedTime.split(':').map(Number);
      const scheduledStart = setMinutes(setHours(selectedDate, hours), mins);
      const platformFee = calculatePlatformFee(creditsNeeded);

      // Calculate credits per minute for snapshotting (for proration)
      const creditsPerMinute = creditsNeeded / parseInt(duration);

      // Create video date record with 'draft' status (invisible to earner)
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
          call_type: callType,
          credits_per_minute: creditsPerMinute,
          status: 'draft'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Reserve credits using the database function
      const { data: reserveResult, error: reserveError } = await supabase.rpc(
        'reserve_credits_for_video_date',
        {
          p_user_id: user.id,
          p_video_date_id: videoDate.id,
          p_credits_amount: creditsNeeded
        }
      );

      const reserveData = reserveResult as { success: boolean; error?: string; new_balance?: number } | null;

      if (reserveError || !reserveData?.success) {
        // Delete the draft video date if reservation failed
        await supabase.from('video_dates').delete().eq('id', videoDate.id);
        throw new Error(reserveData?.error || 'Failed to reserve credits');
      }

      // Credits reserved successfully - now make visible to earner
      const { error: updateError } = await supabase
        .from('video_dates')
        .update({ status: 'pending' })
        .eq('id', videoDate.id);

      if (updateError) {
        // Rollback: release credits and delete draft
        await supabase.rpc('release_credit_reservation', { p_video_date_id: videoDate.id });
        await supabase.from('video_dates').delete().eq('id', videoDate.id);
        throw new Error('Failed to finalize booking');
      }

      // Create Daily.co room
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
        body: { videoDateId: videoDate.id, callType },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const roomError = getFunctionErrorMessage(roomResult, 'Failed to create video room');
      if (roomError) {
        // Refund credits and delete the video date
        await supabase.rpc('release_credit_reservation', { p_video_date_id: videoDate.id });
        await supabase.from('video_dates').delete().eq('id', videoDate.id);
        throw new Error(roomError);
      }

      console.log('Daily.co room created:', roomResult.data?.roomUrl);

      // Send email notification to earner
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'video_date_booked',
            recipientId: earnerId,
            senderName: profile?.name || 'Someone',
            scheduledStart: scheduledStart.toISOString(),
            duration: parseInt(duration),
          },
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      toast.success(`${callType === 'video' ? 'Video' : 'Audio'} call booked with ${earnerName}!`, {
        description: `${formatInTimeZone(scheduledStart, 'America/New_York', 'EEEE, MMMM d')} at ${formatInTimeZone(scheduledStart, 'America/New_York', 'h:mm a')} EST`
      });

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to book call');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDuration('30');
    setCallType('video');
    setSelectedDate(undefined);
    setSelectedTime('');
  };

  const durationOptions = [
    { value: '15', label: '15 minutes', videoRate: video15Rate, audioRate: deriveAudioRate(video15Rate) },
    { value: '30', label: '30 minutes', videoRate: video30Rate, audioRate: deriveAudioRate(video30Rate) },
    { value: '60', label: '60 minutes', videoRate: video60Rate, audioRate: deriveAudioRate(video60Rate) },
    { value: '90', label: '90 minutes', videoRate: video90Rate, audioRate: deriveAudioRate(video90Rate) },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-[#0a0a0f]/95 backdrop-blur-xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                {callType === 'video' ? <Video className="w-4 h-4 text-primary" /> : <Phone className="w-4 h-4 text-primary" />}
              </div>
              Book {callType === 'video' ? 'Video' : 'Audio'} Date with {earnerName}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Schedule a private {callType} call. You're only charged for time used.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Call Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-white">Call type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCallType('video')}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    callType === 'video'
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                      : "border-white/10 bg-white/[0.02] hover:border-primary/50"
                  )}
                >
                  <Video className={cn("w-5 h-5", callType === 'video' ? "text-primary" : "text-white/50")} />
                  <div className="text-left">
                    <p className={cn("font-medium text-sm", callType === 'video' ? "text-white" : "text-white/70")}>Video</p>
                    <p className="text-xs text-white/50">Face-to-face</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setCallType('audio')}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    callType === 'audio'
                      ? "border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-teal-500/50"
                  )}
                >
                  <Phone className={cn("w-5 h-5", callType === 'audio' ? "text-teal-400" : "text-white/50")} />
                  <div className="text-left">
                    <p className={cn("font-medium text-sm", callType === 'audio' ? "text-white" : "text-white/70")}>Audio</p>
                    <p className="text-xs text-white/50">Voice only</p>
                  </div>
                </button>
              </div>
              <p className="text-xs text-white/40 mt-2">Audio = voice only, no camera needed</p>
            </div>

            {/* Duration Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-white">Select duration</Label>
              <RadioGroup 
                value={duration} 
                onValueChange={(v) => setDuration(v as '15' | '30' | '60' | '90')}
                className="grid grid-cols-2 gap-3"
              >
                {durationOptions.map((option) => (
                  <div 
                    key={option.value}
                    className={cn(
                      "flex flex-col p-3 rounded-xl border cursor-pointer transition-all",
                      duration === option.value 
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" 
                        : "border-white/10 bg-white/[0.02] hover:border-primary/50 hover:bg-white/[0.04]"
                    )}
                    onClick={() => setDuration(option.value as '15' | '30' | '60' | '90')}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem 
                        value={option.value} 
                        id={`${option.value}min`} 
                        className="border-white/30 text-primary"
                      />
                      <Label htmlFor={`${option.value}min`} className="font-medium cursor-pointer text-sm text-white">
                        {option.label}
                      </Label>
                    </div>
                    <div className="mt-2 pl-6 flex items-center gap-2">
                      <p className={cn(
                        "text-sm font-semibold",
                        callType === 'video' ? "text-gradient-amber" : "text-teal-400"
                      )}>
                        {callType === 'video' ? option.videoRate : option.audioRate} Credits
                      </p>
                      {callType === 'audio' && (
                        <span className="text-xs text-white/40 line-through">{option.videoRate}</span>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Date & Time Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-white">Select date & time</Label>
              <div className="grid grid-cols-2 gap-3">
                {/* Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal bg-white/[0.05] border-white/10 hover:bg-white/[0.08] hover:border-white/20",
                        selectedDate ? "text-white" : "text-white/50"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "MMM d") : "Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#0a0a0f] border-white/10" align="start">
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
                      className={cn("p-3 pointer-events-auto bg-[#0a0a0f] text-white")}
                    />
                  </PopoverContent>
                </Popover>

                {/* Time Picker */}
                <Select 
                  value={selectedTime} 
                  onValueChange={setSelectedTime}
                  disabled={!selectedDate || timeSlots.length === 0}
                >
                  <SelectTrigger 
                    className={cn(
                      "bg-white/[0.05] border-white/10 hover:bg-white/[0.08]",
                      selectedTime ? "text-white" : "text-white/50"
                    )}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder={timeSlots.length === 0 ? "No slots" : "Time"} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border-white/10">
                    {timeSlots.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-white/50">
                        No available times
                      </div>
                    ) : (
                      timeSlots.map((slot) => (
                        <SelectItem 
                          key={slot.value} 
                          value={slot.value}
                          className="text-white focus:bg-white/10 focus:text-white"
                        >
                          {slot.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-white/40 mt-2">All times are in Eastern Time (EST)</p>
            </div>

            {/* Balance Summary */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Your credit balance</span>
                <span className="flex items-center gap-1.5 font-medium text-white">
                  <Gem className="w-4 h-4 text-primary" />
                  {(wallet?.credit_balance || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Credits needed</span>
                <span className={cn(
                  "font-semibold",
                  hasEnoughCredits ? "text-white" : "text-destructive"
                )}>
                  {creditsNeeded.toLocaleString()}
                </span>
              </div>
              {hasEnoughCredits && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-white/10">
                  <span className="text-white/60">After booking</span>
                  <span className="font-medium text-white/80">
                    {((wallet?.credit_balance || 0) - creditsNeeded).toLocaleString()} credits
                  </span>
                </div>
              )}
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-white/70">
                Credits will be reserved until the call ends. They will only be charged 
                after successful completion.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={loading}
              className="bg-white/[0.05] border-white/20 text-white hover:bg-white/[0.1]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBook} 
              disabled={loading || !selectedDate || !selectedTime}
              className="btn-gradient-rose"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {callType === 'video' ? <Video className="w-4 h-4 mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
              Book {callType === 'video' ? 'Video' : 'Audio'} Call
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