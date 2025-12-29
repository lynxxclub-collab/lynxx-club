import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { Search, MessageSquare, Video, User, Home, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function MobileNav() {
  const { user, profile } = useAuth();
  const { wallet } = useWallet();
  const location = useLocation();

  const isEarner = profile?.user_type === "earner";

  // Don't show if not logged in
  if (!user) return null;

  const navItems = [
    {
      href: "/browse",
      icon: Search,
      label: "Browse",
      active: location.pathname === "/browse",
    },
    {
      href: "/messages",
      icon: MessageSquare,
      label: "Messages",
      active: location.pathname.startsWith("/messages"),
    },
    {
      href: "/video-dates",
      icon: Video,
      label: "Dates",
      active: location.pathname.startsWith("/video"),
    },
    ...(isEarner
      ? [
          {
            href: "/dashboard",
            icon: Home,
            label: "Dashboard",
            active: location.pathname === "/dashboard",
          },
        ]
      : [
          {
            href: "/credits",
            icon: Gem,
            label: `${wallet?.credit_balance || 0}`,
            active: location.pathname === "/credits",
          },
        ]),
    {
      href: `/profile/${user?.id}`,
      icon: User,
      label: "Profile",
      active: location.pathname.startsWith("/profile"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Gradient fade effect */}
      <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      {/* Nav bar */}
      <div className="bg-background/95 backdrop-blur-lg border-t border-border/50 px-2 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                item.active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-5 h-5 transition-transform", item.active && "scale-110")} />
                {/* Active indicator dot */}
                {item.active && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={cn("text-[10px] font-medium", item.active && "font-semibold")}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
