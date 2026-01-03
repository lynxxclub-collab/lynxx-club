import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Image as ImageIcon, Video, Gem, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type NudgeType = "image_unlock" | "video_unlock" | "online_availability" | "low_credits";

interface ChatNudgeProps {
  type: NudgeType;
  onAction: () => void;
  onDismiss: () => void;
  className?: string;

  /** Optional overrides */
  subtitle?: string;
  ctaLabel?: string;
  disabled?: boolean;
}

type NudgeConfig = {
  title: string;
  defaultSubtitle: string;
  defaultCta: string;
  icon: React.ReactNode;
  accentClass: string;
  iconWrapClass: string;
  buttonClass: string;
};

const NUDGES: Record<NudgeType, NudgeConfig> = {
  image_unlock: {
    title: "Curious to see more? 🔥",
    defaultSubtitle: "Unlock a private image if you'd like.",
    defaultCta: "Unlock Image — 10 credits",
    icon: <ImageIcon className="w-4 h-4" />,
    accentClass: "from-rose-500/10 to-pink-500/10 border-rose-500/20",
    iconWrapClass: "bg-rose-500/20 text-rose-300",
    buttonClass: "bg-rose-500 hover:bg-rose-400 text-white",
  },
  video_unlock: {
    title: "Want something more personal? 🔥",
    defaultSubtitle: "Private video options start at 200 credits.",
    defaultCta: "View Video Options",
    icon: <Video className="w-4 h-4" />,
    accentClass: "from-purple-500/10 to-violet-500/10 border-purple-500/20",
    iconWrapClass: "bg-purple-500/20 text-purple-300",
    buttonClass: "bg-purple-500 hover:bg-purple-400 text-white",
  },
  online_availability: {
    title: "They're online right now 👀",
    defaultSubtitle: "Private video available for a limited time.",
    defaultCta: "Unlock Video",
    icon: <Sparkles className="w-4 h-4" />,
    accentClass: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
    iconWrapClass: "bg-emerald-500/20 text-emerald-300",
    buttonClass: "bg-emerald-500 hover:bg-emerald-400 text-white",
  },
  low_credits: {
    title: "You're running low on credits.",
    defaultSubtitle: "Want to keep the conversation going?",
    defaultCta: "Get More Credits",
    icon: <Gem className="w-4 h-4" />,
    accentClass: "from-amber-500/10 to-orange-500/10 border-amber-500/20",
    iconWrapClass: "bg-amber-500/20 text-amber-300",
    buttonClass: "bg-amber-500 hover:bg-amber-400 text-black",
  },
};

export default function ChatNudge({
  type,
  onAction,
  onDismiss,
  className,
  subtitle,
  ctaLabel,
  disabled,
}: ChatNudgeProps) {
  const [visible, setVisible] = useState(true);

  const cfg = useMemo(() => NUDGES[type], [type]);
  const resolvedSubtitle = subtitle ?? cfg.defaultSubtitle;
  const resolvedCta = ctaLabel ?? cfg.defaultCta;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mx-4 my-2 p-4 rounded-2xl border bg-gradient-to-r backdrop-blur-sm",
        "transition-all duration-300",
        "animate-in fade-in slide-in-from-bottom-2",
        cfg.accentClass,
        className
      )}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={cn("shrink-0 p-2.5 rounded-xl border border-white/10", cfg.iconWrapClass)}>
            {cfg.icon}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-snug">{cfg.title}</p>
            <p className="text-xs text-white/55 mt-1 leading-snug">{resolvedSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={onAction}
            disabled={disabled}
            className={cn(
              "text-xs h-9 px-4 rounded-xl font-semibold shadow-lg transition-all",
              "active:scale-[0.98]",
              cfg.buttonClass
            )}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {resolvedCta}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-9 w-9 rounded-xl text-white/40 hover:text-white hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}