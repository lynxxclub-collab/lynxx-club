import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Clock, TrendingUp, ArrowUpRight, ArrowDownRight, MessageSquare, Video, Loader2, ExternalLink, Check } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import WithdrawModal from '@/components/earnings/WithdrawModal';

interface Transaction {
  id: string;
  transaction_type: string;
  credits_amount: number;
  usd_amount: number | null;
  description: string | null;
  created_at: string;
}

export default function Dashboard() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('transaction_type', ['earning', 'message_sent'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);

      // Calculate total earned (sum of positive usd_amounts)
      const total = (data || []).reduce((sum, tx) => {
        if (tx.usd_amount && tx.usd_amount > 0) {
          return sum + tx.usd_amount;
        }
        return sum;
      }, 0);
      setTotalEarned(total);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!loading && profile) {
      if (profile.account_status !== 'active') {
        navigate('/onboarding');
        return;
      }
      if (profile.user_type !== 'earner') {
        navigate('/browse');
        return;
      }
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, fetchTransactions]);

  // Handle Stripe Connect return
  useEffect(() => {
    if (searchParams.get('stripe_success') === 'true') {
      toast.success('Bank account connected successfully!');
      refreshProfile();
    } else if (searchParams.get('stripe_refresh') === 'true') {
      toast.info('Please complete your bank account setup');
    }
  }, [searchParams, refreshProfile]);

  // Subscribe to real-time transaction updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('earner-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newTx = payload.new as Transaction;
          if (newTx.usd_amount && newTx.usd_amount > 0) {
            toast.success(`+$${newTx.usd_amount.toFixed(2)} earned!`, {
              description: newTx.description || 'New earnings received'
            });
          }
          fetchTransactions();
          refreshProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTransactions, refreshProfile]);

  const handleWithdrawSuccess = () => {
    refreshProfile();
    fetchTransactions();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const availableBalance = profile?.earnings_balance || 0;
  const pendingBalance = profile?.pending_balance || 0;
  const stripeComplete = profile?.stripe_onboarding_complete || false;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Earnings Dashboard</h1>
          {!stripeComplete && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowWithdrawModal(true)}
              className="border-gold/50 text-gold hover:bg-gold/10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Set Up Payouts
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Available Balance */}
          <Card className="glass-card border-gold/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-gold" />
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold text-gold">
                ${availableBalance.toFixed(2)}
              </p>
              <Button 
                onClick={() => setShowWithdrawModal(true)}
                disabled={availableBalance < 20}
                className="mt-4 w-full bg-gold text-gold-foreground hover:bg-gold/90 disabled:opacity-50"
              >
                {stripeComplete ? (
                  'Withdraw Money'
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Set Up & Withdraw
                  </>
                )}
              </Button>
              {availableBalance < 20 && availableBalance > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Minimum withdrawal: $20
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold">${pendingBalance.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Released in 1-3 days</p>
            </CardContent>
          </Card>

          {/* Total Earned */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Total Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold">${totalEarned.toFixed(2)}</p>
              <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Lifetime earnings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-display">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No earnings yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your earnings from messages and video calls will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => {
                  const isPositive = (tx.usd_amount || 0) > 0;
                  const isMessage = tx.transaction_type === 'earning' && tx.description?.includes('message');
                  const isVideo = tx.transaction_type === 'earning' && tx.description?.includes('video');
                  const isWithdrawal = (tx.usd_amount || 0) < 0;

                  return (
                    <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isMessage ? 'bg-primary/20 text-primary' :
                          isVideo ? 'bg-teal/20 text-teal' :
                          isWithdrawal ? 'bg-destructive/20 text-destructive' :
                          'bg-gold/20 text-gold'
                        }`}>
                          {isMessage ? <MessageSquare className="w-5 h-5" /> :
                           isVideo ? <Video className="w-5 h-5" /> :
                           isWithdrawal ? <ArrowDownRight className="w-5 h-5" /> :
                           <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium">
                            {tx.description || tx.transaction_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 font-semibold ${
                        isPositive ? 'text-green-500' : 'text-destructive'
                      }`}>
                        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        ${Math.abs(tx.usd_amount || 0).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Rates */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-display">Your Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <MessageSquare className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Text Message</p>
                <p className="font-semibold">20 credits</p>
                <p className="text-xs text-gold">You earn $1.40</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <MessageSquare className="w-6 h-6 text-teal mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Image</p>
                <p className="font-semibold">40 credits</p>
                <p className="text-xs text-gold">You earn $2.80</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <Video className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Video 30min</p>
                <p className="font-semibold">{profile?.video_30min_rate} credits</p>
                <p className="text-xs text-gold">
                  You earn ${((profile?.video_30min_rate || 300) * 0.10 * 0.70).toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <Video className="w-6 h-6 text-purple mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Video 60min</p>
                <p className="font-semibold">{profile?.video_60min_rate} credits</p>
                <p className="text-xs text-gold">
                  You earn ${((profile?.video_60min_rate || 500) * 0.10 * 0.70).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <WithdrawModal
        open={showWithdrawModal}
        onOpenChange={setShowWithdrawModal}
        availableBalance={availableBalance}
        stripeOnboardingComplete={stripeComplete}
        onSuccess={handleWithdrawSuccess}
      />
    </div>
  );
}