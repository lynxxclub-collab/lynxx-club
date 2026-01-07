import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, ShieldOff, Search, Loader2, UserPlus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  profile_photos: string[] | null;
  isAdmin: boolean;
}

interface SearchUser extends AdminUser {
  isAdmin: boolean;
}

export function AdminManagement() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Load Admins with Real-Time Polling - now uses user_roles table
  const loadAdmins = async () => {
    try {
      // Query user_roles to get all admins, then join with profiles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;
      
      if (!adminRoles || adminRoles.length === 0) {
        setAdmins([]);
        setLoading(false);
        setIsPolling(false);
        return;
      }

      const adminIds = adminRoles.map(r => r.user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, profile_photos')
        .in('id', adminIds)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      
      setAdmins((profiles || []).map(p => ({ ...p, isAdmin: true })));
    } catch (err) {
      console.error('Error loading admins:', err);
    } finally {
      setLoading(false);
      setIsPolling(false);
    }
  };

  useEffect(() => {
    loadAdmins();

    const interval = setInterval(() => {
      setIsPolling(true);
      loadAdmins();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function searchUsers(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, email, profile_photos')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Check admin status from user_roles table
      const profileIds = (profiles || []).map(p => p.id);
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('user_id', profileIds)
        .eq('role', 'admin');

      const adminUserIds = new Set((adminRoles || []).map(r => r.user_id));
      
      const results: SearchUser[] = (profiles || []).map(p => ({
        ...p,
        isAdmin: adminUserIds.has(p.id)
      }));

      setSearchResults(results);
    } catch (err) {
      console.error('Error searching users:', err);
      toast.error('Failed to search users');
    } finally {
      setSearching(false);
    }
  }

  async function promoteToAdmin(userId: string, userName: string | null) {
    setActionLoading(userId);
    try {
      // Insert into user_roles table
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) throw error;

      toast.success(`${userName || 'User'} promoted to admin`);
      await loadAdmins();
      
      setSearchResults(prev => prev.map(u => 
        u.id === userId ? { ...u, isAdmin: true } : u
      ));
    } catch (err: any) {
      console.error('Error promoting user:', err);
      toast.error('Failed to promote user');
    } finally {
      setActionLoading(null);
    }
  }

  async function revokeAdmin(userId: string, userName: string | null) {
    if (userId === user?.id) {
      toast.error("You cannot remove your own admin access");
      return;
    }

    setActionLoading(userId);
    try {
      // Delete from user_roles table
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast.success(`Admin access revoked from ${userName || 'user'}`);
      await loadAdmins();
      
      setSearchResults(prev => prev.map(u => 
        u.id === userId ? { ...u, isAdmin: false } : u
      ));
    } catch (err) {
      console.error('Error revoking admin:', err);
      toast.error('Failed to revoke admin access');
    } finally {
      setActionLoading(null);
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  return (
    <Card className="bg-[#0a0a0f] border-white/10 shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-rose-500" />
              Admin Management
            </CardTitle>
            <CardDescription className="mt-1">Manage users with administrative access</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={loadAdmins}
            className="text-white/50 hover:text-white"
            title="Refresh List"
          >
            <RefreshCw className={cn("h-4 w-4", isPolling && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Current Admins Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              Current Administrators ({admins.length})
            </h4>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
            </div>
          ) : admins.length === 0 ? (
            <div className="p-8 rounded-xl bg-white/5 border border-white/5 text-center">
              <ShieldOff className="h-8 w-8 mx-auto text-white/20 mb-2" />
              <p className="text-sm text-white/50">No administrators found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div 
                  key={admin.id} 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                    "bg-[#0a0a0f] border-white/10",
                    admin.id === user?.id && "border-rose-500/30 bg-rose-500/5"
                  )}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 border border-white/10 shrink-0">
                      <AvatarImage src={admin.profile_photos?.[0]} />
                      <AvatarFallback className="bg-rose-500/20 text-rose-400 font-bold">
                        {getInitials(admin.name, admin.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-white truncate">{admin.name || 'No name'}</p>
                        {admin.id === user?.id && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-rose-500 text-white border-rose-500">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-white/50 truncate">{admin.email}</p>
                    </div>
                  </div>

                  {admin.id !== user?.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="text-white/50 hover:text-red-400 hover:bg-white/5 h-9 w-9 p-0 shrink-0"
                          disabled={actionLoading === admin.id}
                        >
                          {actionLoading === admin.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldOff className="h-5 w-5" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#0a0a0f] border-white/10">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Remove Admin Access</AlertDialogTitle>
                          <AlertDialogDescription className="text-white/60">
                            Are you sure you want to remove admin access from <span className="text-white font-bold">{admin.name || admin.email}</span>? 
                            They will no longer be able to access admin features.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="text-white hover:bg-white/10 border-white/10">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => revokeAdmin(admin.id, admin.name)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Remove Access
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10 w-full" />

        {/* Add New Admin Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
            Add New Administrator
          </h4>
          
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-rose-500 transition-colors" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-white/5 border-white/10 text-white focus-visible:ring-rose-500/50"
            />
          </div>
          
          {searching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-rose-500" />
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {searchResults.map((searchUser) => (
                <div key={searchUser.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={searchUser.profile_photos?.[0]} />
                      <AvatarFallback>{getInitials(searchUser.name, searchUser.email)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{searchUser.name || 'No name'}</p>
                      <p className="text-xs text-white/50 truncate">{searchUser.email}</p>
                    </div>
                    {searchUser.isAdmin && (
                      <Badge variant="secondary" className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/20">
                        Admin
                      </Badge>
                    )}
                  </div>
                  {searchUser.isAdmin ? (
                    <Button variant="ghost" size="sm" disabled className="opacity-50">
                      <Shield className="h-4 w-4 text-white/30" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => promoteToAdmin(searchUser.id, searchUser.name)}
                      disabled={actionLoading === searchUser.id}
                      className="border-white/10 hover:bg-rose-500 hover:text-white hover:border-rose-500 text-white"
                    >
                      {actionLoading === searchUser.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" />
                          Promote
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!searching && searchQuery && searchResults.length === 0 && (
            <div className="p-4 rounded-lg bg-white/5 border border-dashed border-white/10 text-center">
              <p className="text-sm text-white/40">No users found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
