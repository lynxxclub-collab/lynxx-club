import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Wallet,
  Clock,
  CheckCircle,
  DollarSign,
  Users,
  Search,
  Download,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  stripe_transfer_id: string | null;
  created_at: string;
  processed_at: string | null;
  user?: {
    name: string;
    email: string;
  };
}

interface CreatorWithHold {
  user_id: string;
  name: string;
  email: string;
  available_earnings: number;
  payout_hold: boolean;
  payout_hold_reason: string | null;
}

interface Stats {
  totalPending: number;
  totalCompleted: number;
  averageAmount: number;
  connectedAccounts: number;
  creatorsOnHold: number;
}

const PAYOUT_MINIMUM = 25.00;

export default function AdminPayouts() {
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [creatorsWithHold, setCreatorsWithHold] = useState<CreatorWithHold[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPending: 0,
    totalCompleted: 0,
    averageAmount: 0,
    connectedAccounts: 0,
    creatorsOnHold: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<CreatorWithHold | null>(null);
  const [holdReason, setHoldReason] = useState('');
  const [processingHold, setProcessingHold] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch withdrawals
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      // Fetch user details for each withdrawal
      const enrichedWithdrawals = await Promise.all(
        (withdrawalsData || []).map(async (w) => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', w.user_id)
            .single();
          return { ...w, user: userData } as Withdrawal;
        })
      );

      setWithdrawals(enrichedWithdrawals);

      // Calculate stats
      let totalPending = 0;
      let totalCompleted = 0;
      let completedCount = 0;

      (withdrawalsData || []).forEach((w) => {
        if (['pending', 'processing'].includes(w.status)) {
          totalPending += w.amount;
        } else if (w.status === 'completed') {
          totalCompleted += w.amount;
          completedCount++;
        }
      });

      // Count connected accounts
      const { count: connectedAccounts } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('stripe_onboarding_complete', true)
        .not('stripe_account_id', 'is', null);

      // Count creators on hold
      const { count: creatorsOnHold } = await supabase
        .from('wallets')
        .select('*', { count: 'exact', head: true })
        .eq('payout_hold', true);

      setStats({
        totalPending,
        totalCompleted,
        averageAmount: completedCount > 0 ? totalCompleted / completedCount : 0,
        connectedAccounts: connectedAccounts || 0,
        creatorsOnHold: creatorsOnHold || 0,
      });

      // Fetch creators with payout hold
      const { data: holdWallets } = await supabase
        .from('wallets')
        .select('user_id, available_earnings, payout_hold, payout_hold_reason')
        .eq('payout_hold', true);

      if (holdWallets && holdWallets.length > 0) {
        const holdUserIds = holdWallets.map(w => w.user_id);
        const { data: holdProfiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', holdUserIds);

        const creatorsOnHoldList: CreatorWithHold[] = (holdProfiles || []).map(p => {
          const wallet = holdWallets.find(w => w.user_id === p.id);
          return {
            user_id: p.id,
            name: p.name || 'Unknown',
            email: p.email,
            available_earnings: wallet?.available_earnings || 0,
            payout_hold: true,
            payout_hold_reason: wallet?.payout_hold_reason || null,
          };
        });
        setCreatorsWithHold(creatorsOnHoldList);
      } else {
        setCreatorsWithHold([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payouts data');
    } finally {
      setLoading(false);
    }
  };

  const handleHoldPayout = async () => {
    if (!selectedCreator || !holdReason.trim()) return;
    setProcessingHold(true);
    try {
      const { error } = await supabase
        .from('wallets')
        .update({
          payout_hold: true,
          payout_hold_reason: holdReason,
          payout_hold_at: new Date().toISOString(),
        })
        .eq('user_id', selectedCreator.user_id);

      if (error) throw error;
      toast.success(`Payout hold placed on ${selectedCreator.name}`);
      setHoldModalOpen(false);
      setSelectedCreator(null);
      setHoldReason('');
      fetchData();
    } catch (error) {
      console.error('Error placing hold:', error);
      toast.error('Failed to place payout hold');
    } finally {
      setProcessingHold(false);
    }
  };

  const handleReleaseHold = async (userId: string, name: string) => {
    try {
      const { error } = await supabase
        .from('wallets')
        .update({
          payout_hold: false,
          payout_hold_reason: null,
          payout_hold_at: null,
        })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success(`Payout hold released for ${name}`);
      fetchData();
    } catch (error) {
      console.error('Error releasing hold:', error);
      toast.error('Failed to release payout hold');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      processing: { variant: 'outline', label: 'Processing' },
      completed: { variant: 'default', label: 'Completed' },
      failed: { variant: 'destructive', label: 'Failed' },
    };
    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const exportCSV = () => {
    const headers = ['Date', 'User', 'Email', 'Amount', 'Status', 'Transfer ID', 'Processed'];
    const rows = filteredWithdrawals.map((w) => [
      format(parseISO(w.created_at), 'yyyy-MM-dd'),
      w.user?.name || 'Unknown',
      w.user?.email || '',
      w.amount.toFixed(2),
      w.status,
      w.stripe_transfer_id || '',
      w.processed_at ? format(parseISO(w.processed_at), 'yyyy-MM-dd') : '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payouts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Payouts exported!');
  };

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        w.user?.name?.toLowerCase().includes(query) ||
        w.user?.email?.toLowerCase().includes(query) ||
        w.stripe_transfer_id?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payouts</h1>
          <p className="text-muted-foreground">Manage earner withdrawals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Pending</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold">${stats.totalPending.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Completed</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">${stats.totalCompleted.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Average</span>
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">${stats.averageAmount.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Connected Accounts</span>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{stats.connectedAccounts}</p>
          </CardContent>
        </Card>

        <Card className={stats.creatorsOnHold > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">On Hold</span>
              <ShieldAlert className="w-5 h-5 text-destructive" />
            </div>
            <p className="text-2xl font-bold">{stats.creatorsOnHold}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Minimum Notice */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-600 dark:text-amber-400">
              Minimum Payout: ${PAYOUT_MINIMUM.toFixed(2)} — No Exceptions
            </p>
            <p className="text-sm text-muted-foreground">
              Weekly payouts run every Friday. Creators must have ≥${PAYOUT_MINIMUM.toFixed(2)} available.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Creators On Hold */}
      {creatorsWithHold.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Creators On Payout Hold ({creatorsWithHold.length})
            </CardTitle>
            <CardDescription>These creators cannot receive payouts until the hold is released</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {creatorsWithHold.map((creator) => (
                <div
                  key={creator.user_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                >
                  <div>
                    <p className="font-medium">{creator.name}</p>
                    <p className="text-sm text-muted-foreground">{creator.email}</p>
                    {creator.payout_hold_reason && (
                      <p className="text-xs text-destructive mt-1">Reason: {creator.payout_hold_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">${creator.available_earnings.toFixed(2)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReleaseHold(creator.user_id, creator.name)}
                    >
                      <ShieldCheck className="w-4 h-4 mr-1" />
                      Release
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or transfer ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            All Withdrawals ({filteredWithdrawals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWithdrawals.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No withdrawals found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Withdrawals will appear here when earners request them'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWithdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        {format(parseISO(w.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{w.user?.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{w.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${w.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(w.status)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {w.stripe_transfer_id 
                          ? `${w.stripe_transfer_id.substring(0, 16)}...`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {w.processed_at 
                          ? format(parseISO(w.processed_at), 'MMM d, yyyy')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hold Modal */}
      <Dialog open={holdModalOpen} onOpenChange={setHoldModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Payout Hold</DialogTitle>
            <DialogDescription>
              {selectedCreator && `Place a hold on payouts for ${selectedCreator.name}. They will not receive any payouts until the hold is released.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Reason for Hold</label>
              <Textarea
                placeholder="Enter reason for placing this hold (required)..."
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleHoldPayout}
              disabled={!holdReason.trim() || processingHold}
            >
              {processingHold && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Place Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}