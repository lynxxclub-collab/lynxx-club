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
    iconBg: string;
    iconColor: string;
    accent: string;
    buttonStyle: string;
  }
> = {
  image_unlock: {
    message: "Curious to see more? 🔥",
    cta: "Unlock Image — 10 credits",
    icon: <ImageIcon className="w-4 h-4" />,
    iconBg: "bg-rose-500/20",
    iconColor: "text-rose-400",
    accent: "from-rose-500/10 to-pink-500/10 border-rose-500/20",
    buttonStyle: "bg-rose-500 hover:bg-rose-400 text-white",
  },
  video_unlock: {
    message: "Want something more personal? 🔥",
    cta: "View Video Options",
    icon: <Video className="w-4 h-4" />,
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-400",
    accent: "from-purple-500/10 to-violet-500/10 border-purple-500/20",
    buttonStyle: "bg-purple-500 hover:bg-purple-400 text-white",
  },
  online_availability: {
    message: "They're online right now 👀",
    cta: "Unlock Video",
    icon: <Sparkles className="w-4 h-4" />,
    iconBg: "bg-green-500/20",
    iconColor: "text-green-400",
    accent: "from-green-500/10 to-teal-500/10 border-green-500/20",
    buttonStyle: "bg-green-500 hover:bg-green-400 text-white",
  },
  low_credits: {
    message: "You're running low on credits.",
    cta: "Get More Credits",
    icon: <Gem className="w-4 h-4" />,
    iconBg: "bg-rose-500/20",
    iconColor: "text-amber-400",
    accent: "from-amber-500/10 to-orange-500/10 border-amber-500/20",
    buttonStyle: "bg-rose-500 hover:bg-rose-400 text-white",
  },
};

export default function ChatNudge({ type, onAction, onDismiss, className }: ChatNudgeProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = nudgeConfig[type];

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  const handleAction = () => {
    onAction();
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "mx-4 my-2 p-4 rounded-2xl bg-gradient-to-r border transition-all duration-300",
        "animate-in fade-in slide-in-from-bottom-2",
        "backdrop-blur-sm",
        config.accent,
        className,
      )}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={cn("p-2.5 rounded-xl border border-white/10", config.iconBg, config.iconColor)}>
            {config.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{config.message}</p>
            <p className="text-xs text-white/50 mt-0.5">
              {type === "video_unlock"
                ? "Private video available from 200 credits"
                : type === "online_availability"
                  ? "Private video available for a limited time."
                  : type === "low_credits"
                    ? "Want to keep the conversation going?"
                    : "Unlock a private image if you'd like."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleAction}
            className={cn("text-xs h-9 px-4 rounded-xl font-medium shadow-lg transition-all", config.buttonStyle)}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {config.cta}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-white/40 hover:text-white hover:bg-white/10"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
