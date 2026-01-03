import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  ChevronLeft,
  User,
  Video,
  Menu,
  Home,
  Search,
  MessageSquare,
  Settings,
  LogOut,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ThreadHeaderProps {
  recipientId: string;
  recipientName: string;
  recipientPhoto?: string;
  isOnline?: boolean;
  onBack: () => void;
  onVideoBooking?: () => void;
  showBack?: boolean;
  isSeeker?: boolean;
  readOnly?: boolean;
  /** Optional: customize where "Video Dates" goes */
  videoDatesPath?: string;
}

export default function ThreadHeader({
  recipientId,
  recipientName,
  recipientPhoto,
  isOnline = false,
  onBack,
  onVideoBooking,
  showBack = true,
  isSeeker = false,
  readOnly = false,
  videoDatesPath = "/video-dates",
}: ThreadHeaderProps) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const profileUrl = useMemo(() => `/profile/${recipientId}`, [recipientId]);

  const canBookVideo = Boolean(isSeeker && !readOnly && onVideoBooking);

  const navItems = useMemo(() => {
    const isSeekerUser = profile?.user_type === "seeker";
    return [
      {
        to: isSeekerUser ? "/browse" : "/dashboard",
        icon: isSeekerUser ? Search : Home,
        label: isSeekerUser ? "Browse" : "Dashboard",
      },
      { to: "/messages", icon: MessageSquare, label: "Messages" },
      { to: videoDatesPath, icon: Video, label: "Video Dates" },
      { to: "/settings", icon: Settings, label: "Settings" },
    ];
  }, [profile?.user_type, videoDatesPath]);

  const openProfile = useCallback(() => {
    window.open(profileUrl, "_blank", "noopener,noreferrer");
  }, [profileUrl]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast.success("Signed out");
      navigate("/");
    } catch {
      toast.error("Couldn’t sign out");
    }
  }, [signOut, navigate]);

  return (
    <header className="flex-shrink-0 z-10 border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl safe-area-top">
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Back */}
          {showBack && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBack}
              className={cn(
                "h-11 w-11 min-w-[44px] min-h-[44px] rounded-full -ml-1",
                "text-white/60 hover:text-white hover:bg-white/5 active:bg-white/10",
              )}
              aria-label="Back"
            >
              <ChevronLeft className="w-7 h-7" />
            </Button>
          )}

          {/* Recipient */}
          <button
            type="button"
            onClick={openProfile}
            className={cn(
              "flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl",
              "hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors",
              "px-1 py-1",
            )}
            aria-label={`Open ${recipientName} profile`}
          >
            <div className="relative flex-shrink-0">
              <Avatar className="w-11 h-11 border-2 border-white/10">
                <AvatarImage src={recipientPhoto} alt={recipientName} />
                <AvatarFallback className="bg-gradient-to-br from-rose-500/30 to-purple-500/30 text-white">
                  {recipientName?.charAt(0) || <User className="w-5 h-5" />}
                </AvatarFallback>
              </Avatar>

              {isOnline && (
                <span
                  className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0a0a0f]"
                  aria-label="Online"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base text-white truncate">{recipientName || "User"}</h3>
              <p className={cn("text-sm", isOnline ? "text-green-400" : "text-white/40")}>
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {canBookVideo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onVideoBooking}
                    className={cn(
                      "h-11 w-11 min-w-[44px] min-h-[44px] rounded-full",
                      "text-primary hover:text-primary hover:bg-primary/10 active:bg-primary/20",
                    )}
                    aria-label="Book video date"
                  >
                    <Video className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1a1a1f] border-white/10 text-white">
                  Book Video Date
                </TooltipContent>
              </Tooltip>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-11 w-11 min-w-[44px] min-h-[44px] rounded-full",
                    "text-white/60 hover:text-white hover:bg-white/5 active:bg-white/10",
                  )}
                  aria-label="Open menu"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1f] border-white/10">
                {navItems.map((item) => (
                  <DropdownMenuItem
                    key={item.to}
                    onClick={() => navigate(item.to)}
                    className="text-white/80 focus:bg-white/5 focus:text-white py-3"
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  onClick={openProfile}
                  className="text-white/80 focus:bg-white/5 focus:text-white py-3"
                >
                  <Info className="w-5 h-5 mr-3" />
                  View Profile
                </DropdownMenuItem>

                {canBookVideo && (
                  <DropdownMenuItem
                    onClick={onVideoBooking}
                    className="text-white/80 focus:bg-white/5 focus:text-white py-3"
                  >
                    <Video className="w-5 h-5 mr-3" />
                    Book Video Date
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 py-3"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}