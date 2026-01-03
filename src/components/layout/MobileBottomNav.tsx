// wherever your main page wrapper is:
<div className="pb-20 md:pb-0">
  {/* page content */}
</div>
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Rocket, Users, MessageSquare, Video, Gem } from "lucide-react";

type Item = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
};

export default function MobileBottomNav({
  showCredits = false,
  creditsTo = "/credits",
}: {
  showCredits?: boolean;
  creditsTo?: string;
}) {
  const items: Item[] = [
    { to: "/launch", label: "Launch", Icon: Rocket, iconClassName: "text-amber-400" },
    { to: "/browse", label: "Browse", Icon: Users },
    { to: "/messages", label: "Messages", Icon: MessageSquare },
    { to: "/video-dates", label: "Video", Icon: Video },
  ];

  if (showCredits) {
    items.push({ to: creditsTo, label: "Credits", Icon: Gem, iconClassName: "text-purple-400" });
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="border-t border-white/10 bg-[#0a0a0f]/85 backdrop-blur-xl">
        <div className="container px-3">
          <div className="grid grid-cols-5 gap-1 py-2">
            {items.slice(0, 5).map(({ to, label, Icon, iconClassName }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all",
                    "text-white/60 hover:text-white hover:bg-white/5",
                    isActive && "text-white bg-white/5 border border-white/10"
                  )
                }
                aria-label={label}
              >
                <Icon className={cn("w-5 h-5", iconClassName)} />
                <span className="text-[10px] leading-none">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}