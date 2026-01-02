import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Gem, ArrowUpRight, ArrowDownLeft, MessageSquare, Video, Image, RefreshCw, Loader2, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import BuyCreditsModal from '@/components/credits/BuyCreditsModal';
import PricingFAQ from '@/components/faq/PricingFAQ';

interface Transaction {
  id: string;
  transaction_type: string;
  credits_amount: number;
  usd_amount: number | null;
  status: string;
  description: string | null;
  created_at: string;
}

const TRANSACTION_ICONS: Record<string, React.ReactNode> = {
  credit_purchase: <ArrowDownLeft className="w-4 h-4 text-green-400" />,
  message_sent: <MessageSquare className="w-4 h-4 text-blue-400" />,
  video_call: <Video className="w-4 h-4 text-purple-400" />,
  image_request: <Image className="w-4 h-4 text-pink-400" />,
  refund: <RefreshCw className="w-4 h-4 text-yellow-400" />,
  earning: <ArrowDownLeft className="w-4 h-4 text-green-400" />,
};

const TRANSACTION_LABELS: Record<string, string> = {
  credit_purchase: 'Credit Purchase',
  message_sent: 'Message Sent',
  video_call: 'Video Call',
  image_request: 'Image Request',
  refund: 'Refund',
  earning: 'Earning',
};

export default function CreditHistory() {
  const { profile, loading: authLoading, refreshProfile } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    // Temporarily disabled for public access
    // if (!authLoading && !profile) {
    //   navigate('/auth');
    //   return;
    // }

    if (profile) {
      fetchTransactions();
    }
  }, [profile, authLoading, navigate]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSuccess = () => {
    refreshProfile();
    refetchWallet();
    fetchTransactions();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 max-w-2xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        {/* Balance Card */}
        {/* Balance Card */}
        <Card className="bg-white/[0.02] border-white/10 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                <div className="flex items-center gap-3">
                  <Gem className="w-8 h-8 text-primary" />
                  <span className="text-4xl font-bold">
                    {(wallet?.credit_balance ?? 0).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">credits</span>
                </div>
              </div>
              <Button onClick={() => setShowBuyModal(true)} className="bg-primary hover:bg-primary/90">
                <Gem className="w-4 h-4 mr-2" />
                Buy More
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Gem className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <Button 
                  onClick={() => setShowBuyModal(true)} 
                  className="mt-4"
                  variant="outline"
                >
                  Buy your first credits
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div 
                    key={tx.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center">
                      {TRANSACTION_ICONS[tx.transaction_type] || <Gem className="w-4 h-4" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {tx.description || TRANSACTION_LABELS[tx.transaction_type] || tx.transaction_type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-semibold ${tx.credits_amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.credits_amount > 0 ? '+' : ''}{tx.credits_amount.toLocaleString()}
                      </p>
                      {tx.usd_amount && (
                        <p className="text-xs text-muted-foreground">
                          ${tx.usd_amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing FAQ */}
        <Card className="bg-white/[0.02] border-white/10 mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Pricing FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <PricingFAQ showTitle={false} />
          </CardContent>
        </Card>
      </main>

      <BuyCreditsModal 
        open={showBuyModal} 
        onOpenChange={setShowBuyModal}
        onSuccess={handlePurchaseSuccess}
      />

      <Footer />
    </div>
  );
}