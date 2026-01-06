import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Calendar, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

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
    <Card 
      className="bg-[#0f0f12] border-white/10 shadow-lg overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-white tracking-tight">Account Type</CardTitle>
        <CardDescription className="text-white/50 text-sm">
          Switch between seeker and earner accounts (one-time only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4 text-white/60" />
             </div>
            <div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wide">Current Type</p>
              <Badge className="mt-1 bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold">
                {currentType.charAt(0).toUpperCase() + currentType.slice(1)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Pending State */}
        {pendingSwitch ? (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30">
                <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-purple-300 text-sm">Switch Pending</p>
                <p className="text-sm text-white/60 mt-1 leading-relaxed">
                  Your account will change to <strong className="text-white">{pendingSwitch.to_type}</strong> in{' '}
                  <strong className="text-white">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-white/30">
                  <Calendar className="w-3 h-3" />
                  <span>Effective: {new Date(pendingSwitch.effective_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Switch Button */
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!canSwitch || loading}
            className={cn(
              "w-full h-11 text-base font-bold transition-all duration-300",
              "bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500",
              "shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
              "border-0"
            )}
          >
            {canSwitch ? (
              <span className="flex items-center justify-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                Switch to {targetType.charAt(0).toUpperCase() + targetType.slice(1)}
              </span>
            ) : (
              'Already Switched'
            )}
          </Button>
        )}

        {!canSwitch && !pendingSwitch && (
          <p className="text-xs text-white/30 text-center font-medium tracking-wide pt-2">
            You have already used your one-time account type switch
          </p>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="bg-[#0f0f12] border-white/10 shadow-2xl sm:max-w-md p-0">
            {/* Danger Gradient Header */}
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 to-red-600" />
            
            <div className="p-6">
              <DialogHeader className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white tracking-tight">
                    Confirm Account Switch
                  </DialogTitle>
                  <DialogDescription className="text-white/60 text-sm mt-3 leading-relaxed text-left">
                    This action is <strong className="text-rose-400">permanent and cannot be undone</strong>.
                    You can only switch account types <strong className="text-rose-400">once</strong>.
                    <br /><br />
                    After confirmation, the switch will take effect in <strong className="text-rose-400">7 days</strong>.
                    <br /><br />
                    Are you sure you want to switch from{' '}
                    <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded">{currentType}</strong> to{' '}
                    <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded">{targetType}</strong>?
                  </DialogDescription>
                </div>
              </DialogHeader>
            </div>
            
            <DialogFooter className="p-6 pt-0 flex gap-3 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="flex-1 border-white/10 text-white hover:bg-white/5 h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={requestSwitch}
                disabled={loading}
                className={cn(
                  "flex-1 h-11 font-bold transition-all",
                  "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500",
                  "shadow-lg shadow-rose-500/20"
                )}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  'Confirm Switch'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};