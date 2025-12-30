import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface RecordingIndicatorProps {
  isRecording: boolean;
  startedAt?: Date;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const RecordingIndicator = ({ isRecording, startedAt }: RecordingIndicatorProps) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isRecording || !startedAt) {
      setDuration(0);
      return;
    }

    // Calculate initial duration
    const initialDuration = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    setDuration(initialDuration);

    // Update every second
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, startedAt]);

  if (!isRecording) return null;

  return (
    <div
      className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 z-20",
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-destructive/90 text-white text-sm font-medium"
      )}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
      </span>
      <span>REC</span>
      <span className="tabular-nums">{formatDuration(duration)}</span>
    </div>
  );
};

export default RecordingIndicator;
