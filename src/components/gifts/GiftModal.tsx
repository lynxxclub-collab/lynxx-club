import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useGifts, useSendGift } from "@/hooks/useGifts";
import { useWallet } from "@/hooks/useWallet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gem, Loader2, Sparkles, Gift as GiftIcon, ShoppingCart, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

type AnimationType = "standard" | "premium" | "ultra";

type GiftItem = {
  id: string;
  name: string;
  emoji: string;
  credits_cost: number;
  animation_type?: AnimationType | null;
};

interface GiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  recipientName: string;
  conversationId: string | null;
  onGiftSent?: (result: {
    gift_name: string;
    gift_emoji: string;
    animation_type: AnimationType;
    message?: string;
  }) => void;
  onLowBalance?: () => void;
}

function normalizeTier(tier: unknown): AnimationType {
  return tier === "premium" || tier === "ultra" ? tier : "standard";
}

function groupGiftsByTier(gifts: GiftItem[]) {
  const grouped: Record<AnimationType, GiftItem[]> = { standard: [], premium: [], ultra: [] };
  for (const g of gifts) grouped[normalizeTier(g.animation_type)].push(g);
  return grouped;
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        {subtitle ? <div className="text-xs text-white/50">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export default function GiftModal({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  conversationId,
  onGiftSent,
  onLowBalance,
}: GiftModalProps) {
  const { user } = useAuth();
  const { gifts, loading } = useGifts();
  const { sendGift, sending } = useSendGift();
  const { wallet, refetch } = useWallet();
  const isMobile = useIsMobile();

  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const messageWrapRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);

  const balance = wallet?.credit_balance ?? 0;
  const locked = sending;

  // -----------------------------
  // Storage keys (per user)
  // -----------------------------
  const baseKey = useMemo(() => {
    const uid = user?.id ?? "anon";
    const convo = conversationId ?? "no_conversation";
    return `lynxx:gifts:${uid}:${recipientId}:${convo}`;
  }, [user?.id, recipientId, conversationId]);

  const recentKey = useMemo(() => {
    const uid = user?.id ?? "anon";
    return `lynxx:gifts:recent:${uid}:${recipientId}`;
  }, [user?.id, recipientId]);

  // -----------------------------
  // Gifts memo
  // -----------------------------
  const allGifts = useMemo(() => (gifts as GiftItem[]) ?? [], [gifts]);
  const grouped = useMemo(() => groupGiftsByTier(allGifts), [allGifts]);

  const selectedGift = useMemo(
    () => allGifts.find((g) => g.id === selectedGiftId) ?? null,
    [allGifts, selectedGiftId],
  );

  const hasEnoughCredits = useMemo(() => {
    if (!selectedGift) return true;
    return balance >= selectedGift.credits_cost;
  }, [balance, selectedGift]);

  const neededCredits = useMemo(() => {
    if (!selectedGift) return 0;
    return Math.max(0, selectedGift.credits_cost - balance);
  }, [balance, selectedGift]);

  // -----------------------------
  // Load persisted draft/selection when opened
  // -----------------------------
  useEffect(() => {
    if (!open) return;

    type Persisted = { selectedGiftId: string | null; message: string };
    const saved = safeJsonParse<Persisted>(localStorage.getItem(baseKey));

    if (saved) {
      setSelectedGiftId(saved.selectedGiftId ?? null);
      setMessage(saved.message ?? "");
    } else {
      setSelectedGiftId(null);
      setMessage("");
    }
  }, [open, baseKey]);

  // Save draft/selection while open
  useEffect(() => {
    if (!open) return;
    const payload = JSON.stringify({ selectedGiftId, message });
    localStorage.setItem(baseKey, payload);
  }, [open, baseKey, selectedGiftId, message]);

  // -----------------------------
  // Recent gifts
  // -----------------------------
  const recentGiftIds = useMemo(() => {
    const arr = safeJsonParse<string[]>(localStorage.getItem(recentKey)) ?? [];
    // keep unique, most recent first
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const id of arr) {
      if (!seen.has(id)) {
        seen.add(id);
        deduped.push(id);
      }
    }
    return deduped.slice(0, 6);
  }, [recentKey, open]); // recompute when modal opens

  const recentGifts = useMemo(() => {
    if (!recentGiftIds.length) return [];
    const map = new Map(allGifts.map((g) => [g.id, g]));
    return recentGiftIds.map((id) => map.get(id)).filter(Boolean) as GiftItem[];
  }, [recentGiftIds, allGifts]);

  const pushRecent = useCallback(
    (giftId: string) => {
      const current = safeJsonParse<string[]>(localStorage.getItem(recentKey)) ?? [];
      const next = [giftId, ...current.filter((x) => x !== giftId)].slice(0, 10);
      localStorage.setItem(recentKey, JSON.stringify(next));
    },
    [recentKey],
  );

  // -----------------------------
  // Close behavior (locked-safe)
  // -----------------------------
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleClose = useCallback(() => {
    if (locked) return;
    close();
  }, [close, locked]);

  // -----------------------------
  // Selection behavior
  // -----------------------------
  const handlePickGift = useCallback(
    (giftId: string) => {
      if (locked) return;
      setSelectedGiftId(giftId);
    },
    [locked],
  );

  // Scroll + focus message after selecting
  useEffect(() => {
    if (!selectedGift) return;
    const t = window.setTimeout(() => {
      messageWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      messageInputRef.current?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(t);
  }, [selectedGiftId]);

  const handleBuyCredits = useCallback(() => {
    onLowBalance?.();
  }, [onLowBalance]);

  // -----------------------------
  // Send
  // -----------------------------
  const handleSend = useCallback(async () => {
    if (locked) return;

    if (!selectedGiftId || !selectedGift) {
      toast.error("Please select a gift");
      return;
    }

    if (!hasEnoughCredits) {
      onLowBalance?.();
      return;
    }

    const safeMessage = message.trim().slice(0, 100) || "";

    const result = await sendGift(recipientId, selectedGiftId, conversationId, safeMessage);

    if (result.success) {
      toast.success(`Sent ${result.gift_emoji} ${result.gift_name} to ${recipientName}!`);
      refetch();

      onGiftSent?.({
        gift_name: result.gift_name!,
        gift_emoji: result.gift_emoji!,
        animation_type: normalizeTier(result.animation_type),
        message: safeMessage || undefined,
      });

      // update recent + clear persisted draft
      pushRecent(selectedGiftId);
      localStorage.removeItem(baseKey);

      // reset UI
      setSelectedGiftId(null);
      setMessage("");
      close();
      return;
    }

    if (result.error === "Insufficient credits") {
      onLowBalance?.();
      return;
    }

    toast.error(result.error || "Failed to send gift");
  }, [
    locked,
    selectedGiftId,
    selectedGift,
    hasEnoughCredits,
    onLowBalance,
    message,
    sendGift,
    recipientId,
    conversationId,
    recipientName,
    refetch,
    onGiftSent,
    close,
    pushRecent,
    baseKey,
  ]);

  // -----------------------------
  // Keyboard support: Enter / Esc
  // -----------------------------
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Esc closes (unless locked)
      if (e.key === "Escape") {
        if (!locked) handleClose();
        return;
      }

      // Enter sends (only when input is focused OR modal open)
      if (e.key === "Enter") {
        // Don’t steal Enter when typing in other places unless we have a selected gift
        if (!selectedGift) return;

        // Allow shift+enter to just do nothing special
        if (e.shiftKey) return;

        e.preventDefault();

        if (locked) return;

        if (hasEnoughCredits) {
          void handleSend();
        } else {
          handleBuyCredits();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, locked, handleClose, selectedGift, hasEnoughCredits, handleSend, handleBuyCredits]);

  // -----------------------------
  // Gift grid
  // -----------------------------
  const GiftGrid = ({ items }: { items: GiftItem[] }) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {items.map((gift) => {
        const isSelected = selectedGiftId === gift.id;
        const canAfford = balance >= gift.credits_cost;
        const type = normalizeTier(gift.animation_type);

        return (
          <button
            key={gift.id}
            type="button"
            onClick={() => handlePickGift(gift.id)}
            disabled={locked}
            className={cn(
              "relative p-4 rounded-xl border transition-all duration-200",
              "flex flex-col items-center gap-2 select-none",
              isSelected
                ? "border-rose-500 bg-rose-500/20 scale-[1.03]"
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10",
              locked && "opacity-70 cursor-not-allowed",
              type === "premium" && "ring-1 ring-purple-500/30",
              type === "ultra" && "ring-2 ring-amber-500/50",
            )}
            aria-pressed={isSelected}
          >
            {type !== "standard" && (
              <div
                className={cn(
                  "absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                  type === "premium"
                    ? "bg-purple-500 text-white"
                    : "bg-gradient-to-r from-amber-400 to-orange-500 text-black",
                )}
              >
                {type === "premium" ? "✨" : "👑"}
              </div>
            )}

            <span className="text-3xl">{gift.emoji}</span>
            <span className="text-xs font-medium text-white/80 text-center leading-tight">{gift.name}</span>

            <div className="flex items-center gap-1 text-xs text-white/50">
              <Gem className="w-3 h-3" />
              {gift.credits_cost}
            </div>

            {!canAfford && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBuyCredits();
                }}
                className="mt-1 text-[10px] text-amber-300/90 hover:text-amber-200 underline underline-offset-2"
                disabled={locked}
              >
                Need {gift.credits_cost - balance} • Buy
              </button>
            )}
          </button>
        );
      })}
    </div>
  );

  const Content = (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
        </div>
      ) : (
        <>
          {/* Balance */}
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-xl border",
              balance < 100 ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/10",
            )}
          >
            <span className="text-sm text-white/60">Your Balance</span>
            <div className="flex items-center gap-1.5">
              <Gem className={cn("w-4 h-4", balance < 100 ? "text-amber-400" : "text-purple-400")} />
              <span className={cn("font-semibold", balance < 100 ? "text-amber-300" : "text-white")}>
                {balance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Recent gifts */}
          {recentGifts.length > 0 && (
            <Section title="Recent" subtitle="Quick send">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentGifts.map((g) => {
                  const type = normalizeTier(g.animation_type);
                  const canAfford = balance >= g.credits_cost;
                  const isSelected = selectedGiftId === g.id;

                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handlePickGift(g.id)}
                      disabled={locked}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border whitespace-nowrap",
                        "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition",
                        isSelected && "border-rose-500 bg-rose-500/15",
                        !canAfford && "opacity-60",
                        type === "ultra" && "ring-1 ring-amber-500/40",
                        type === "premium" && "ring-1 ring-purple-500/30",
                      )}
                    >
                      <span className="text-lg">{g.emoji}</span>
                      <span className="text-xs text-white/80">{g.name}</span>
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <Gem className="w-3 h-3" />
                        {g.credits_cost}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Gifts */}
          <div className="space-y-5">
            {grouped.standard.length > 0 && (
              <Section title="Standard" subtitle="Classic gifts">
                <GiftGrid items={grouped.standard} />
              </Section>
            )}
            {grouped.premium.length > 0 && (
              <Section title="Premium ✨" subtitle="Extra glow + sound">
                <GiftGrid items={grouped.premium} />
              </Section>
            )}
            {grouped.ultra.length > 0 && (
              <Section title="Ultra 👑" subtitle="Big moment gifts">
                <GiftGrid items={grouped.ultra} />
              </Section>
            )}
          </div>

          {/* Message */}
          {selectedGift && (
            <div ref={messageWrapRef} className="space-y-2 animate-fade-in">
              <label className="text-sm text-white/60">Add a message (optional)</label>
              <Input
                ref={messageInputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 100))}
                placeholder="Say something sweet..."
                maxLength={100}
                disabled={locked}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/40">{message.length}/100</p>

                {!hasEnoughCredits && (
                  <button
                    type="button"
                    onClick={handleBuyCredits}
                    className="text-xs text-amber-300 hover:text-amber-200 inline-flex items-center gap-1"
                    disabled={locked}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Buy {neededCredits} more
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          {selectedGift && (
            <div className="pt-2">
              <Button
                type="button"
                onClick={hasEnoughCredits ? handleSend : handleBuyCredits}
                disabled={locked}
                className={cn(
                  "w-full h-12 text-base font-semibold rounded-xl transition-all",
                  hasEnoughCredits
                    ? "bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400"
                    : "bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/20",
                )}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : hasEnoughCredits ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Send {selectedGift.emoji} {selectedGift.name}
                    <span className="ml-2 text-white/70">({selectedGift.credits_cost} credits)</span>
                  </>
                ) : (
                  <>
                    <Gem className="w-5 h-5 mr-2" />
                    Buy {neededCredits} more credits
                  </>
                )}
              </Button>

              <div className="mt-2 text-[11px] text-white/35 flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                Tip: Press <span className="text-white/60">Enter</span> to send • <span className="text-white/60">Esc</span>{" "}
                to close
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Mobile Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
        <DrawerContent className="bg-[#0a0a0f] border-white/10">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 text-white">
              <GiftIcon className="w-5 h-5 text-rose-400" />
              Send a Gift to {recipientName}
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8">{Content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Dialog
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-lg bg-[#0a0a0f] border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <GiftIcon className="w-5 h-5 text-rose-400" />
            Send a Gift to {recipientName}
          </DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}