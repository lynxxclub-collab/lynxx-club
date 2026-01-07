import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
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
  Loader2,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

// Match the actual wallets table schema
interface Wallet {
  user_id: string;
  credit_balance: number;
  pending_earnings: number;
  available_earnings: number;
  paid_out_total: number;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  user_type: 'seeker' | 'earner' | null;
  account_status: string | null;
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
  const [wallet, setWallet] = useState<Wallet | null>(null);
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
  const [adminLoading, setAdminLoading] = useState(false);
  const [isModifiedExternally, setIsModifiedExternally] = useState(false);

  useEffect(() => {
    if (open && user.id) {
      loadUserData();
      checkAdminStatus();
      
      const channel = supabase
        .channel(`user_profile_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const newStatus = payload.new.account_status;
            
            if (newStatus !== user.account_status) {
              toast.info(`User status changed to: ${newStatus} by another admin.`);
              setIsModifiedExternally(true);
              onUpdate();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, user.id]);

  async function checkAdminStatus() {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  }

  async function loadUserData() {
    if (!user.id) return;

    setLoading(true);
    try {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (walletData) {
        setWallet(walletData);
      }

      const { count: conversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .or(`seeker_id.eq.${user.id},earner_id.eq.${user.id}`);

      const { count: videoDates } = await supabase
        .from('video_dates')
        .select('*', { count: 'exact', head: true })
        .or(`seeker_id.eq.${user.id},earner_id.eq.${user.id}`)
        .eq('status', 'completed');

      // Get spending from transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('credits_amount, transaction_type')
        .eq('user_id', user.id);

      let totalSpent = 0;
      let totalEarned = 0;
      transactions?.forEach(t => {
        if (t.credits_amount < 0) {
          totalSpent += Math.abs(t.credits_amount);
        } else if (t.transaction_type === 'gift_received' || t.transaction_type === 'payout') {
          totalEarned += t.credits_amount;
        }
      });

      setStats({
        conversations: conversations || 0,
        videoDates: videoDates || 0,
        totalEarned: walletData?.available_earnings || 0,
        totalSpent
      });

      setAdminLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
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
      toast.error('Failed to grant admin access');
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
      toast.error('Failed to revoke admin access');
    } finally {
      setAdminLoading(false);
    }
  }

  function getStatusBadge(status: string | null) {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'paused':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Paused</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Suspended</Badge>;
      case 'banned':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Banned</Badge>;
      case 'alumni':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Alumni</Badge>;
      default:
        return <Badge variant="outline">{status || 'Pending'}</Badge>;
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg h-[95vh] sm:max-h-[90vh] p-0 flex flex-col bg-[#0a0a0f] border-white/10">
          
          {/* Header */}
          <DialogHeader className="p-6 pb-2 border-b border-white/10 bg-[#0a0a0f] shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-white/10">
                  <AvatarImage src={user.profile_photos?.[0]} />
                  <AvatarFallback className="bg-rose-500/20 text-rose-400 font-bold text-xl">
                    {user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-xl text-white leading-none mb-1">{user.name || 'No name'}</DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Mail className="h-3 w-3" />
                    <span className="truncate max-w-[200px]">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(user.account_status)}
                    {isAdmin && (
                      <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">
                        <Shield className="h-3 w-3 mr-1" /> Admin
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {isModifiedExternally && (
              <div className="mt-2 text-xs text-orange-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Modified by another admin
              </div>
            )}
          </DialogHeader>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 p-6 space-y-6">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={CreditCard} label="Credits" value={wallet?.credit_balance || 0} />
              <StatCard icon={DollarSign} label="Earnings" value={`$${(wallet?.available_earnings || 0).toFixed(2)}`} />
              <StatCard icon={MessageCircle} label="Chats" value={stats?.conversations || 0} />
              <StatCard icon={Video} label="Dates" value={stats?.videoDates || 0} />
            </div>

            {/* Info Section */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase text-white/40 font-bold tracking-wider">Details</h4>
              <div className="space-y-2 text-sm">
                <InfoRow label="ID" value={user.id.slice(0, 8)} monospace />
                <InfoRow label="Joined" value={user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'} />
                <InfoRow label="Role" value={user.user_type || 'N/A'} />
                <InfoRow label="Location" value={`${user.location_city || ''} ${user.location_state || ''}`} />
              </div>
            </div>

            {/* Ban Reason */}
            {user.account_status === 'banned' && user.ban_reason && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 text-sm font-bold mb-1">
                  <Ban className="h-4 w-4" /> Banned
                </div>
                <p className="text-xs text-red-300/80">{user.ban_reason}</p>
              </div>
            )}

            {/* Admin Section */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-rose-400" />
                  <span className="text-sm font-medium text-white">Admin Access</span>
                </div>
                {user.id !== currentUser?.id && (
                   isAdmin ? (
                    <Button size="sm" variant="outline" onClick={() => setShowRevokeAdminDialog(true)} className="h-8 text-red-400 border-red-500/30 hover:bg-red-500/10">
                      Revoke
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setShowGrantAdminDialog(true)} className="h-8">
                      Grant
                    </Button>
                  )
                )}
                {user.id === currentUser?.id && <Badge variant="secondary">You</Badge>}
              </div>
            </div>

          </ScrollArea>

          {/* Sticky Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-[#050507] shrink-0 space-y-2">
            {user.account_status === 'banned' || user.account_status === 'suspended' ? (
              <Button onClick={handleUnban} disabled={loading} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white">
                Restore Account Access
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setShowSuspendDialog(true)} disabled={loading} className="h-12 border-white/10">
                  <Clock className="h-4 w-4 mr-2" /> Suspend
                </Button>
                <Button variant="destructive" onClick={() => setShowBanDialog(true)} disabled={loading} className="h-12 bg-red-600 hover:bg-red-700">
                  <Ban className="h-4 w-4 mr-2" /> Ban
                </Button>
              </div>
            )}
            <Button 
              variant="ghost" 
              onClick={() => setShowDeleteDialog(true)} 
              disabled={loading} 
              className="w-full h-10 text-red-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent className="bg-[#0a0a0f] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Suspend User</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Temporarily suspend the user's account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="text-white">Duration</Label>
            <select 
              value={suspendDays} 
              onChange={(e) => setSuspendDays(e.target.value)}
              className="w-full mt-2 bg-black/20 border border-white/10 rounded-md p-2 text-white"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} disabled={loading} className="bg-yellow-600 hover:bg-yellow-700 text-white">
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban Dialog */}
      <AlertDialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <AlertDialogContent className="bg-[#0a0a0f] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Ban User Permanently</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This action will permanently ban the user from the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="text-white">Reason for ban (required)</Label>
            <Textarea 
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Describe why this user is being banned..."
              className="mt-2 bg-black/20 border-white/10"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBan} disabled={loading || !banReason.trim()} className="bg-red-600 hover:bg-red-700 text-white">
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#0a0a0f] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete User Account</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This will anonymize the user's data and mark their account as deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Grant Admin Dialog */}
      <AlertDialog open={showGrantAdminDialog} onOpenChange={setShowGrantAdminDialog}>
        <AlertDialogContent className="bg-[#0a0a0f] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Grant Admin Access</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This will give {user.name || 'this user'} full administrative access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGrantAdmin} disabled={adminLoading} className="bg-rose-600 hover:bg-rose-700 text-white">
              {adminLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Grant Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Admin Dialog */}
      <AlertDialog open={showRevokeAdminDialog} onOpenChange={setShowRevokeAdminDialog}>
        <AlertDialogContent className="bg-[#0a0a0f] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Revoke Admin Access</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This will remove admin access from {user.name || 'this user'}. They will no longer be able to access admin features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAdmin} disabled={adminLoading} className="bg-red-600 hover:bg-red-700 text-white">
              {adminLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Revoke Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Helper Components
function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
      <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function InfoRow({ label, value, monospace }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/50">{label}</span>
      <span className={`text-white ${monospace ? 'font-mono text-xs' : ''}`}>{value || 'N/A'}</span>
    </div>
  );
}
