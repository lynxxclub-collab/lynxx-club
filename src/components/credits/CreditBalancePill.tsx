import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gem, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CreditBalancePill({
  balance,
  to = "/credits",
  lowAt = 20,
  criticalAt = 10,
}: {
  balance: number;
  to?: string;
  lowAt?: number;
  criticalAt?: number;
}) {
  const isCritical = balance <= criticalAt;
  const isLow = balance <= lowAt;

  const ring = isCritical
    ? "ring-2 ring-red-500/40"
    : isLow
      ? "ring-2 ring-amber-500/30"
      : "ring-2 ring-white/10";

  const border = isCritical
    ? "border-red-500/30"
    : isLow
      ? "border-amber-500/30"
      : "border-purple-500/30";

  const bg = isCritical
    ? "bg-red-500/10 hover:bg-red-500/15"
    : isLow
      ? "bg-amber-500/10 hover:bg-amber-500/15"
      : "bg-purple-500/10 hover:bg-purple-500/20";

  const iconColor = isCritical ? "text-red-400" : isLow ? "text-amber-400" : "text-purple-400";

  return (
    <Link to={to} aria-label="View credits">
      <Button
        variant="outline"
        className={cn(
          "gap-2 text-white hover:text-white shadow-sm",
          border,
          bg,
          ring
        )}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {isCritical ? <AlertTriangle className={cn("w-4 h-4", iconColor)} /> : <Gem className={cn("w-4 h-4", iconColor)} />}
        <span className="font-semibold">{balance.toLocaleString()}</span>
        <span className="hidden sm:inline text-white/50">Credits</span>
      </Button>
    </Link>
  );
}