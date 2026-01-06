import React, { useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Heart,
  AlertTriangle,
  CreditCard,
  Flag,
  Settings,
  LogOut,
  Shield,
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useProfileImageUrl } from '@/components/ui/ProfileImage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/applications', icon: Users, label: 'Applications', badge: 0 }, // Replace 0 with real data count
  { to: '/admin/verifications', icon: Shield, label: 'Verifications', badge: 3 }, // Example Real-Time Badge
  { to: '/admin/success-stories', icon: Heart, label: 'Success Stories' },
  { to: '/admin/fraud-flags', icon: AlertTriangle, label: 'Fraud Flags', badge: 1 }, // Example Real-Time Badge
  { to: '/admin/transactions', icon: CreditCard, label: 'Transactions' },
  { to: '/admin/payouts', icon: CreditCard, label: 'Payouts' },
  { to: '/admin/revenue', icon: BarChart3, label: 'Revenue' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/reports', icon: Flag, label: 'Reports' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

// Reusable Navigation Items Component
function AdminNavItems({ onClick, isMobile }: { onClick?: () => void; isMobile?: boolean }) {
  return (
    <div className="space-y-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onClick}
          className={({ isActive }) =>
            `group flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-lg shadow-rose-900/20'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <item.icon className={`h-5 w-5 ${isMobile ? 'text-inherit' : ''}`} />
            <span className="font-medium">{item.label}</span>
          </div>
          
          {/* Real-Time Badge Placeholder */}
          {item.badge && item.badge > 0 && (
            <Badge 
              variant={item.to === '/admin/fraud-flags' ? 'destructive' : 'default'} 
              className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
            >
              {item.badge}
            </Badge>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export function AdminLayout() {
  const { isAdmin, loading } = useAdmin();
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const avatarUrl = useProfileImageUrl("profile-photos", profile?.profile_photos?.[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = () => {
    if (mobileMenuOpen) setMobileMenuOpen(false);
  };

  // Determine page title based on current path
  const getPageTitle = () => {
    const activeItem = navItems.find(item => {
      if (item.end) return location.pathname === item.to;
      return location.pathname.startsWith(item.to);
    });
    return activeItem?.label || 'Admin Dashboard';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-rose-500 border-t-transparent"></div>
          <p className="text-white/50 text-sm">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a0f] text-white overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/10 bg-[#0a0a0f]">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg leading-tight block">Lynxx</span>
              <span className="text-xs text-white/50 uppercase tracking-wider">Admin Panel</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <AdminNavItems />
        </nav>

        <div className="p-4 border-t border-white/10">
          <Button
            variant="ghost"
            className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5 h-12"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="h-16 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
          
          {/* Left: Mobile Menu Toggle & Title */}
          <div className="flex items-center gap-4">
            {/* Mobile Hamburger Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-white/80">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-[#0a0a0f] border-white/10 p-0 flex flex-col">
                <SheetHeader className="p-6 border-b border-white/10">
                  <SheetTitle className="flex items-center gap-2 text-white">
                    <Shield className="h-5 w-5 text-rose-500" />
                    Admin Menu
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex-1 p-4 overflow-y-auto">
                  <AdminNavItems onClick={handleLinkClick} isMobile />
                </nav>
                <div className="p-4 border-t border-white/10">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Page Title (Mobile & Desktop) */}
            <h1 className="text-lg sm:text-xl font-semibold text-white truncate">
              {getPageTitle()}
            </h1>
          </div>
          
          {/* Right: User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-10 px-2 sm:px-3 text-white/80 hover:text-white hover:bg-white/5 rounded-full">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-white">{profile?.name || 'Admin'}</p>
                  <p className="text-[10px] text-white/50 uppercase">Super User</p>
                </div>
                <Avatar className="h-8 w-8 border border-white/10">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={profile?.name || 'Admin'} className="w-full h-full object-cover" />
                  ) : (
                    <AvatarFallback className="bg-rose-500/20 text-rose-500 font-bold">
                      {profile?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1a1a20] border-white/10 text-white w-48">
              <DropdownMenuItem onClick={() => signOut()} className="text-white/80 hover:text-white hover:bg-white/10 cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#050507]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}