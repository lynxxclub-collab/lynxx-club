import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, RefreshCw } from 'lucide-react';

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

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onRefund?: (transactionId: string) => void;
}

export default function TransactionDetailModal({ 
  transaction, 
  onClose,
  onRefund 
}: TransactionDetailModalProps) {
  if (!transaction) return null;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'credit_purchase': return 'Credit Purchase';
      case 'message_sent': return 'Message Sent';
      case 'earning': return 'Message Earning';
      case 'video_date': return 'Video Date';
      case 'video_earning': return 'Video Date Earning';
      case 'withdrawal': return 'Withdrawal';
      default: return type.replace(/_/g, ' ');
    }
  };

const CREDIT_PACKAGES = [
  { name: "Starter Pack", credits: 100 },
  { name: "Popular Pack", credits: 600 },   // 550 + 50 bonus
  { name: "Flex Pack", credits: 1300 },     // 1200 + 100 bonus
  { name: "VIP Vault", credits: 3300 },     // 3000 + 300 bonus
] as const;

const getPackageInfo = () => {
  if (transaction.transaction_type !== "credit_purchase") return null;

  const credits = Math.abs(Number(transaction.credits_amount ?? 0));

  const exact = CREDIT_PACKAGES.find(p => p.credits === credits);
  if (exact) return exact;

  return { name: "Credits", credits };
};
  const packageInfo = getPackageInfo();

  return (
    <Dialog open={!!transaction} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction ID & Type */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ID</span>
              <span className="font-mono text-sm">#{transaction.id.slice(0, 8)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="capitalize">{getTypeLabel(transaction.transaction_type)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge 
                className={
                  transaction.status === 'completed' 
                    ? 'bg-green-500' 
                    : transaction.status === 'pending'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }
              >
                {transaction.status}
              </Badge>
            </div>
          </div>

          {/* User Info */}
          {transaction.user && (
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">User</span>
                <span>{transaction.user.name || 'Unnamed'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm">{transaction.user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">User ID</span>
                <span className="font-mono text-xs">#{transaction.user_id.slice(0, 8)}</span>
              </div>
            </div>
          )}

          {/* Amount Details */}
          <div className="space-y-2">
            {transaction.usd_amount !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount (USD)</span>
                <span className={`font-semibold ${Number(transaction.usd_amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(transaction.usd_amount) >= 0 ? '+' : ''}${Math.abs(Number(transaction.usd_amount)).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Credits</span>
              <span className={`font-semibold ${transaction.credits_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {transaction.credits_amount >= 0 ? '+' : ''}{transaction.credits_amount}
              </span>
            </div>
            {packageInfo && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Package</span>
                <span>{packageInfo.name}</span>
              </div>
            )}
          </div>

          {/* Platform Fee (for earning transactions) */}
          {['message_sent', 'video_date'].includes(transaction.transaction_type) && transaction.usd_amount && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee (30%)</span>
                <span>${(Math.abs(Number(transaction.usd_amount)) * 0.30).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Earner Receives (70%)</span>
                <span>${(Math.abs(Number(transaction.usd_amount)) * 0.70).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Stripe Info */}
          {transaction.stripe_payment_id && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Stripe Payment ID</span>
              <span className="font-mono text-xs">{transaction.stripe_payment_id}</span>
            </div>
          )}

          {/* Date */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Date</span>
            <span>{new Date(transaction.created_at).toLocaleString()}</span>
          </div>

          {/* Description */}
          {transaction.description && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Description</span>
              <p className="text-sm p-2 bg-muted rounded">{transaction.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            {transaction.stripe_payment_id && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`https://dashboard.stripe.com/payments/${transaction.stripe_payment_id}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View in Stripe
              </Button>
            )}
            {transaction.transaction_type === 'credit_purchase' && 
             transaction.status === 'completed' && 
             onRefund && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => onRefund(transaction.id)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refund
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
