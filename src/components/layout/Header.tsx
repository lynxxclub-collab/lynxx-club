import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkles, Gem, User, Settings, LogOut, MessageSquare, History, Video, Rocket, Users } from 'lucide-react';
import { toast } from 'sonner';
import BuyCreditsModal from '@/components/credits/BuyCreditsModal';

export default function Header() {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const isSeeker = profile?.user_type === 'seeker';
  const isEarner = profile?.user_type === 'earner';

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-display font-bold text-gradient-purple">
              Lynxx Club
            </span>
          </Link>

          {/* Navigation & Actions */}
          <div className="flex items-center gap-4">
            {/* Launch Progress Link */}
            <Link 
              to="/launch"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Rocket className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Launch</span>
            </Link>

            {/* Browse Link - Both roles */}
            <Link 
              to="/browse"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Browse</span>
            </Link>

            {/* Messages Link - Both roles */}
            <Link 
              to="/messages"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages</span>
            </Link>

            {/* Video Dates Link - Both roles */}
            <Link 
              to="/video-dates"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Video Dates</span>
            </Link>

            {isSeeker && (
              <>
                {/* Credit Balance */}
                <div className="flex items-center gap-2">
                  <Link to="/credits">
                    <Button variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10">
                      <Gem className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{profile?.credit_balance?.toLocaleString() || 0}</span>
                      <span className="hidden sm:inline text-muted-foreground">Credits</span>
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    onClick={() => setShowBuyCredits(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Buy More
                  </Button>
                </div>
              </>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  {profile?.profile_photos?.[0] ? (
                    <img 
                      src={profile.profile_photos[0]} 
                      alt={profile.name || 'Profile'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                <div className="px-3 py-2">
                  <p className="font-semibold">{profile?.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground capitalize">{profile?.user_type}</p>
                </div>
                <DropdownMenuSeparator />
                {isSeeker && (
                  <DropdownMenuItem asChild>
                    <Link to="/credits" className="flex items-center gap-2 cursor-pointer">
                      <History className="w-4 h-4" />
                      Credit History
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
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
        onSuccess={refreshProfile}
      />
    </>
  );
}
