import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { setHours, setMinutes, addDays, format, isBefore, startOfDay } from "date-fns";
import { getFunctionErrorMessage } from "@/lib/supabaseFunctionError";
import { calculatePlatformFee } from "@/lib/pricing";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Loader2, Video, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

import LowBalanceModal from "@/components/credits/LowBalanceModal";

interface BookVideoDateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  earnerId: string;
  earnerName: string;
  video15Rate?: number | null;
  video30Rate?: number | null;
  video60Rate?: number | null;
  video90Rate?: number | null;
}

interface DurationOption {
  value: string;
  label: string;
  rate: number | null | undefined;
}

export default function BookVideoDateModal({
  open,
  onOpenChange,
  conversationId,
  earnerId,
  earnerName,
  video15Rate,
  video30Rate,
  video60Rate,
  video90Rate,
}: BookVideoDateModalProps) {
  const { user, profile } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<string>("15");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [callType, setCallType] = useState<"video" | "audio">("video");
  const [showLowBalance, setShowLowBalance] = useState(false);

  const durationOptions: DurationOption[] = [
    { value: "15", label: "15 min", rate: video15Rate },
    { value: "30", label: "30 min", rate: video30Rate },
    { value: "60", label: "60 min", rate: video60Rate },
    { value: "90", label: "90 min", rate: video90Rate },
  ].filter((opt) => opt.rate && opt.rate > 0);

  const selectedDuration = durationOptions.find((d) => d.value === duration);
  const creditsNeeded = selectedDuration?.rate || 0;
  const earnerAmount = Math.round(creditsNeeded * 0.7);

  const timeSlots = Array.from({ length: 24 * 4 }, (_, i) => {
    const hours = Math.floor(i / 4);
    const minutes = (i % 4) * 15;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  });

  const validateBooking = (): string | null => {
    if (!user) return "You must be logged in.";
    if (!selectedDate) return "Please select a date.";
    if (!selectedTime) return "Please select a time.";
    
    const [hours, mins] = selectedTime.split(":").map(Number);
    const scheduledStart = setMinutes(setHours(selectedDate, hours), mins);
    
    if (isBefore(scheduledStart, new Date())) {
      return "Cannot book in the past.";
    }
    
    return null;
  };

  const resetForm = () => {
    setDuration("15");
    setSelectedDate(undefined);
    setSelectedTime("");
    setCallType("video");
  };

  const handleBook = async () => {
    if (!user || !selectedDate || !selectedTime) return;

    // Fresh wallet balance check before any database operations
    const { data: freshWallet, error: walletError } = await supabase
      .from("wallets")
      .select("credit_balance")
      .eq("user_id", user.id)
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
      const [hours, mins] = selectedTime.split(":").map(Number);
      const scheduledStart = setMinutes(setHours(selectedDate, hours), mins);
      const platformFee = calculatePlatformFee(creditsNeeded);

      // Calculate credits per minute for snapshotting (for proration)
      const creditsPerMinute = creditsNeeded / parseInt(duration);

      // Create video date record with 'draft' status (invisible to earner)
      const { data: videoDate, error: insertError } = await supabase
        .from("video_dates")
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
          status: "draft",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Reserve credits using the database function
      const { data: reserveResult, error: reserveError } = await supabase.rpc("reserve_credits_for_video_date", {
        p_user_id: user.id,
        p_video_date_id: videoDate.id,
        p_credits_amount: creditsNeeded,
      });

      const reserveData = reserveResult as { success: boolean; error?: string; new_balance?: number } | null;

      if (reserveError || !reserveData?.success) {
        // Delete the draft video date if reservation failed
        await supabase.from("video_dates").delete().eq("id", videoDate.id);
        throw new Error(reserveData?.error || "Failed to reserve credits");
      }

      // Get auth session for function calls
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        await supabase.rpc("release_credit_reservation", { p_video_date_id: videoDate.id });
        await supabase.from("video_dates").delete().eq("id", videoDate.id);
        toast.error("Session expired. Please log in again.");
        return;
      }

      // Create Daily.co room BEFORE making booking visible
      const roomResult = await supabase.functions.invoke("create-daily-room", {
        body: { 
          videoDateId: videoDate.id, 
          callType,
          waitingRoom: true,
          autoStart: false,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const roomError = getFunctionErrorMessage(roomResult, "Failed to create video room");
      if (roomError) {
        // Refund credits and delete the video date
        await supabase.rpc("release_credit_reservation", { p_video_date_id: videoDate.id });
        await supabase.from("video_dates").delete().eq("id", videoDate.id);
        throw new Error(roomError);
      }

      console.log("Daily.co room created:", roomResult.data?.roomUrl);

      // Credits reserved and room created successfully - now make visible to earner
      const { error: updateError } = await supabase
        .from("video_dates")
        .update({ status: "pending" })
        .eq("id", videoDate.id);

      if (updateError) {
        // Rollback: release credits and delete draft
        await supabase.rpc("release_credit_reservation", { p_video_date_id: videoDate.id });
        await supabase.from("video_dates").delete().eq("id", videoDate.id);
        throw new Error("Failed to finalize booking");
      }

      // Send email notification to earner
      try {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            type: "video_date_booked",
            recipientId: earnerId,
            senderName: profile?.name || "Someone",
            scheduledStart: scheduledStart.toISOString(),
            duration: parseInt(duration),
          },
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }

      toast.success(`Video date booked with ${earnerName}!`, {
        description: `${formatInTimeZone(scheduledStart, "America/New_York", "EEEE, MMMM d")} at ${formatInTimeZone(scheduledStart, "America/New_York", "h:mm a")} EST`,
      });

      onOpenChange(false);
      resetForm();
      refetchWallet();
    } catch (error: unknown) {
      console.error("Booking error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to book video date";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Video Date</DialogTitle>
            <DialogDescription>
              Schedule a {callType === "video" ? "video" : "audio"} call with {earnerName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Call Type Toggle */}
            <div className="flex items-center justify-between">
              <Label>Call Type</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={callType === "video" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCallType("video")}
                  className="gap-2"
                >
                  <Video className="h-4 w-4" />
                  Video
                </Button>
                <Button
                  type="button"
                  variant={callType === "audio" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCallType("audio")}
                  className="gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Audio
                </Button>
              </div>
            </div>

            {/* Duration Selection */}
            <div className="space-y-2">
              <Label>Duration</Label>
              {durationOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This creator hasn't set their video date rates yet.
                </p>
              ) : (
                <RadioGroup
                  value={duration}
                  onValueChange={setDuration}
                  className="grid grid-cols-2 gap-2"
                >
                  {durationOptions.map((opt) => (
                    <div key={opt.value}>
                      <RadioGroupItem
                        value={opt.value}
                        id={`duration-${opt.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`duration-${opt.value}`}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        )}
                      >
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-sm text-muted-foreground">
                          {opt.rate} credits
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label>Time (EST)</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cost Summary */}
            {creditsNeeded > 0 && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Duration</span>
                  <span>{duration} minutes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cost</span>
                  <span className="font-medium">{creditsNeeded} credits</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Your balance</span>
                  <span>{wallet?.credit_balance || 0} credits</span>
                </div>
              </div>
            )}

            {/* Book Button */}
            <Button
              onClick={handleBook}
              disabled={loading || durationOptions.length === 0 || !selectedDate || !selectedTime}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                `Book for ${creditsNeeded} credits`
              )}
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
          // User can navigate to buy credits page from here
        }}
      />
    </>
  );
}
