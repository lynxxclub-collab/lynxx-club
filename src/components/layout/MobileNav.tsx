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
    // Note: For Earners, 'Home' and 'Earnings' currently point to the same route.
    ...(isEarner ? [{ to: '/dashboard', icon: DollarSign, label: 'Earnings' }] : []),
    { to: '/settings', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 sm:h-20">
        {navItems.map((item) => {
          // Use startsWith so nested routes (like /messages/123) keep the parent tab active
          // However, we avoid lighting up multiple tabs if they share the same base route (like dashboard)
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full relative transition-colors duration-200 active:scale-95",
                isActive ? "text-rose-400" : "text-white/40 hover:text-white/60"
              )}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <div className="relative">
                {/* Glow effect for active item */}
                {isActive && (
                  <div className="absolute inset-0 bg-rose-500/20 blur-md rounded-full animate-pulse" />
                )}
                <item.icon className={cn("relative z-10 w-6 h-6 transition-transform duration-300", isActive && "scale-110")} />
              </div>
              <span className="text-[10px] font-semibold tracking-wide uppercase">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```
