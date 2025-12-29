import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Sparkles,
  User,
  Settings,
  LogOut,
  Gem,
  Bell,
  MessageSquare,
  Video,
  Menu,
  Heart,
  Wallet,
  Search,
  Home,
  CreditCard,
} from "lucide-react";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";

interface Notification {
  id: string;
  type: "message" | "video_date" | "like" | "rating";
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const { wallet } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isEarner = profile?.user_type === "earner";

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;

      const mockNotifications: Notification[] = [];

      const { count: unreadMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .is("read_at", null);

      if (unreadMessages && unreadMessages > 0) {
        mockNotifications.push({
          id: "messages",
          type: "message",
          title: "New Messages",
          body: `You have ${unreadMessages} unread message${unreadMessages > 1 ? "s" : ""}`,
          read: false,
          created_at: new Date().toISOString(),
          link: "/messages",
        });
      }

      if (isEarner) {
        const { count: pendingDates } = await supabase
          .from("video_dates")
          .select("*", { count: "exact", head: true })
          .eq("earner_id", user.id)
          .eq("status", "pending");

        if (pendingDates && pendingDates > 0) {
          mockNotifications.push({
            id: "video-dates",
            type: "video_date",
            title: "Pending Video Dates",
            body: `You have ${pendingDates} pending request${pendingDates > 1 ? "s" : ""}`,
            read: false,
            created_at: new Date().toISOString(),
            link: "/video-dates",
          });
        }
      }

      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter((n) => !n.read).length);
    };

    fetchNotifications();

    const channel = supabase
      .channel("header-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user?.id}`,
        },
        () => {
          fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isEarner]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navLinks = [
    { href: "/browse", label: "Browse", icon: Search },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/video-dates", label: "Video Dates", icon: Video },
    ...(isEarner ? [{ href: "/dashboard", label: "Dashboard", icon: Home }] : []),
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="w-4 h-4 text-primary" />;
      case "video_date":
        return <Video className="w-4 h-4 text-teal" />;
      case "like":
        return <Heart className="w-4 h-4 text-primary" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" />
            <span className="text-xl font-display font-bold text-foreground">Lynxx</span>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} to={link.href}>
                  <Button variant={location.pathname === link.href ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {!isEarner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBuyCredits(true)}
                    className="hidden sm:flex gap-2 border-primary/30"
                  >
                    <Gem className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">
                      {wallet?.credit_balance?.toLocaleString() || 0}
                    </span>
                  </Button>
                )}

                {isEarner && (
                  <Link to="/dashboard">
                    <Button variant="outline" size="sm" className="hidden sm:flex gap-2 border-teal/30">
                      <Wallet className="w-4 h-4 text-teal" />
                      <span className="font-semibold text-teal">${(wallet?.available_earnings || 0).toFixed(2)}</span>
                    </Button>
                  </Link>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="w-5 h-5 text-muted-foreground" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-background flex items-center justify-center font-medium">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 bg-card border-border">
                    <DropdownMenuLabel className="text-foreground">Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No new notifications</div>
                    ) : (
                      notifications.map((notif) => (
                        <DropdownMenuItem
                          key={notif.id}
                          onClick={() => notif.link && navigate(notif.link)}
                          className="flex items-start gap-3 p-3 cursor-pointer"
                        >
                          <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground">{notif.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{notif.body}</p>
                          </div>
                          {!notif.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />}
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={profile?.profile_photos?.[0]} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {profile?.name?.charAt(0) || <User className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="text-foreground">{profile?.name || "User"}</span>
                        <span className="text-xs font-normal text-muted-foreground">{profile?.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onClick={() => navigate(`/profile/${user.id}`)}>
                      <User className="w-4 h-4 mr-2" />
                      My Profile
                    </DropdownMenuItem>
                    {!isEarner && (
                      <DropdownMenuItem onClick={() => setShowBuyCredits(true)}>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Buy Credits
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-72 bg-card border-border">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2 text-foreground">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Lynxx Club
                      </SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col gap-2 mt-6">
                      {navLinks.map((link) => (
                        <Link key={link.href} to={link.href} onClick={() => setMobileMenuOpen(false)}>
                          <Button
                            variant={location.pathname === link.href ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3"
                          >
                            <link.icon className="w-5 h-5" />
                            {link.label}
                          </Button>
                        </Link>
                      ))}
                      <div className="border-t border-border my-4" />
                      <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start gap-3">
                          <Settings className="w-5 h-5" />
                          Settings
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-destructive"
                        onClick={handleSignOut}
                      >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                      </Button>
                    </nav>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <>
                <Link to="/auth?mode=login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <BuyCreditsModal open={showBuyCredits} onOpenChange={setShowBuyCredits} />
    </>
  );
}
