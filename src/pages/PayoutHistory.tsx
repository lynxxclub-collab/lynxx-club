import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/layout/MobileNav';
import BackgroundEffects from '@/components/BackgroundEffects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Wallet,
  Clock,
  CheckCircle,
  Loader2,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  stripe_transfer_id: string | null;
  created_at: string;
  processed_at: string | null;
}

export default function PayoutHistory() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState({
    totalWithdrawn: 0,
    pendingAmount: 0,
    lastPayoutDate: null as string | null,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!authLoading && profile?.user_type !== 'earner') navigate('/dashboard');
  }, [authLoading, user, profile, navigate]);

  useEffect(() => {
    if (user) fetchWithdrawals();
  }, [user]);

  const fetchWithdrawals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWithdrawals(data || []);

      // Calculate stats
      let totalWithdrawn = 0;
      let pendingAmount = 0;
      let lastPayoutDate: string | null = null;

      (data || []).forEach((w) => {
        if (w.status === 'completed') {
          totalWithdrawn += w.amount;
          if (!lastPayoutDate || w.processed_at > lastPayoutDate) {
            lastPayoutDate = w.processed_at || w.created_at;
          }
        } else if (['pending', 'processing'].includes(w.status)) {
          pendingAmount += w.amount;
        }
      });

      setStats({ totalWithdrawn, pendingAmount, lastPayoutDate });
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'pending' | 'processing' | 'completed' | 'failed'; label: string }> = {
      pending: { variant: 'pending', label: 'Pending' },
      processing: { variant: 'processing', label: 'Processing' },
      completed: { variant: 'completed', label: 'Completed' },
      failed: { variant: 'failed', label: 'Failed' },
    };
    const config = variants[status] || { variant: 'pending', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0">
      <BackgroundEffects />
      <div className="relative z-10">
        <Header />
        
        <div className="container max-w-4xl py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="mb-2 -ml-2 text-white/70 hover:text-white hover:bg-white/5"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Payout History
              </h1>
              <p className="text-white/50">Track all your withdrawals</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-sm">Total Withdrawn</span>
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">${stats.totalWithdrawn.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-sm">Pending Payouts</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">${stats.pendingAmount.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-sm">Last Payout</span>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-white">
                  {stats.lastPayoutDate 
                    ? format(parseISO(stats.lastPayoutDate), 'MMM d, yyyy')
                    : 'No payouts yet'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Withdrawals Table */}
          <Card className="bg-white/[0.02] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                All Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No withdrawals yet</h3>
                  <p className="text-white/50 mb-4">
                    Your withdrawal history will appear here
                  </p>
                  <Button
                    onClick={() => navigate('/dashboard')}
                    className="bg-gradient-to-r from-rose-500 to-purple-500"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white/50">Date</TableHead>
                        <TableHead className="text-white/50">Amount</TableHead>
                        <TableHead className="text-white/50">Status</TableHead>
                        <TableHead className="text-white/50">Transfer ID</TableHead>
                        <TableHead className="text-white/50">Processed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((w) => (
                        <TableRow key={w.id} className="border-white/5">
                          <TableCell className="text-white">
                            {format(parseISO(w.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-white font-semibold">
                            ${w.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(w.status)}
                          </TableCell>
                          <TableCell className="text-white/50 font-mono text-sm">
                            {w.stripe_transfer_id 
                              ? `${w.stripe_transfer_id.substring(0, 12)}...`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-white/50">
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
        </div>

        <Footer />
        <MobileNav />
      </div>
    </div>
  );
}