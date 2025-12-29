import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Home, Search, MessageSquare, DollarSign, User, Video } from 'lucide-react';

export default function MobileNav() {
  const { profile } = useAuth();
  const location = useLocation();
  
  const isSeeker = profile?.user_type === 'seeker';
  const isEarner = profile?.user_type === 'earner';

  const navItems = [
    { 
      to: isSeeker ? '/browse' : '/dashboard', 
      icon: isSeeker ? Search : Home, 
      label: isSeeker ? 'Browse' : 'Home' 
    },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/video-dates', icon: Video, label: 'Videos' },
    ...(isSeeker ? [{ to: '/credits', icon: DollarSign, label: 'Credits' }] : []),
    ...(isEarner ? [{ to: '/dashboard', icon: DollarSign, label: 'Earnings' }] : []),
    { to: '/settings', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "scale-110")} />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}