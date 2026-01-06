import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ExternalLink, RefreshCw, Receipt, AlertCircle, CheckCircle, Clock, DollarSign, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  user_id: string;
  transaction_type: string;
  credits_amount?: number; // Legacy field
  amount_credits?: number; // New SQL field
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

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onRefund?: (transactionId: string) => void;
  onUpdate?: () => void; // Callback to refresh parent list
}

export default function TransactionDetailModal({ 
  transaction, 
  onClose,
  onRefund,
  onUpdate
}: TransactionDetailModalProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction) return;
    setCurrentStatus(transaction.status);
  }, [transaction]);

  // REAL-TIME UPDATE: Poll transaction status
  useEffect(() => {
    if (!transaction?.id) return;
    
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('transactions') // Or 'ledger' depending on exact source
          .select('status')
          .eq('id', transaction.id)
          .single();
          
        if (data && data.status !== currentStatus) {
          setCurrentStatus(data.status);
          toast.info(`Transaction status updated to: ${data.status}`);
          onUpdate?.();
        }
      } catch (e) {
        // Silently fail to avoid noise
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [transaction?.id, currentStatus, onUpdate]);

  if (!transaction) return null;

  // Normalize amount (handle old vs new schema)
  const credits = transaction.amount_credits ?? transaction.credits_amount ?? 0;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'credit_purchase': return 'Credit Purchase';
      case 'message_sent': return 'Message Sent';
      case 'earning': return 'Message Earning';
      case 'booking_payment': return 'Booking Payment';
      case 'earner_payout': return 'Earner Payout';
      case 'video_date': return 'Video Date';
      case 'video_earning': return 'Video Date Earning';
      case 'withdrawal': return 'Withdrawal';
      default: return type.replace(/_/g, ' ');
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('earning') || type.includes('payout')) return <Coins className="h-4 w-4 text-teal-400" />;
    if (type.includes('purchase')) return <DollarSign className="h-4 w-4 text-purple-400" />;
    return <Receipt className="h-4 w-4 text-white/50" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'refunded': return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-400" />;
      default: return <Clock className="h-4 w-4 text-white/50" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'refunded': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-white/5 text-white/60 border-white/10';
    }
  };

  const isPositive = credits > 0;
  const isEarning = transaction.transaction_type.includes('earning') || transaction.transaction_type.includes('payout');

  return (
    <Dialog open={!!transaction} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0a0a0f] border-white/10 p-0 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <DialogHeader className="p-6 pb-2 border-b border-white/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl text-white">Transaction Details</DialogTitle>
            <Badge className={`${getStatusColor(currentStatus || transaction.status)} border flex items-center gap-2`}>
              {getStatusIcon(currentStatus || transaction.status)}
              {(currentStatus || transaction.status).toUpperCase()}
            </Badge>
          </div>
          <div className="mt-4 text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {isPositive ? '+' : ''}{credits} <span className="text-lg text-white/50 font-normal">Credits</span>
            </div>
            <div className="text-sm text-white/50 flex items-center justify-center gap-2">
              {getTypeIcon(transaction.transaction_type)}
              {getTypeLabel(transaction.transaction_type)}
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* User Info */}
          {transaction.user && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <Avatar className="h-10 w-10 bg-rose-500/20 text-rose-400 font-bold">
                {transaction.user.name?.charAt(0) || 'U'}
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{transaction.user.name || 'Unnamed User'}</p>
                <p className="text-xs text-white/50 truncate">{transaction.user.email}</p>
              </div>
            </div>
          )}

          {/* Financial Receipt */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase text-white/40 font-bold tracking-wider">Financial Breakdown</h4>
            <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-2 text-sm">
              
              {/* Main Amount */}
              <div className="flex justify-between items-center">
                <span className="text-white/60">Amount (Credits)</span>
                <span className={`font-mono font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {credits}
                </span>
              </div>

              {/* USD Equivalent */}
              {transaction.usd_amount !== null && (
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-white/60">Estimated USD</span>
                  <span className={`font-mono ${Number(transaction.usd_amount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${Math.abs(Number(transaction.usd_amount)).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Platform Fee Breakdown (For Expenses) */}
              {!isEarning && transaction.usd_amount && (
                <div className="pt-2 mt-2 border-t border-white/10">
                  <div className="flex justify-between items-center text-xs text-white/40 mb-1">
                    <span>Ledger Breakdown</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-purple-400">Platform (30%)</span>
                    <span className="font-mono text-white/70">
                      {(Math.abs(Number(transaction.usd_amount)) * 0.30).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-teal-400">Earner (70%)</span>
                    <span className="font-mono text-white/70">
                      {(Math.abs(Number(transaction.usd_amount)) * 0.70).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-3 text-sm">
            <h4 className="text-xs uppercase text-white/40 font-bold tracking-wider">Details</h4>
            
            <div className="flex justify-between">
              <span className="text-white/50">Transaction ID</span>
              <span className="font-mono text-xs text-white/70">#{transaction.id.slice(0, 8)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-white/50">Date</span>
              <span className="text-white/70">{new Date(transaction.created_at).toLocaleString()}</span>
            </div>

            {transaction.stripe_payment_id && (
              <div className="flex justify-between items-start">
                <span className="text-white/50">Stripe ID</span>
                <span className="font-mono text-xs text-rose-400 text-right max-w-[150px] truncate">
                  {transaction.stripe_payment_id}
                </span>
              </div>
            )}

            {transaction.description && (
              <div className="pt-2">
                <span className="text-white/50 block mb-1">Description</span>
                <p className="p-2 bg-white/5 rounded text-white/70 text-xs leading-relaxed">
                  {transaction.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-white/10 bg-[#050507] space-y-2">
          {transaction.stripe_payment_id && (
            <Button
              variant="outline"
              className="w-full h-12 border-white/10 text-white hover:bg-white/5 justify-between group"
              onClick={() => window.open(`https://dashboard.stripe.com/payments/${transaction.stripe_payment_id}`, '_blank')}
            >
              <span>View in Stripe</span>
              <ExternalLink className="h-4 w-4 opacity-50 group-hover:opacity-100" />
            </Button>
          )}
          
          {transaction.transaction_type === 'credit_purchase' && 
           transaction.status === 'completed' && 
           onRefund && (
            <Button
              variant="destructive"
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium"
              onClick={() => onRefund(transaction.id)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Issue Refund
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}