import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Image as ImageIcon, Video, Gem, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type NudgeType = "image_unlock" | "video_unlock" | "online_availability" | "low_credits";

interface ChatNudgeProps {
  type: NudgeType;
  onAction: () => void;
  onDismiss: () => void;
  className?: string;
}

const nudgeConfig: Record<
  NudgeType,
  {
    message: string;
    cta: string;
    icon: React.ReactNode;
    description?: string;
    accent: string;
    buttonClass: string;
  }
> = {
  image_unlock: {
    message: "Curious to see more?",
    cta: "Unlock Image",
    description: "Private photo available",
    icon: <ImageIcon className="w-4 h-4" />,
    accent: "bg-gradient-to-br from-rose-500/10 to-pink-500/5 border border-rose-500/20",
    buttonClass: "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-lg shadow-rose-500/20",
  },
  video_unlock: {
    message: "Want something more personal?",
    cta: "View Video",
    description: "Private video from 200 credits",
    icon: <Video className="w-4 h-4" />,
    accent: "bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20",
    buttonClass: "bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white shadow-lg shadow-purple-500/20",
  },
  online_availability: {
    message: "They're online right now",
    cta: "Connect Now",
    description: "Video available for a limited time",
    icon: <Sparkles className="w-4 h-4" />,
    accent: "bg-gradient-to-br from-teal-500/10 to-emerald-500/5 border border-teal-500/20",
    buttonClass: "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-lg shadow-teal-500/20",
  },
  low_credits: {
    message: "You're running low on credits.",
    cta: "Get More",
    description: "Keep the conversation going",
    icon: <Gem className="w-4 h-4" />,
    accent: "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20",
    buttonClass: "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-lg shadow-rose-500/20",
  },
};

export default function ChatNudge({ type, onAction, onDismiss, className }: ChatNudgeProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = nudgeConfig[type];

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "relative w-full mx-2 sm:mx-4 my-2 p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-4",
        "backdrop-blur-md shadow-sm",
        config.accent,
        className,
      )}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="flex items-start sm:items-center gap-3">
        {/* Icon Box */}
        <div className="relative shrink-0">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shadow-inner">
            <div className={cn(
              "text-rose-400",
              type === "video_unlock" && "text-purple-400",
              type === "online_availability" && "text-teal-400",
              type === "low_credits" && "text-amber-400"
            )}>
              {config.icon}
            </div>
          </div>
          {/* Subtle glow behind icon */}
          <div className="absolute inset-0 blur-md opacity-50 -z-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">
            {config.message}
          </p>
          {config.description && (
            <p className="text-xs text-white/60 mt-0.5 line-clamp-1 sm:line-clamp-none">
              {config.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Button
            size="sm"
            onClick={onAction}
            className={cn(
              "h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95",
              config.buttonClass
            )}
          >
            {config.cta}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-9 w-9 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
