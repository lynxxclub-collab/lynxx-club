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
  Users,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import BuyCreditsModal from "@/components/credits/BuyCreditsModal";
import { useSignedProfileUrl } from "@/components/ui/ProfileImage";

export default function Header() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const navigate = useNavigate();
  const { signedUrl: avatarUrl } = useSignedProfileUrl(profile?.profile_photos?.[0]);
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
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="relative">
              <Heart className="w-7 h-7 text-rose-400 fill-rose-400/20" />
              <div className="absolute inset-0 blur-lg bg-rose-400/30" />
            </div>
            <span
              className="text-xl font-bold bg-gradient-to-r from-white via-rose-200 to-purple-200 bg-clip-text text-transparent"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Lynxx Club
            </span>
          </Link>

          {/* Navigation & Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Launch Progress Link */}
            <Link
              to="/launch"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Rocket className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Launch</span>
            </Link>

            {/* Browse Link - Both roles */}
            <Link
              to="/browse"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Browse</span>
            </Link>

            {/* Messages Link - Both roles */}
            <Link
              to="/messages"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages</span>
            </Link>

            {/* Video Dates Link - Both roles */}
            <Link
              to="/video-dates"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Video</span>
            </Link>

            {isSeeker && (
              <>
                {/* Credit Balance from Wallet */}
                <div className="flex items-center gap-2">
                  <Link to="/credits">
                    <Button
                      variant="outline"
                      className="gap-2 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-white hover:text-white"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <Gem className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold">
                        {(wallet?.credit_balance ?? profile?.credit_balance ?? 0).toLocaleString()}
                      </span>
                      <span className="hidden sm:inline text-white/50">Credits</span>
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => setShowBuyCredits(true)}
                    className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white shadow-lg shadow-rose-500/20"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Buy
                  </Button>
                </div>
              </>
            )}

            {isEarner && wallet && (wallet.available_earnings > 0 || wallet.pending_earnings > 0) && (
              <div className="flex items-center gap-2">
                <Link to="/dashboard">
                  <Button
                    variant="outline"
                    className="gap-2 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-white hover:text-white"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold">
                      ${(wallet.available_earnings + wallet.pending_earnings).toFixed(2)}
                    </span>
                    <span className="hidden sm:inline text-white/50">Earnings</span>
                  </Button>
                </Link>
              </div>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-white/5 rounded-full">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile?.name || "Profile"}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10 hover:ring-rose-400/50 transition-all"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/10">
                      <User className="w-5 h-5 text-white/70" />
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1f] border-white/10 shadow-xl shadow-black/50">
                <div className="px-3 py-3">
                  <p className="font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {profile?.name || "User"}
                  </p>
                  <p className="text-sm text-white/50 capitalize" style={{ fontFamily: "'DM Sans', sans-serif" }}>
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

      {/* Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </>
  );
}
