import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock, RefreshCw, AlertCircle } from "lucide-react";

interface ReplyDeadlineTimerProps {
  deadline: string;
  refundStatus?: 'replied' | 'refunded' | null;
  isSeeker: boolean;
}

export default function ReplyDeadlineTimer({ 
  deadline, 
  refundStatus, 
  isSeeker 
}: ReplyDeadlineTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number } | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const diff = deadlineTime - now;

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft({ hours, minutes });
      setExpired(false);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline]);

  // If already refunded, show refunded status
  if (refundStatus === 'refunded') {
    return (
      <div className="flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 w-fit">
        <RefreshCw className="w-3 h-3 text-green-400" />
        <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">
          Refunded
        </span>
      </div>
    );
  }

  // If replied, don't show timer
  if (refundStatus === 'replied') {
    return null;
  }

  // If expired and no refund status yet, show pending
  if (expired) {
    return (
      <div className="flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 w-fit">
        <Clock className="w-3 h-3 text-amber-400" />
        <span className="text-[10px] text-amber-400 font-medium uppercase tracking-wide">
          {isSeeker ? "Refund pending..." : "Deadline passed"}
        </span>
      </div>
    );
  }

  if (!timeLeft) return null;

  const totalMinutesLeft = timeLeft.hours * 60 + timeLeft.minutes;
  
  // Color based on urgency
  // Using Rose (Primary) for urgent to match theme, Amber for warning
  const urgencyClass = cn(
    totalMinutesLeft <= 30 
      ? "text-rose-400 animate-pulse" 
      : totalMinutesLeft <= 120 
        ? "text-amber-400" 
        : "text-white/40"
  );

  const timeString = timeLeft.hours > 0 
    ? `${timeLeft.hours}h ${timeLeft.minutes}m`
    : `${timeLeft.minutes}m`;

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full border w-fit transition-colors",
        totalMinutesLeft <= 30
          ? "bg-rose-500/10 border-rose-500/20"
          : totalMinutesLeft <= 120
            ? "bg-amber-500/10 border-amber-500/20"
            : "bg-white/5 border-white/10"
      )}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Clock className={cn("w-3 h-3", urgencyClass)} />
      <span className={cn("text-[10px] font-medium uppercase tracking-wide", urgencyClass)}>
        {isSeeker 
          ? `${timeString} for reply or refund`
          : `Reply within ${timeString} to earn`
        }
      </span>
    </div>
  );
}