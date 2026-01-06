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
import { ChevronLeft, User, Video, MoreVertical, Info, Menu, Home, Search, MessageSquare, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
}

export default function ThreadHeader({
  recipientId,
  recipientName,
  recipientPhoto,
  isOnline,
  onBack,
  onVideoBooking,
  showBack = true,
  isSeeker = false,
  readOnly = false,
}: ThreadHeaderProps) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const navItems = [
    { to: profile?.user_type === 'seeker' ? '/browse' : '/dashboard', icon: profile?.user_type === 'seeker' ? Search : Home, label: profile?.user_type === 'seeker' ? 'Browse' : 'Dashboard' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/video-dates', icon: Video, label: 'Video Dates' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div 
      className="flex-shrink-0 z-10 p-4 border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl safe-area-top" 
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="flex items-center gap-3">
        {/* Back button */}
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full text-white/60 hover:text-white hover:bg-white/5 active:bg-white/10 -ml-1 transition-all"
          >
            <ChevronLeft className="w-7 h-7" />
          </Button>
        )}

        {/* Avatar and info - tappable to go to profile */}
        <button
          onClick={() => window.open(`/profile/${recipientId}`, "_blank")}
          className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-80 transition-opacity"
        >
          <div className="relative flex-shrink-0">
            <Avatar className="w-11 h-11 border-2 border-white/10 bg-white/5">
              <AvatarImage src={recipientPhoto} alt={recipientName} />
              <AvatarFallback className="bg-gradient-to-br from-rose-500/30 to-purple-500/30 text-white border-0">
                {recipientName?.charAt(0) || <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0a0a0f] shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base text-white truncate tracking-tight">{recipientName}</h3>
            {isOnline && (
              <span className="text-xs font-bold uppercase tracking-wide text-green-400">Online</span>
            )}
          </div>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {isSeeker && !readOnly && onVideoBooking && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onVideoBooking}
                  className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 active:bg-rose-500/20 transition-all"
                >
                  <Video className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#1a1a1f] border-white/10 text-white">
                Book Video Date
              </TooltipContent>
            </Tooltip>
          )}

          {/* Mobile Navigation Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full text-white/60 hover:text-white hover:bg-white/5 active:bg-white/10 transition-all"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1f] border-white/10 shadow-2xl shadow-black/50">
              {/* Navigation items */}
              {navItems.map((item) => (
                <DropdownMenuItem
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="text-white/80 focus:bg-white/5 focus:text-white py-3 cursor-pointer"
                >
                  <item.icon className="w-5 h-5 mr-3 text-white/50" />
                  {item.label}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator className="bg-white/10" />
              
              {/* Profile actions */}
              <DropdownMenuItem
                onClick={() => window.open(`/profile/${recipientId}`, "_blank")}
                className="text-white/80 focus:bg-white/5 focus:text-white py-3 cursor-pointer"
              >
                <Info className="w-5 h-5 mr-3 text-white/50" />
                View Profile
              </DropdownMenuItem>
              
              {isSeeker && !readOnly && onVideoBooking && (
                <DropdownMenuItem
                  onClick={onVideoBooking}
                  className="text-white/80 focus:bg-white/5 focus:text-white py-3 cursor-pointer"
                >
                  <Video className="w-5 h-5 mr-3 text-white/50" />
                  Book Video Date
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator className="bg-white/10" />
              
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 py-3 cursor-pointer font-medium"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}