import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/sanitize';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Calendar,
  Star,
  MessageCircle,
  Video,
  DollarSign,
  CreditCard,
  Ban,
  Clock,
  Trash2,
  ExternalLink,
  Shield,
  ShieldOff,
  Loader2
} from 'lucide-react';


interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  user_type: 'seeker' | 'earner' | null;
  account_status: string | null;
  credit_balance: number | null;
  earnings_balance: number | null;
  average_rating: number | null;
  total_ratings: number | null;
  profile_photos: string[] | null;
  bio: string | null;
  location_city: string | null;
  location_state: string | null;
  created_at: string | null;
  suspend_until: string | null;
  ban_reason: string | null;
  banned_at: string | null;
}

interface UserStats {
  conversations: number;
  videoDates: number;
  totalEarned: number;
  totalSpent: number;
}

interface UserDetailModalProps {
  user: UserProfile;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function UserDetailModal({ user, open, onClose, onUpdate }: UserDetailModalProps) {
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [suspendDays, setSuspendDays] = useState('7');
  const [banReason, setBanReason] = useState('');
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showGrantAdminDialog, setShowGrantAdminDialog] = useState(false);
  const [showRevokeAdminDialog, setShowRevokeAdminDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    if (open && user.id) {
      loadUserStats();
      checkAdminStatus();
    }
  }, [open, user.id]);

  async function checkAdminStatus() {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setAdminLoading(false);
    }
  }


  async function loadUserStats() {
    // Validate user ID before using in queries
    if (!isValidUUID(user.id)) {
      console.error('Invalid user ID format');
      return;
    }

    try {
      // Count conversations using validated user ID
      const { count: conversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .or(`seeker_id.eq.${user.id},earner_id.eq.${user.id}`);

      // Count video dates using validated user ID
      const { count: videoDates } = await supabase
        .from('video_dates')
        .select('*', { count: 'exact', head: true })
        .or(`seeker_id.eq.${user.id},earner_id.eq.${user.id}`);

      // Calculate total earned/spent from transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('usd_amount, transaction_type')
        .eq('user_id', user.id);

      let totalEarned = 0;
      let totalSpent = 0;

      transactions?.forEach(t => {
        const amount = Math.abs(Number(t.usd_amount) || 0);
        if (t.transaction_type === 'earning' || t.transaction_type === 'video_earning') {
          totalEarned += amount;
        } else if (t.transaction_type === 'purchase') {
          totalSpent += amount;
        }
      });

      setStats({
        conversations: conversations || 0,
        videoDates: videoDates || 0,
        totalEarned,
        totalSpent
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  async function handleSuspend() {
    setLoading(true);
    try {
      const days = parseInt(suspendDays);
      const suspendUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('profiles')
        .update({
          account_status: 'suspended',
          suspend_until: suspendUntil.toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`User suspended for ${days} days`);
      setShowSuspendDialog(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    } finally {
      setLoading(false);
    }
  }

  async function handleBan() {
    if (!banReason.trim()) {
      toast.error('Please provide a reason for the ban');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          account_status: 'banned',
          ban_reason: banReason.trim(),
          banned_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('User banned permanently');
      setShowBanDialog(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnban() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          account_status: 'active',
          ban_reason: null,
          banned_at: null,
          suspend_until: null
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('User unbanned');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      // Note: This would typically be done via an edge function with proper authorization
      // For now, we'll just mark the account as deleted
      const { error } = await supabase
        .from('profiles')
        .update({
          account_status: 'deleted',
          name: '[Deleted User]',
          bio: null,
          profile_photos: []
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('User account deleted');
      setShowDeleteDialog(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setLoading(false);
    }
  }

  async function handleGrantAdmin() {
    setAdminLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'admin' });

      if (error) throw error;

      toast.success(`${user.name || 'User'} granted admin access`);
      setIsAdmin(true);
      setShowGrantAdminDialog(false);
    } catch (err: any) {
      console.error('Error granting admin:', err);
      if (err.code === '23505') {
        toast.error('User is already an admin');
      } else {
        toast.error('Failed to grant admin access');
      }
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleRevokeAdmin() {
    if (user.id === currentUser?.id) {
      toast.error("You cannot revoke your own admin access");
      return;
    }

    setAdminLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id)
        .eq('role', 'admin');

      if (error) throw error;

      toast.success(`Admin access revoked from ${user.name || 'user'}`);
      setIsAdmin(false);
      setShowRevokeAdminDialog(false);
    } catch (error) {
      console.error('Error revoking admin:', error);
      toast.error('Failed to revoke admin access');
    } finally {
      setAdminLoading(false);
    }
  }

  function getStatusBadge(status: string | null) {

    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-500">Suspended</Badge>;
      case 'banned':
        return <Badge variant="destructive">Banned</Badge>;
      case 'alumni':
        return <Badge className="bg-purple-500">Alumni</Badge>;
      case 'deleted':
        return <Badge variant="outline">Deleted</Badge>;
      default:
        return <Badge variant="outline">{status || 'Pending'}</Badge>;
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              User Details
              {getStatusBadge(user.account_status)}
              {!adminLoading && isAdmin && (
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.profile_photos?.[0]} />
                <AvatarFallback className="text-2xl">
                  {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{user.name || 'No name'}</h3>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="outline" className="capitalize">
                    {user.user_type || 'N/A'}
                  </Badge>
                  {user.location_city && user.location_state && (
                    <span className="text-sm text-muted-foreground">
                      {user.location_city}, {user.location_state}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Joined
                </p>
                <p className="font-medium">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Rating
                </p>
                <p className="font-medium">
                  {user.average_rating
                    ? `${Number(user.average_rating).toFixed(1)} ⭐ (${user.total_ratings} reviews)`
                    : 'No ratings'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Stats */}
            <div>
              <h4 className="font-medium mb-3">Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Credits
                  </p>
                  <p className="text-lg font-semibold">{user.credit_balance || 0}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Earnings
                  </p>
                  <p className="text-lg font-semibold">
                    ${Number(user.earnings_balance || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Conversations
                  </p>
                  <p className="text-lg font-semibold">{stats?.conversations || 0}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Video Dates
                  </p>
                  <p className="text-lg font-semibold">{stats?.videoDates || 0}</p>
                </div>
              </div>
            </div>

            {/* Ban Info */}
            {user.account_status === 'banned' && user.ban_reason && (
              <>
                <Separator />
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                  <h4 className="font-medium text-destructive flex items-center gap-2">
                    <Ban className="h-4 w-4" />
                    Ban Information
                  </h4>
                  <p className="text-sm mt-2">
                    <strong>Reason:</strong> {user.ban_reason}
                  </p>
                  {user.banned_at && (
                    <p className="text-sm text-muted-foreground">
                      Banned on: {new Date(user.banned_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Suspension Info */}
            {user.account_status === 'suspended' && user.suspend_until && (
              <>
                <Separator />
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-600 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Suspension Information
                  </h4>
                  <p className="text-sm mt-2">
                    Suspended until: {new Date(user.suspend_until).toLocaleDateString()}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Admin Role Management */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin Access
              </h4>
              {adminLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking admin status...
                </div>
              ) : isAdmin ? (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">This user has admin privileges</span>
                  </div>
                  {user.id !== currentUser?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setShowRevokeAdminDialog(true)}
                      disabled={adminLoading}
                    >
                      <ShieldOff className="h-4 w-4 mr-1" />
                      Revoke Admin
                    </Button>
                  )}
                  {user.id === currentUser?.id && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm text-muted-foreground">This user is not an admin</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGrantAdminDialog(true)}
                    disabled={adminLoading}
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Grant Admin Access
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="font-medium">Account Actions</h4>
              <div className="flex flex-wrap gap-2">
                {user.account_status === 'banned' || user.account_status === 'suspended' ? (
                  <Button onClick={handleUnban} disabled={loading}>
                    Restore Account
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowSuspendDialog(true)}
                      disabled={loading}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Suspend
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowBanDialog(true)}
                      disabled={loading}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Ban User
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User</AlertDialogTitle>
            <AlertDialogDescription>
              This will temporarily suspend the user's account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Suspension Duration</Label>
            <Select value={suspendDays} onValueChange={setSuspendDays}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} disabled={loading}>
              Suspend User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban Dialog */}
      <AlertDialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban User Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently ban the user from the platform. This action can be reversed by an admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Reason for Ban</Label>
            <Textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Provide a reason for this ban..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBan}
              disabled={loading || !banReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user's account and anonymize their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Grant Admin Dialog */}
      <AlertDialog open={showGrantAdminDialog} onOpenChange={setShowGrantAdminDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to grant admin access to {user.name || user.email}? 
              They will be able to access all admin features including user management.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGrantAdmin} disabled={adminLoading}>
              Grant Admin Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Admin Dialog */}
      <AlertDialog open={showRevokeAdminDialog} onOpenChange={setShowRevokeAdminDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke admin access from {user.name || user.email}? 
              They will no longer be able to access admin features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAdmin}
              disabled={adminLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Admin Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
