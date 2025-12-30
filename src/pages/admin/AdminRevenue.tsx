import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  TrendingUp,
  Users,
  Wallet,
  PiggyBank,
  Clock,
  Loader2,
  RefreshCw,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface RevenueStats {
  totalCreditSales: number;
  totalCreditSalesNet: number;
  totalGiftValue: number;
  platformRevenue: number;
  creatorLiabilities: number;
  pendingEarnings: number;
  availableEarnings: number;
  paidOutTotal: number;
}

interface EligibleCreator {
  user_id: string;
  name: string;
  email: string;
  available_earnings: number;
  stripe_onboarding_complete: boolean;
  payout_hold: boolean;
}

interface RecentPayout {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  scheduled_for: string;
  processed_at: string | null;
  stripe_transfer_id: string | null;
  user?: {
    name: string;
    email: string;
  };
}

const PAYOUT_MINIMUM = 25.00;

export default function AdminRevenue() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RevenueStats>({
    totalCreditSales: 0,
    totalCreditSalesNet: 0,
    totalGiftValue: 0,
    platformRevenue: 0,
    creatorLiabilities: 0,
    pendingEarnings: 0,
    availableEarnings: 0,
    paidOutTotal: 0,
  });
  const [eligibleCreators, setEligibleCreators] = useState<EligibleCreator[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<RecentPayout[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch credit pack purchases (total credit sales)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('usd_amount, credits_amount')
        .eq('transaction_type', 'purchase')
        .eq('status', 'completed');

      const totalCreditSales = (transactions || []).reduce((sum, t) => sum + (t.usd_amount || 0), 0);
      // Estimate net after Stripe fees (~2.9% + $0.30 per transaction)
      const transactionCount = transactions?.length || 0;
      const stripeFees = totalCreditSales * 0.029 + transactionCount * 0.30;
      const totalCreditSalesNet = totalCreditSales - stripeFees;

      // Fetch gift transactions for total gift value
      const { data: gifts } = await supabase
        .from('gift_transactions')
        .select('gross_value_usd, platform_fee, earner_amount')
        .eq('status', 'completed');

      const totalGiftValue = (gifts || []).reduce((sum, g) => sum + (g.gross_value_usd || 0), 0);
      const platformRevenue = (gifts || []).reduce((sum, g) => sum + (g.platform_fee || 0), 0);

      // Fetch all wallets for creator liabilities
      const { data: wallets } = await supabase
        .from('wallets')
        .select('pending_earnings, available_earnings, paid_out_total, user_id');

      const pendingEarnings = (wallets || []).reduce((sum, w) => sum + (w.pending_earnings || 0), 0);
      const availableEarnings = (wallets || []).reduce((sum, w) => sum + (w.available_earnings || 0), 0);
      const paidOutTotal = (wallets || []).reduce((sum, w) => sum + (w.paid_out_total || 0), 0);
      const creatorLiabilities = pendingEarnings + availableEarnings;

      setStats({
        totalCreditSales,
        totalCreditSalesNet,
        totalGiftValue,
        platformRevenue,
        creatorLiabilities,
        pendingEarnings,
        availableEarnings,
        paidOutTotal,
      });

      // Fetch eligible creators for next payout
      const eligibleWalletIds = (wallets || [])
        .filter(w => w.available_earnings >= PAYOUT_MINIMUM)
        .map(w => w.user_id);

      if (eligibleWalletIds.length > 0) {
        const { data: creatorProfiles } = await supabase
          .from('profiles')
          .select('id, name, email, stripe_onboarding_complete')
          .in('id', eligibleWalletIds);

        const { data: creatorWallets } = await supabase
          .from('wallets')
          .select('user_id, available_earnings, payout_hold')
          .in('user_id', eligibleWalletIds);

        const creators: EligibleCreator[] = (creatorProfiles || []).map(p => {
          const wallet = creatorWallets?.find(w => w.user_id === p.id);
          return {
            user_id: p.id,
            name: p.name || 'Unknown',
            email: p.email,
            available_earnings: wallet?.available_earnings || 0,
            stripe_onboarding_complete: p.stripe_onboarding_complete || false,
            payout_hold: wallet?.payout_hold || false,
          };
        });

        setEligibleCreators(creators.sort((a, b) => b.available_earnings - a.available_earnings));
      }

      // Fetch recent payout schedules
      const { data: payoutSchedules } = await supabase
        .from('payout_schedules')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const enrichedPayouts = await Promise.all(
        (payoutSchedules || []).map(async (p) => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', p.user_id)
            .single();
          return { ...p, user: userData } as RecentPayout;
        })
      );

      setRecentPayouts(enrichedPayouts);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Credit Sales (Gross)', `$${stats.totalCreditSales.toFixed(2)}`],
      ['Total Credit Sales (Net)', `$${stats.totalCreditSalesNet.toFixed(2)}`],
      ['Total Gift Value', `$${stats.totalGiftValue.toFixed(2)}`],
      ['Platform Revenue (30%)', `$${stats.platformRevenue.toFixed(2)}`],
      ['Creator Liabilities', `$${stats.creatorLiabilities.toFixed(2)}`],
      ['Pending Earnings', `$${stats.pendingEarnings.toFixed(2)}`],
      ['Available Earnings', `$${stats.availableEarnings.toFixed(2)}`],
      ['Paid Out Total', `$${stats.paidOutTotal.toFixed(2)}`],
    ];

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Revenue report exported!');
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
          <h1 className="text-2xl font-bold text-white">Revenue Dashboard</h1>
          <p className="text-white/60">Platform revenue and creator payouts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="border-white/10 text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Credit Sales (Gross)</span>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-white">${stats.totalCreditSales.toFixed(2)}</p>
            <p className="text-xs text-white/40 mt-1">
              Net: ${stats.totalCreditSalesNet.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Platform Revenue (30%)</span>
              <PiggyBank className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">${stats.platformRevenue.toFixed(2)}</p>
            <p className="text-xs text-white/40 mt-1">
              From ${stats.totalGiftValue.toFixed(2)} total gifts
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Creator Liabilities (70%)</span>
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-white">${stats.creatorLiabilities.toFixed(2)}</p>
            <p className="text-xs text-white/40 mt-1">
              Pending: ${stats.pendingEarnings.toFixed(2)} | Available: ${stats.availableEarnings.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Total Paid Out</span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-white">${stats.paidOutTotal.toFixed(2)}</p>
            <p className="text-xs text-white/40 mt-1">
              Lifetime creator payouts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Minimum Notice */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-600 dark:text-amber-400">
              Minimum Payout Threshold: ${PAYOUT_MINIMUM.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              Creators must have at least ${PAYOUT_MINIMUM.toFixed(2)} in available earnings to receive a payout. No exceptions.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Eligible for Next Payout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Eligible for Payout ({eligibleCreators.length})
            </CardTitle>
            <CardDescription>
              Creators with ≥${PAYOUT_MINIMUM.toFixed(2)} available
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eligibleCreators.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No creators eligible for payout</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {eligibleCreators.map((creator) => (
                  <div
                    key={creator.user_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{creator.name}</p>
                      <p className="text-sm text-muted-foreground">{creator.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${creator.available_earnings.toFixed(2)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {creator.payout_hold && (
                          <Badge variant="destructive" className="text-xs">Hold</Badge>
                        )}
                        {!creator.stripe_onboarding_complete && (
                          <Badge variant="secondary" className="text-xs">No Stripe</Badge>
                        )}
                        {creator.stripe_onboarding_complete && !creator.payout_hold && (
                          <Badge variant="default" className="text-xs">Ready</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payout Schedules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Payouts
            </CardTitle>
            <CardDescription>
              Scheduled and completed payouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentPayouts.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No payout history</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <p className="font-medium">{payout.user?.name || 'Unknown'}</p>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${payout.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payout.status)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payout.processed_at 
                            ? format(parseISO(payout.processed_at), 'MMM d')
                            : format(parseISO(payout.scheduled_for), 'MMM d')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
