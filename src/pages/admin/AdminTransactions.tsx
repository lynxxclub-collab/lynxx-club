import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import { Check, X, ChevronLeft, ChevronRight, DollarSign, TrendingUp, ArrowDownCircle, Eye } from 'lucide-react';
import TransactionDetailModal from '@/components/admin/TransactionDetailModal';

interface Transaction {
  id: string;
  user_id: string;
  transaction_type: string;
  credits_amount: number;
  usd_amount: number | null;
  status: string;
  description: string | null;
  stripe_payment_id: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Stats {
  totalRevenue: number;
  platformFees: number;
  totalPayouts: number;
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7days');
  const [stats, setStats] = useState<Stats>({ totalRevenue: 0, platformFees: 0, totalPayouts: 0 });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const pageSize = 20;

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
      loadStats();
    } else {
      loadWithdrawals();
    }
  }, [activeTab, page, filter, dateRange]);

  function getStartDate(range: string): Date {
    const date = new Date();
    if (range === '7days') date.setDate(date.getDate() - 7);
    else if (range === '30days') date.setDate(date.getDate() - 30);
    else if (range === '90days') date.setDate(date.getDate() - 90);
    else if (range === 'all') date.setFullYear(2020);
    return date;
  }

  async function loadTransactions() {
    setLoading(true);
    try {
      const startDate = getStartDate(dateRange);
      
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Apply filter
      if (filter === 'credit_purchase') {
        query = query.eq('transaction_type', 'credit_purchase');
      } else if (filter === 'messages') {
        query = query.in('transaction_type', ['message_sent', 'earning']);
      } else if (filter === 'video_dates') {
        query = query.in('transaction_type', ['video_date', 'video_earning']);
      } else if (filter === 'withdrawals') {
        query = query.eq('transaction_type', 'withdrawal');
      }

      const { data, count, error } = await query;

      if (error) throw error;

      // Fetch user profiles for transactions
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(t => t.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const transactionsWithUsers = data.map(t => ({
          ...t,
          user: profileMap.get(t.user_id) || undefined
        }));
        
        setTransactions(transactionsWithUsers);
      } else {
        setTransactions([]);
      }
      
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const startDate = getStartDate(dateRange);
      
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('transaction_type, usd_amount, credits_amount')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed');

      let totalRevenue = 0;
      let platformFees = 0;
      let totalPayouts = 0;

      allTransactions?.forEach(t => {
        const amount = Math.abs(Number(t.usd_amount) || 0);
        
        if (t.transaction_type === 'credit_purchase') {
          totalRevenue += amount;
        } else if (t.transaction_type === 'message_sent' || t.transaction_type === 'video_date') {
          // Platform fee is 30% of transaction value
          platformFees += amount * 0.30;
        } else if (t.transaction_type === 'withdrawal') {
          totalPayouts += amount;
        }
      });

      setStats({
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        platformFees: Math.round(platformFees * 100) / 100,
        totalPayouts: Math.round(totalPayouts * 100) / 100
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadWithdrawals() {
    setLoading(true);
    try {
      const { data, count, error } = await supabase
        .from('withdrawals')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      setWithdrawals(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateWithdrawalStatus(withdrawalId: string, status: 'completed' | 'rejected') {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status,
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (error) throw error;

      toast.success(`Withdrawal ${status === 'completed' ? 'approved' : 'rejected'}`);
      loadWithdrawals();
    } catch (error) {
      console.error('Error updating withdrawal:', error);
      toast.error('Failed to update withdrawal');
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getTypeBadge(type: string) {
    switch (type) {
      case 'credit_purchase':
        return <Badge className="bg-blue-500">Purchase</Badge>;
      case 'message_sent':
        return <Badge className="bg-purple-500">Message</Badge>;
      case 'earning':
        return <Badge className="bg-green-500">Earning</Badge>;
      case 'video_date':
        return <Badge className="bg-pink-500">Video Date</Badge>;
      case 'video_earning':
        return <Badge className="bg-emerald-500">Video Earning</Badge>;
      case 'withdrawal':
        return <Badge className="bg-orange-500">Withdrawal</Badge>;
      default:
        return <Badge variant="outline">{type.replace(/_/g, ' ')}</Badge>;
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Transactions</h2>
        <p className="text-muted-foreground">Monitor revenue, transactions, and manage withdrawals</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Platform Fees</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${stats.platformFees.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payouts</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${stats.totalPayouts.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <ArrowDownCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(0); }}>
        <TabsList>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Transaction History</CardTitle>
              <div className="flex gap-2">
                <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit_purchase">Credit Purchases</SelectItem>
                    <SelectItem value="messages">Messages</SelectItem>
                    <SelectItem value="video_dates">Video Dates</SelectItem>
                    <SelectItem value="withdrawals">Withdrawals</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setPage(0); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="90days">Last 90 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No transactions found
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>USD</TableHead>
                        <TableHead>Platform Fee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => {
                        const platformFee = ['message_sent', 'video_date'].includes(tx.transaction_type) && tx.usd_amount
                          ? (Math.abs(Number(tx.usd_amount)) * 0.30).toFixed(2)
                          : null;
                        
                        return (
                          <TableRow key={tx.id}>
                            <TableCell>{getTypeBadge(tx.transaction_type)}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{tx.user?.name || 'Unknown'}</div>
                                <div className="text-xs text-muted-foreground">{tx.user?.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={tx.credits_amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                {tx.credits_amount > 0 ? '+' : ''}{tx.credits_amount}
                              </span>
                            </TableCell>
                            <TableCell>
                              {tx.usd_amount !== null ? (
                                <span className={Number(tx.usd_amount) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {Number(tx.usd_amount) >= 0 ? '+' : ''}${Math.abs(Number(tx.usd_amount)).toFixed(2)}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {platformFee ? (
                                <span className="text-muted-foreground">${platformFee}</span>
                              ) : '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(tx.status)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTransaction(tx)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No withdrawal requests
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="font-medium">
                            ${Number(w.amount).toFixed(2)}
                          </TableCell>
                          <TableCell>{getStatusBadge(w.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(w.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {w.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateWithdrawalStatus(w.id, 'completed')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateWithdrawalStatus(w.id, 'rejected')}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
