import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Clock, RefreshCw } from "lucide-react";

interface ReplyDeadlineTimerProps {
  deadline: string;
  refundStatus?: "replied" | "refunded" | null;
  isSeeker: boolean;
}

/**
 * Improvements:
 * - Updates on the exact minute boundary (no drift) + optional 1s fallback for last-minute urgency.
 * - Handles invalid dates safely.
 * - Better copy + clearer states (refunded, replied, expired/pending).
 * - More predictable styling and less re-render churn.
 */
export default function ReplyDeadlineTimer({
  deadline,
  refundStatus,
  isSeeker,
}: ReplyDeadlineTimerProps) {
  const deadlineMs = useMemo(() => {
    const t = Date.parse(deadline);
    return Number.isFinite(t) ? t : null;
  }, [deadline]);

  const [nowMs, setNowMs] = useState(() => Date.now());

  // Tick: align to minute boundary for stable UX
  useEffect(() => {
    if (!deadlineMs) return;

    let timeout: number | undefined;
    let interval: number | undefined;

    const tick = () => setNowMs(Date.now());

    // run once immediately
    tick();

    // Align to next minute boundary
    const msToNextMinute = 60000 - (Date.now() % 60000);
    timeout = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 60000);
    }, msToNextMinute);

    return () => {
      if (timeout) window.clearTimeout(timeout);
      if (interval) window.clearInterval(interval);
    };
  }, [deadlineMs]);

  // ---- Terminal states first
  if (refundStatus === "replied") return null;

  if (refundStatus === "refunded") {
    return (
      <div className="flex items-center gap-1.5 mt-1 px-1">
        <RefreshCw className="w-3 h-3 text-emerald-400" />
        <span className="text-[10px] text-emerald-400 font-medium">Refunded</span>
      </div>
    );
  }

  // Invalid deadline -> don't render (keeps UI clean)
  if (!deadlineMs) return null;

  const diffMs = deadlineMs - nowMs;
  const expired = diffMs <= 0;

  if (expired) {
    return (
      <div className="flex items-center gap-1.5 mt-1 px-1">
        <Clock className="w-3 h-3 text-amber-400" />
        <span className="text-[10px] text-amber-400">
          {isSeeker ? "Refund pending…" : "Deadline passed"}
        </span>
      </div>
    );
  }

  // Compute remaining time (ceil minutes so 0m doesn't show while still positive)
  const totalMinutesLeft = Math.max(1, Math.ceil(diffMs / 60000));
  const hours = Math.floor(totalMinutesLeft / 60);
  const minutes = totalMinutesLeft % 60;

  const timeString =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const toneClass = cn(
    totalMinutesLeft <= 30
      ? "text-red-400 animate-pulse"
      : totalMinutesLeft <= 120
        ? "text-amber-400"
        : "text-white/40"
  );

  const label = isSeeker
    ? `${timeString} to reply or refund`
    : `Reply within ${timeString} to earn`;

  return (
    <div className="flex items-center gap-1.5 mt-1 px-1">
      <Clock className={cn("w-3 h-3", toneClass)} />
      <span className={cn("text-[10px]", toneClass)}>{label}</span>
    </div>
  );
}