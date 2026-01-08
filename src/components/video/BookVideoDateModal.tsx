import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { setHours, setMinutes, addDays, format, isBefore, startOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { getFunctionErrorMessage } from "@/lib/supabaseFunctionError";
import { calculatePlatformFee, calculateCreatorEarnings, PRICING } from "@/lib/pricing";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Video, Phone, Gem, Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import LowBalanceModal from "@/components/credits/LowBalanceModal";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";

interface BookVideoDateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  earnerId: string;
  earnerName: string;
  video15Rate: number | null;
  video30Rate: number | null;
  video60Rate: number | null;
  video90Rate: number | null;
}

const DURATIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
];

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  const timeValue = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const period = hour < 12 ? "AM" : "PM";
  const displayTime = `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
  return { value: timeValue, label: displayTime };
});

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
  const isMobile = useIsMobile();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [duration, setDuration] = useState<string>("30");
  const [callType, setCallType] = useState<"video" | "audio">("video");
  const [loading, setLoading] = useState(false);
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  const availableDurations = useMemo(() => {
    return DURATIONS.filter((d) => {
      switch (d.value) {
        case "15": return video15Rate !== null && video15Rate > 0;
        case "30": return video30Rate !== null && video30Rate > 0;
        case "60": return video60Rate !== null && video60Rate > 0;
        case "90": return video90Rate !== null && video90Rate > 0;
        default: return false;
      }
    });
  }, [video15Rate, video30Rate, video60Rate, video90Rate]);

  // Credits needed (what seeker pays)
  // ✅ FIX: Audio calls are 70% of video price
  const creditsNeeded = useMemo(() => {
    let baseRate = 0;
    switch (duration) {
      case "15": baseRate = video15Rate || 0; break;
      case "30": baseRate = video30Rate || 0; break;
      case "60": baseRate = video60Rate || 0; break;
      case "90": baseRate = video90Rate || 0; break;
      default: baseRate = 0;
    }
    // Apply audio discount (70% of video price)
    return callType === "audio" ? Math.round(baseRate * 0.70) : baseRate;
  }, [duration, video15Rate, video30Rate, video60Rate, video90Rate, callType]);

  // ✅ FIX: earner_amount should be in USD (what earner receives after 70/30 split)
  // Formula: credits × $0.10 × 0.70 = earner's USD payout
  const earnerAmountUSD = useMemo(() => {
    return calculateCreatorEarnings(creditsNeeded);
  }, [creditsNeeded]);

  // Platform fee in USD
  const platformFeeUSD = useMemo(() => {
    return calculatePlatformFee(creditsNeeded);
  }, [creditsNeeded]);

  const balance = wallet?.credit_balance || 0;
  const hasEnoughCredits = balance >= creditsNeeded;

  const resetForm = () => {
    setSelectedDate(undefined);
    setSelectedTime("");
    setDuration("30");
    setCallType("video");
  };

  const validateBooking = (): string | null => {
    if (!selectedDate) return "Please select a date";
    if (!selectedTime) return "Please select a time";
    if (creditsNeeded <= 0) return "Invalid rate for selected duration";

    const [hours, mins] = selectedTime.split(":").map(Number);
    const scheduledStart = setMinutes(setHours(selectedDate, hours), mins);

    if (isBefore(scheduledStart, new Date())) {
      return "Cannot book a time in the past";
    }

    return null;
  };

  const handleBook = async () => {
    if (!user || !selectedDate || !selectedTime) return;

    // Fresh wallet balance check
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
      const creditsPerMinute = creditsNeeded / parseInt(duration);

      // Create video date record with 'draft' status
      // ✅ FIX: earner_amount is now stored as USD (earner's payout after 70/30 split)
      const { data: videoDate, error: insertError } = await supabase
        .from("video_dates")
        .insert({
          conversation_id: conversationId,
          seeker_id: user.id,
          earner_id: earnerId,
          scheduled_start: scheduledStart.toISOString(),
          scheduled_duration: parseInt(duration),
          credits_reserved: creditsNeeded,
          earner_amount: earnerAmountUSD,  // ✅ USD, not credits
          platform_fee: platformFeeUSD,     // ✅ USD
          call_type: callType,
          credits_per_minute: creditsPerMinute,
          status: "draft",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Reserve credits
      const { data: reserveResult, error: reserveError } = await supabase.rpc("reserve_credits_for_video_date", {
        p_user_id: user.id,
        p_video_date_id: videoDate.id,
        p_credits_amount: creditsNeeded,
      });

      const reserveData = reserveResult as { success: boolean; error?: string } | null;

      if (reserveError || !reserveData?.success) {
        await supabase.from("video_dates").delete().eq("id", videoDate.id);
        throw new Error(reserveData?.error || "Failed to reserve credits");
      }

      // Get auth session for function calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        await supabase.rpc("release_credit_reservation", { p_video_date_id: videoDate.id });
        await supabase.from("video_dates").delete().eq("id", videoDate.id);
        toast.error("Session expired. Please log in again.");
        return;
      }

      // Create Daily.co room
      const roomResult = await supabase.functions.invoke("create-daily-room", {
        body: {
          videoDateId: videoDate.id,
          callType,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const roomError = getFunctionErrorMessage(roomResult, "Failed to create video room");
      if (roomError) {
        await supabase.rpc("release_credit_reservation", { p_video_date_id: videoDate.id });
        await supabase.from("video_dates").delete().eq("id", videoDate.id);
        throw new Error(roomError);
      }

      console.log("Daily.co room created:", roomResult.data?.roomUrl);

      // Make visible to earner
      const { error: updateError } = await supabase
        .from("video_dates")
        .update({ status: "pending" })
        .eq("id", videoDate.id);

      if (updateError) {
        await supabase.rpc("release_credit_reservation", { p_video_date_id: videoDate.id });
        await supabase.from("video_dates").delete().eq("id", videoDate.id);
        throw new Error("Failed to finalize booking");
      }

      // Send email notification
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

      refetchWallet();
      toast.success(`Video date booked with ${earnerName}!`, {
        description: `${formatInTimeZone(scheduledStart, "America/New_York", "EEEE, MMMM d")} at ${formatInTimeZone(scheduledStart, "America/New_York", "h:mm a")} EST`,
      });

      onOpenChange(false);
      resetForm();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to book video date";
      console.error("Booking error:", error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const Content = (
    <div className="space-y-6">
      {/* Balance */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-xl border",
        balance < creditsNeeded
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-white/5 border-white/10"
      )}>
        <span className="text-sm text-white/60">Your Balance</span>
        <div className="flex items-center gap-1.5">
          <Gem className={cn("w-4 h-4", balance < creditsNeeded ? "text-amber-400" : "text-purple-400")} />
          <span className={cn("font-semibold", balance < creditsNeeded ? "text-amber-400" : "text-white")}>
            {balance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Call Type */}
      <div className="space-y-2">
        <label className="text-sm text-white/60">Call Type</label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={callType === "video" ? "default" : "outline"}
            className={cn(
              "h-12",
              callType === "video"
                ? "bg-primary hover:bg-primary/90"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            )}
            onClick={() => setCallType("video")}
          >
            <Video className="w-5 h-5 mr-2" />
            Video
          </Button>
          <Button
            type="button"
            variant={callType === "audio" ? "default" : "outline"}
            className={cn(
              "h-12",
              callType === "audio"
                ? "bg-primary hover:bg-primary/90"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            )}
            onClick={() => setCallType("audio")}
          >
            <Phone className="w-5 h-5 mr-2" />
            Audio
          </Button>
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <label className="text-sm text-white/60">Duration</label>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger className="bg-white/5 border-white/10">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            {availableDurations.map((d) => {
              let videoRate = 0;
              switch (d.value) {
                case "15": videoRate = video15Rate || 0; break;
                case "30": videoRate = video30Rate || 0; break;
                case "60": videoRate = video60Rate || 0; break;
                case "90": videoRate = video90Rate || 0; break;
              }
              // ✅ FIX: Show audio rate (70% of video) when audio is selected
              const displayRate = callType === "audio" 
                ? Math.round(videoRate * 0.70) 
                : videoRate;
              return (
                <SelectItem key={d.value} value={d.value}>
                  {d.label} - {displayRate} credits
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label className="text-sm text-white/60 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          Select Date
        </label>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
            className="rounded-xl border border-white/10 bg-white/5"
          />
        </div>
      </div>

      {/* Time */}
      <div className="space-y-2">
        <label className="text-sm text-white/60 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Select Time
        </label>
        <Select value={selectedTime} onValueChange={setSelectedTime}>
          <SelectTrigger className="bg-white/5 border-white/10">
            <SelectValue placeholder="Select time" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {TIME_SLOTS.map((slot) => (
              <SelectItem key={slot.value} value={slot.value}>
                {slot.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary & Book Button */}
      <div className="pt-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Total Cost</span>
          <div className="flex items-center gap-1">
            <Gem className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-white">{creditsNeeded}</span>
          </div>
        </div>

        <Button
          onClick={handleBook}
          disabled={loading || !selectedDate || !selectedTime}
          className={cn(
            "w-full h-12 text-lg font-semibold rounded-xl",
            hasEnoughCredits
              ? "bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400"
              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Booking...
            </>
          ) : hasEnoughCredits ? (
            <>
              <Video className="w-5 h-5 mr-2" />
              Book Video Date
            </>
          ) : (
            <>
              <Gem className="w-5 h-5 mr-2" />
              Need {creditsNeeded - balance} more credits
            </>
          )}
        </Button>
      </div>

      {/* Modals */}
      <LowBalanceModal
        open={showLowBalance}
        onOpenChange={setShowLowBalance}
        onBuyCredits={() => {
          setShowLowBalance(false);
          setShowBuyCredits(true);
        }}
        requiredCredits={creditsNeeded}
        currentBalance={balance}
      />

      <BuyCreditsModal open={showBuyCredits} onOpenChange={setShowBuyCredits} />
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="bg-[#0a0a0f] border-white/10 max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 text-white">
              <Video className="w-5 h-5 text-rose-400" />
              Book Video Date with {earnerName}
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8 overflow-y-auto">
            {Content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0f] border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Video className="w-5 h-5 text-rose-400" />
            Book Video Date with {earnerName}
          </DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
