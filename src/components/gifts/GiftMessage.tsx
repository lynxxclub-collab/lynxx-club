import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { GiftTransaction } from "@/hooks/useGifts";
import { format } from "date-fns";

interface GiftMessageProps {
  transaction: GiftTransaction;
  onReact?: (transactionId: string, reaction: string) => void;
}

const THANK_YOU_REACTIONS = ["❤️", "😘", "👀", "👑"] as const;
type Reaction = (typeof THANK_YOU_REACTIONS)[number];
type AnimationType = "standard" | "premium" | "ultra";

function getAnimationType(t: GiftTransaction): AnimationType {
  const raw = (t.gift as any)?.animation_type;
  return raw === "ultra" || raw === "premium" ? raw : "standard";
}

function getTheme(type: AnimationType) {
  if (type === "ultra") {
    return {
      bubble: "bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-amber-500/25 border border-amber-500/35",
      shimmer: "rgba(251, 191, 36, 0.45)",
      glow: "bg-amber-400/35",
      badge: "bg-amber-500/25 text-amber-200 border border-amber-500/25",
    };
  }
  if (type === "premium") {
    return {
      bubble: "bg-gradient-to-br from-purple-500/25 via-pink-500/15 to-purple-500/25 border border-purple-500/35",
      shimmer: "rgba(168, 85, 247, 0.45)",
      glow: "bg-purple-400/35",
      badge: "bg-purple-500/20 text-purple-200 border border-purple-500/25",
    };
  }
  return {
    bubble: "bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-rose-500/15 border border-rose-500/25",
    shimmer: "rgba(244, 63, 94, 0.35)",
    glow: "bg-rose-400/30",
    badge: "bg-rose-500/15 text-rose-200 border border-rose-500/20",
  };
}

export default function GiftMessage({ transaction, onReact }: GiftMessageProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const isRecipient = user?.id === transaction.recipient_id;
  const isSender = user?.id === transaction.sender_id;

  const animationType = useMemo(() => getAnimationType(transaction), [transaction]);
  const theme = useMemo(() => getTheme(animationType), [animationType]);

  const gift = transaction.gift;
  const emoji = gift?.emoji || "🎁";
  const name = gift?.name || "Gift";

  // Close picker when clicking outside
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleReaction = (reaction: Reaction) => {
    onReact?.(transaction.id, reaction);
    setOpen(false);
  };

  const canReact = isRecipient && !transaction.thank_you_reaction;

  return (
    <div className={cn("flex gap-2", isSender ? "justify-end" : "justify-start")} ref={wrapRef}>
      <div
        className={cn(
          "relative max-w-[82%] rounded-2xl p-4 overflow-hidden",
          "shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
          theme.bubble,
        )}
      >
        {/* shimmer for premium/ultra */}
        {animationType !== "standard" && (
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background: `linear-gradient(105deg, transparent 40%, ${theme.shimmer} 50%, transparent 60%)`,
              animation: "gift-shimmer 2.8s linear infinite",
            }}
          />
        )}

        <div className="relative flex items-center gap-3">
          {/* emoji + glow */}
          <div className="relative shrink-0">
            <span
              className={cn("text-4xl", animationType === "ultra" && "animate-float")}
              style={{ animationDuration: "3s" }}
              aria-hidden="true"
            >
              {emoji}
            </span>
            {animationType !== "standard" && (
              <div className={cn("absolute inset-0 blur-2xl -z-10", theme.glow)} style={{ transform: "scale(1.6)" }} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-white truncate">{name}</span>

              {animationType === "ultra" && (
                <span className={cn("text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap", theme.badge)}>
                  ✨ Premium
                </span>
              )}

              {animationType === "premium" && (
                <span className={cn("text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap", theme.badge)}>
                  💎 Special
                </span>
              )}
            </div>

            {transaction.message?.trim() && (
              <p className="text-sm text-white/85 mt-1 italic break-words">“{transaction.message.trim()}”</p>
            )}

            <p className="text-[11px] text-white/45 mt-1">{format(new Date(transaction.created_at), "h:mm a")}</p>
          </div>
        </div>

        {/* reaction badge */}
        {transaction.thank_you_reaction && (
          <div
            className={cn(
              "absolute -bottom-2 -right-2 text-xl",
              "drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]",
              "animate-pulse",
            )}
            aria-label={`Thank you reaction: ${transaction.thank_you_reaction}`}
          >
            {transaction.thank_you_reaction}
          </div>
        )}
      </div>

      {/* reaction picker */}
      {canReact && (
        <div className="flex items-end">
          {open ? (
            <div
              className={cn(
                "flex gap-1 rounded-full px-2 py-1",
                "bg-[#12121a]/90 backdrop-blur border border-white/10",
                "shadow-[0_10px_30px_rgba(0,0,0,0.45)]",
                "animate-fade-in",
              )}
              role="menu"
              aria-label="Say thanks"
            >
              {THANK_YOU_REACTIONS.map((reaction) => (
                <button
                  key={reaction}
                  type="button"
                  onClick={() => handleReaction(reaction)}
                  className={cn(
                    "text-lg p-1 rounded-full",
                    "hover:scale-125 active:scale-95 transition-transform",
                    "focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:ring-offset-0",
                  )}
                  role="menuitem"
                >
                  {reaction}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "text-xs px-2 py-1 rounded-full",
                "text-white/50 hover:text-white/75",
                "hover:bg-white/5 transition-colors",
              )}
            >
              Say thanks
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes gift-shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </div>
  );
}
