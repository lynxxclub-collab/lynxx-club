import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock, RefreshCw } from "lucide-react";

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
      <div className="flex items-center gap-1.5 mt-1 px-1">
        <RefreshCw className="w-3 h-3 text-green-400" />
        <span className="text-[10px] text-green-400 font-medium">
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
      <div className="flex items-center gap-1.5 mt-1 px-1">
        <Clock className="w-3 h-3 text-amber-400" />
        <span className="text-[10px] text-amber-400">
          {isSeeker ? "Refund pending..." : "Deadline passed"}
        </span>
      </div>
    );
  }

  if (!timeLeft) return null;

  const totalMinutesLeft = timeLeft.hours * 60 + timeLeft.minutes;
  
  // Color based on urgency
  const urgencyClass = cn(
    totalMinutesLeft <= 30 
      ? "text-red-400 animate-pulse" 
      : totalMinutesLeft <= 120 
        ? "text-amber-400" 
        : "text-white/40"
  );

  const timeString = timeLeft.hours > 0 
    ? `${timeLeft.hours}h ${timeLeft.minutes}m`
    : `${timeLeft.minutes}m`;

  return (
    <div className="flex items-center gap-1.5 mt-1 px-1">
      <Clock className={cn("w-3 h-3", urgencyClass)} />
      <span className={cn("text-[10px]", urgencyClass)}>
        {isSeeker 
          ? `${timeString} for reply or refund`
          : `Reply within ${timeString} to earn`
        }
      </span>
    </div>
  );
}
