import React from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
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
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSignedProfileUrl } from '@/components/ui/ProfileImage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/applications', icon: Users, label: 'Applications' },
  { to: '/admin/verifications', icon: Shield, label: 'Verifications' },
  { to: '/admin/success-stories', icon: Heart, label: 'Success Stories' },
  { to: '/admin/fraud-flags', icon: AlertTriangle, label: 'Fraud Flags' },
  { to: '/admin/transactions', icon: CreditCard, label: 'Transactions' },
  { to: '/admin/payouts', icon: CreditCard, label: 'Payouts' },
  { to: '/admin/revenue', icon: BarChart3, label: 'Revenue' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/reports', icon: Flag, label: 'Reports' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];
export function AdminLayout() {
  const { isAdmin, loading } = useAdmin();
  const { profile, signOut } = useAuth();
  const avatarUrl = useSignedProfileUrl("profile-photos", profile?.profile_photos?.[0]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-white/[0.02] border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-white">Lynxx Admin</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Button
            variant="ghost"
            className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-white/10 bg-white/[0.02] px-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Admin Dashboard</h1>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/5">
                <Avatar className="h-8 w-8">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={profile?.name || 'Admin'} className="w-full h-full object-cover" />
                  ) : (
                    <AvatarFallback className="bg-white/10 text-white">
                      {profile?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span>{profile?.name || 'Admin'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black/90 border-white/10">
              <DropdownMenuItem onClick={() => signOut()} className="text-white/80 hover:text-white focus:bg-white/10">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
