import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Gem, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Pack = { id: string; label: string; credits: number; bonus?: number; tag?: string };

export default function BuyCreditsPopover({
  onOpenModal,
  className,
}: {
  onOpenModal: () => void;
  className?: string;
}) {
  const packs: Pack[] = useMemo(
    () => [
      { id: "starter", label: "Starter", credits: 100 },
      { id: "popular", label: "Popular", credits: 550, bonus: 50, tag: "Best value" },
      { id: "flex", label: "Flex", credits: 1200, bonus: 100 },
      { id: "vip", label: "VIP Vault", credits: 3000, bonus: 300 },
    ],
    []
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className={cn(
            "bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400",
            "text-white shadow-lg shadow-rose-500/20",
            className
          )}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Buy
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 bg-[#0f0f16] border-white/10 shadow-2xl shadow-black/60 p-4"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Gem className="w-4 h-4 text-purple-400" />
              <p className="text-white font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Top up credits
              </p>
            </div>
            <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Quick pick a pack (you can change later).
            </p>
          </div>
          <Sparkles className="w-5 h-5 text-amber-400" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {packs.map((p) => (
            <Link key={p.id} to={`/credits?pack=${p.id}`}>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all p-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/90 text-sm font-semibold">{p.label}</span>
                  {p.tag && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/20">
                      {p.tag}
                    </span>
                  )}
                </div>

                <div className="mt-1 text-white/60 text-xs">
                  {p.credits.toLocaleString()} credits
                  {p.bonus ? <span className="text-purple-300"> + {p.bonus} bonus</span> : null}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white"
            onClick={onOpenModal}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Open full checkout
          </Button>

          <Link to="/credits" className="flex-1">
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-400 hover:to-rose-400 text-white"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              View packs <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <p className="mt-3 text-[11px] text-white/40">
          Tip: messaging and unlocks stay consistent — packs may include bonuses.
        </p>
      </PopoverContent>
    </Popover>
  );
}