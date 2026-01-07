import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart,
  Gem,
  User,
  Settings,
  LogOut,
  MessageSquare,
  History,
  Video,
  Rocket,
  Eye,
  Users,
  DollarSign,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";
import { useProfileImageUrl } from "@/components/ui/ProfileImage";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function Header() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const navigate = useNavigate();
  const avatarUrl = useProfileImageUrl("profile-photos", profile?.profile_photos?.[0]);
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const isSeeker = profile?.user_type === "seeker";
  const isEarner = profile?.user_type === "earner";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-md supports-[backdrop-filter]:bg-[#0a0a0f]/80">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="relative shrink-0">
              <Heart className="w-7 h-7 text-rose-400 fill-rose-400/20" />
              <div className="absolute inset-0 blur-lg bg-rose-400/30" />
            </div>
            <span
              className="text-xl font-bold bg-gradient-to-r from-white via-rose-200 to-purple-200 bg-clip-text text-transparent leading-none"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Lynxx Club
            </span>
          </Link>

          {/* Navigation & Actions */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Launch Progress Link */}
            <Link
              to="/launch"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Rocket className="w-4 h-4 text-amber-400" />
              <span>Launch</span>
            </Link>

            {/* Browse Link - Both roles */}
            <Link
              to="/browse"
              className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Browse</span>
            </Link>

            {/* Messages Link - Both roles */}
            <Link
              to="/messages"
              className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Messages</span>
            </Link>

            {/* Video Dates Link - Both roles */}
            <Link
              to="/video-dates"
              className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Video</span>
            </Link>

            {/* Notification Bell */}
            <div className="w-9 h-9 flex items-center justify-center">
              <NotificationBell />
            </div>

            {isSeeker && (
              <>
                {/* Credit Balance from Wallet */}
                <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-white/10 ml-1">
                  <Link to="/credits">
                    <Button
                      variant="ghost"
                      className="h-9 px-2 sm:px-3 gap-2 hover:bg-white/5"
                    >
                      <Gem className="w-4 h-4 text-purple-400" />
                      <span className="font-mono text-sm font-medium text-white">
                        {(wallet?.credit_balance ?? 0).toLocaleString()}
                      </span>
                    </Button>
                  </Link>
                  {/* Buy Button: Text on Desktop, Icon on Mobile */}
                  <Button
                    size={isSeeker ? "icon" : "sm"} // Dynamically handle size
                    onClick={() => setShowBuyCredits(true)}
                    className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white shadow-lg shadow-rose-500/20 shrink-0"
                  >
                    <Plus className="w-4 h-4 sm:hidden" />
                    <span className="hidden sm:inline font-medium">Buy</span>
                  </Button>
                </div>
              </>
            )}

            {isEarner && wallet && (wallet.available_earnings > 0 || wallet.pending_earnings > 0) && (
              <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-white/10 ml-1">
                <Link to="/dashboard">
                  <Button
                    variant="ghost"
                    className="h-9 px-2 sm:px-3 gap-2 hover:bg-white/5"
                  >
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    <span className="font-mono text-sm font-medium text-white">
                      ${(wallet.available_earnings + wallet.pending_earnings).toFixed(2)}
                    </span>
                    <span className="hidden sm:inline text-xs text-white/50 font-sans ml-1">Earnings</span>
                  </Button>
                </Link>
              </div>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-white/5 rounded-full w-9 h-9 ml-1">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile?.name || "Profile"}
                      className="w-full h-full rounded-full object-cover ring-2 ring-white/10 hover:ring-rose-400/50 transition-all"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/10">
                      <User className="w-5 h-5 text-white/70" />
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1f] border-white/10 shadow-xl shadow-black/50">
                <div className="px-3 py-3">
                  <p className="font-semibold text-white truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {profile?.name || "User"}
                  </p>
                  <p className="text-xs text-white/50 uppercase tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {profile?.user_type}
                  </p>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                {isSeeker && (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/credits"
                      className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-white hover:bg-white/5 focus:bg-white/5 focus:text-white"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <History className="w-4 h-4" />
                      Credit History
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link
                    to={`/profile/${profile?.id}`}
                    className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-white hover:bg-white/5 focus:bg-white/5 focus:text-white"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Eye className="w-4 h-4" />
                    View Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-white hover:bg-white/5 focus:bg-white/5 focus:text-white"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-400 cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <BuyCreditsModal
        open={showBuyCredits}
        onOpenChange={setShowBuyCredits}
        onSuccess={() => {
          refreshProfile();
          refetchWallet();
        }}
      />
    </>
  );
}
