import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const AccountTypeSwitcher = () => {
  const { user, profile } = useAuth();
  const [canSwitch, setCanSwitch] = useState(true);
  const [pendingSwitch, setPendingSwitch] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    if (user) {
      checkSwitchStatus();
    }
  }, [user]);

  useEffect(() => {
    if (pendingSwitch?.effective_at) {
      const interval = setInterval(() => {
        const now = new Date();
        const effectiveDate = new Date(pendingSwitch.effective_at);
        const diffTime = effectiveDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(Math.max(0, diffDays));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [pendingSwitch]);

  const checkSwitchStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('check_account_switch');
      if (error) throw error;
      if (data) {
        const result = data as { can_switch: boolean; pending_switch: any };
        setCanSwitch(result.can_switch);
        setPendingSwitch(result.pending_switch);
      }
    } catch (error) {
      console.error('Error checking switch status:', error);
    }
  };

  const requestSwitch = async () => {
    setLoading(true);
    try {
      const newType = profile?.user_type === 'seeker' ? 'earner' : 'seeker';
      const effectiveAt = new Date();
      effectiveAt.setDate(effectiveAt.getDate() + 7);

      const { error } = await supabase
        .from('account_type_switches')
        .insert({
          user_id: user?.id,
          from_type: profile?.user_type,
          to_type: newType,
          effective_at: effectiveAt.toISOString(),
          status: 'pending'
        });

      if (error) throw error;

      toast.success(`Account switch requested! You will become a ${newType} in 7 days.`);
      setShowConfirm(false);
      await checkSwitchStatus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to request account switch');
    } finally {
      setLoading(false);
    }
  };

  const currentType = profile?.user_type || 'seeker';
  const targetType = currentType === 'seeker' ? 'earner' : 'seeker';

  return (
    <Card className="bg-[#1a1a1f]/50 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Account Type</CardTitle>
        <CardDescription className="text-white/50">
          Switch between seeker and earner accounts (one-time only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/50">Current Type</p>
            <Badge className="mt-1 bg-rose-500/20 text-rose-400 border-rose-500/30">
              {currentType.charAt(0).toUpperCase() + currentType.slice(1)}
            </Badge>
          </div>
        </div>

        {pendingSwitch ? (
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-purple-400 animate-spin mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-purple-400">Switch Pending</p>
                <p className="text-sm text-white/50 mt-1">
                  Your account will change to <strong className="text-white">{pendingSwitch.to_type}</strong> in{' '}
                  <strong className="text-white">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>
                </p>
                <p className="text-xs text-white/30 mt-2">
                  Effective: {new Date(pendingSwitch.effective_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!canSwitch || loading}
            className="w-full bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-semibold"
          >
            {canSwitch ? `Switch to ${targetType.charAt(0).toUpperCase() + targetType.slice(1)}` : 'Already Switched'}
          </Button>
        )}

        {!canSwitch && !pendingSwitch && (
          <p className="text-xs text-white/40 text-center">
            You have already used your one-time account type switch
          </p>
        )}

        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="bg-[#0a0a0f] border-white/10">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <DialogTitle className="text-white">Confirm Account Switch</DialogTitle>
              </div>
              <DialogDescription className="text-white/50 pt-4">
                This action is <strong className="text-rose-400">permanent and cannot be undone</strong>.
                You can only switch account types <strong className="text-rose-400">once</strong>.
                <br /><br />
                After confirmation, the switch will take effect in <strong className="text-rose-400">7 days</strong>.
                <br /><br />
                Are you sure you want to switch from{' '}
                <strong className="text-white">{currentType}</strong> to{' '}
                <strong className="text-white">{targetType}</strong>?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="border-white/10 text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={requestSwitch}
                disabled={loading}
                className="bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-semibold"
              >
                {loading ? 'Processing...' : 'Confirm Switch'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
