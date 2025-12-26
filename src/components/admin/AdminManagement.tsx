import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, ShieldOff, Search, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  profile_photos: string[] | null;
}

interface SearchUser {
  id: string;
  name: string | null;
  email: string;
  profile_photos: string[] | null;
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

  useEffect(() => {
    loadAdmins();
  }, []);

  async function loadAdmins() {
    try {
      // Get all admin user_ids
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      if (!adminRoles || adminRoles.length === 0) {
        setAdmins([]);
        setLoading(false);
        return;
      }

      // Get profiles for admin users
      const adminIds = adminRoles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, profile_photos')
        .in('id', adminIds);

      if (profilesError) throw profilesError;

      setAdmins(profiles || []);
    } catch (err) {
      console.error('Error loading admins:', err);
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Search profiles by name or email
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, email, profile_photos')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Check which users are already admins
      const adminIds = admins.map(a => a.id);
      const results: SearchUser[] = (profiles || []).map(p => ({
        ...p,
        isAdmin: adminIds.includes(p.id)
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
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) throw error;

      toast.success(`${userName || 'User'} promoted to admin`);
      await loadAdmins();
      // Update search results
      setSearchResults(prev => prev.map(u => 
        u.id === userId ? { ...u, isAdmin: true } : u
      ));
    } catch (err: any) {
      console.error('Error promoting user:', err);
      if (err.code === '23505') {
        toast.error('User is already an admin');
      } else {
        toast.error('Failed to promote user');
      }
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
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast.success(`Admin access revoked from ${userName || 'user'}`);
      await loadAdmins();
      // Update search results
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Management
        </CardTitle>
        <CardDescription>Manage users with administrative access</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Admins */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Current Administrators ({admins.length})</h4>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No administrators found</p>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={admin.profile_photos?.[0]} />
                      <AvatarFallback>{getInitials(admin.name, admin.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{admin.name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                    </div>
                    {admin.id === user?.id && (
                      <Badge variant="outline" className="text-xs">You</Badge>
                    )}
                  </div>
                  {admin.id !== user?.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={actionLoading === admin.id}
                        >
                          {actionLoading === admin.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldOff className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove admin access from {admin.name || admin.email}? 
                            They will no longer be able to access admin features.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => revokeAdmin(admin.id, admin.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

        {/* Add New Admin */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Add New Administrator</h4>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="pl-9"
            />
          </div>
          
          {searching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((searchUser) => (
                <div key={searchUser.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={searchUser.profile_photos?.[0]} />
                      <AvatarFallback>{getInitials(searchUser.name, searchUser.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{searchUser.name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">{searchUser.email}</p>
                    </div>
                    {searchUser.isAdmin && (
                      <Badge variant="secondary" className="text-xs">Admin</Badge>
                    )}
                  </div>
                  {searchUser.isAdmin ? (
                    <Button variant="ghost" size="sm" disabled>
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => promoteToAdmin(searchUser.id, searchUser.name)}
                      disabled={actionLoading === searchUser.id}
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
            <p className="text-sm text-muted-foreground py-2">No users found matching "{searchQuery}"</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
