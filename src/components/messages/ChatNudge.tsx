import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Image as ImageIcon, Video, Gem, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NudgeType = 'image_unlock' | 'video_unlock' | 'online_availability' | 'low_credits';

interface ChatNudgeProps {
  type: NudgeType;
  onAction: () => void;
  onDismiss: () => void;
  className?: string;
}

const nudgeConfig: Record<NudgeType, {
  message: string;
  cta: string;
  icon: React.ReactNode;
  accent: string;
}> = {
  image_unlock: {
    message: "Curious to see more? 🔥",
    cta: "Unlock Image — 10 credits",
    icon: <ImageIcon className="w-4 h-4" />,
    accent: "from-pink-500/20 to-rose-500/20 border-pink-500/30"
  },
  video_unlock: {
    message: "Want something more personal? 🔥",
    cta: "View Video Options",
    icon: <Video className="w-4 h-4" />,
    accent: "from-purple-500/20 to-violet-500/20 border-purple-500/30"
  },
  online_availability: {
    message: "They're online right now 👀",
    cta: "Unlock Video",
    icon: <Sparkles className="w-4 h-4" />,
    accent: "from-teal/20 to-cyan-500/20 border-teal/30"
  },
  low_credits: {
    message: "You're running low on credits.",
    cta: "Get More Credits",
    icon: <Gem className="w-4 h-4" />,
    accent: "from-amber-500/20 to-orange-500/20 border-amber-500/30"
  }
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
        "mx-4 my-2 p-3 rounded-xl bg-gradient-to-r border transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
        config.accent,
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-lg bg-background/50">
            {config.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{config.message}</p>
            <p className="text-xs text-muted-foreground">
              {type === 'video_unlock' ? 'Private video available from 200 credits' : 
               type === 'online_availability' ? 'Private video available for a limited time.' :
               type === 'low_credits' ? 'Want to keep the conversation going?' : 
               'Unlock a private image if you\'d like.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleAction}
            className="text-xs h-8"
          >
            {config.cta}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
