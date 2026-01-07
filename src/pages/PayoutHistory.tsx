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
  Loader2,
  DollarSign,
  Calendar,
  CheckCircle,
  Info,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Payout {
  id: string;
  amount: number;
  status: string | null;
  stripe_transfer_id: string | null;
  scheduled_for: string;
  processed_at: string | null;
}

export default function PayoutHistory() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState({
    totalPaidOut: 0,
    lastPayoutDate: null as string | null,
    payoutsCount: 0,
  });

  // Temporarily disabled for public access
  // useEffect(() => {
  //   if (!authLoading && !user) navigate('/auth');
  //   if (!authLoading && profile?.user_type !== 'earner') navigate('/dashboard');
  // }, [authLoading, user, profile, navigate]);

  useEffect(() => {
    if (user) fetchPayouts();
  }, [user]);

  const fetchPayouts = async () => {
    if (!user) return;

    try {
      // Fetch from payout_schedules (automatic payouts)
      const { data, error } = await supabase
        .from('payout_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: false });

      if (error) throw error;

      setPayouts(data || []);

      // Calculate stats
      let totalPaidOut = 0;
      let lastPayoutDate: string | null = null;
      let payoutsCount = 0;

      (data || []).forEach((p) => {
        if (p.status === 'completed') {
          totalPaidOut += p.amount;
          payoutsCount++;
          if (!lastPayoutDate || (p.processed_at && p.processed_at > lastPayoutDate)) {
            lastPayoutDate = p.processed_at || p.scheduled_for;
          }
        }
      });

      setStats({ totalPaidOut, lastPayoutDate, payoutsCount });
    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Processing</Badge>;
      case 'pending':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Scheduled</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
              <p className="text-white/50">Your automatic weekly payouts</p>
            </div>
          </div>

          {/* Info Banner */}
          <Card className="bg-white/[0.02] border-white/10 mb-6">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-white/60 text-sm">
                Earnings are automatically paid out every Friday to your connected bank account. 
                Minimum payout is $25.00.
              </p>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-sm">Total Paid Out</span>
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">${stats.totalPaidOut.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-sm">Payouts Received</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{stats.payoutsCount}</p>
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

          {/* Payouts Table */}
          <Card className="bg-white/[0.02] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                All Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No payouts yet</h3>
                  <p className="text-white/50 mb-4">
                    Once you reach $25 in available earnings, you'll receive automatic Friday payouts.
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
                        <TableHead className="text-white/50">Scheduled</TableHead>
                        <TableHead className="text-white/50">Amount</TableHead>
                        <TableHead className="text-white/50">Status</TableHead>
                        <TableHead className="text-white/50">Processed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((p) => (
                        <TableRow key={p.id} className="border-white/5">
                          <TableCell className="text-white">
                            {format(parseISO(p.scheduled_for), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-white font-semibold">
                            ${p.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(p.status || 'pending')}
                          </TableCell>
                          <TableCell className="text-white/50">
                            {p.processed_at 
                              ? format(parseISO(p.processed_at), 'MMM d, yyyy')
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
