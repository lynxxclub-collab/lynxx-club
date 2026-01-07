import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Calendar,
  Mail,
  Ban,
  Clock,
  Check,
  User,
  History,
  FileText,
  AlertOctagon,
  Shield
} from 'lucide-react';

interface FraudFlag {
  id: string;
  user_id: string;
  flag_type: string;
  reason: string;
  severity: string;
  details: any;
  resolved: boolean | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  action_taken: string | null;
  created_at: string | null;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  profile_photos: string[] | null;
  account_status: string | null;
}

interface UserFraudHistory {
  totalFlags: number;
  criticalFlags: number;
  highFlags: number;
  resolvedAsFalsePositive: number;
}

interface FlagDetailModalProps {
  flag: FraudFlag;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function FlagDetailModal({ flag, open, onClose, onUpdate }: FlagDetailModalProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [fraudHistory, setFraudHistory] = useState<UserFraudHistory | null>(null);
  const [selectedAction, setSelectedAction] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isModifiedExternally, setIsModifiedExternally] = useState(false);

  useEffect(() => {
    if (open) {
      loadUserData();
      const channel = supabase
        .channel(`fraud_flag_${flag.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'fraud_flags',
            filter: `id=eq.${flag.id}`,
          },
          (payload) => {
            if (payload.new.resolved && !flag.resolved) {
              toast.info("This flag was just resolved by another admin.");
              setIsModifiedExternally(true);
              onUpdate();
              setTimeout(() => onClose(), 2000);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, flag.id, flag.resolved, onClose, onUpdate]);

  async function loadUserData() {
    try {
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', flag.user_id)
        .single();
      setUser(userData);

      const { data: allFlags } = await supabase
        .from('fraud_flags')
        .select('severity, resolved, action_taken')
        .eq('user_id', flag.user_id);

      if (allFlags) {
        setFraudHistory({
          totalFlags: allFlags.length,
          criticalFlags: allFlags.filter(f => f.severity === 'CRITICAL').length,
          highFlags: allFlags.filter(f => f.severity === 'HIGH').length,
          resolvedAsFalsePositive: allFlags.filter(f => f.action_taken === 'false_positive').length
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async function handleResolve() {
    if (!selectedAction) {
      toast.error('Please select an action');
      return;
    }

    if (!notes.trim()) {
      toast.error('Please provide resolution notes');
      return;
    }

    setLoading(true);
    try {
      if (selectedAction === 'suspend_7' || selectedAction === 'suspend_30') {
        const days = selectedAction === 'suspend_7' ? 7 : 30;
        const suspendUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        const { error } = await supabase
          .from('profiles')
          .update({
            account_status: 'suspended',
            suspend_until: suspendUntil.toISOString()
          })
          .eq('id', flag.user_id);

        if (error) throw error;
        toast.success(`User suspended for ${days} days`);

      } else if (selectedAction === 'ban') {
        const { error } = await supabase
          .from('profiles')
          .update({
            account_status: 'banned',
            ban_reason: notes,
            banned_at: new Date().toISOString()
          })
          .eq('id', flag.user_id);

        if (error) throw error;
        toast.success('User banned permanently');

      } else if (selectedAction === 'warning') {
        toast.success('Warning email sent (simulation)');
      } else if (selectedAction === 'false_positive') {
        toast.success('Resolved as false positive');
      }

      const { error: flagError } = await supabase
        .from('fraud_flags')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
          action_taken: selectedAction
        })
        .eq('id', flag.id);

      if (flagError) throw flagError;

      setShowConfirmDialog(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error resolving flag:', error);
      toast.error('Failed to resolve flag');
    } finally {
      setLoading(false);
    }
  }

  function getSeverityBadge(severity: string) {
    const s = severity.toUpperCase();
    if (s === 'CRITICAL') return <Badge className="bg-red-600 hover:bg-red-700 text-white">🔴 Critical</Badge>;
    if (s === 'HIGH') return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">🟠 High</Badge>;
    if (s === 'MEDIUM') return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">🟡 Medium</Badge>;
    return <Badge className="bg-green-600 hover:bg-green-700 text-white">🟢 Low</Badge>;
  }

  function getActionLabel(action: string) {
    switch (action) {
      case 'warning': return 'Send Warning Email';
      case 'suspend_7': return 'Suspend Account (7 days)';
      case 'suspend_30': return 'Suspend Account (30 days)';
      case 'ban': return 'Ban Permanently';
      case 'false_positive': return 'Resolve as False Positive';
      default: return action;
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[95vh] p-0 flex flex-col bg-[#0a0a0f] border-white/10">
          <DialogHeader className="p-6 pb-4 border-b border-white/10">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                Fraud Flag Review
                {isModifiedExternally && <span className="block text-xs text-red-400 font-normal">Updated by another admin</span>}
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6 space-y-6">
            {/* User Info Card */}
            <div className="flex items-start gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
              <Avatar className="h-16 w-16 border-2 border-white/10">
                <AvatarImage src={user?.profile_photos?.[0]} />
                <AvatarFallback className="bg-rose-500/20 text-rose-500 text-xl font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-white truncate">{user?.name || 'Unknown User'}</h3>
                  <Badge variant="outline" className="capitalize text-[10px] h-5 px-2 border-white/20 text-white/70">
                    {user?.account_status || 'Active'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <div className="text-[10px] text-white/30 font-mono">ID: {flag.user_id}</div>
              </div>
            </div>

            {/* Flag Details */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {getSeverityBadge(flag.severity)}
                <Badge variant="secondary" className="capitalize text-blue-300 bg-blue-500/10">
                  {flag.flag_type.replace(/_/g, ' ')}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-white/40 ml-auto">
                  <Calendar className="h-3 w-3" />
                  {flag.created_at ? new Date(flag.created_at).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <div>
                <Label className="text-white/80 text-sm">Report Reason</Label>
                <p className="bg-black/30 p-3 rounded-lg text-sm text-white/90 mt-1 border border-white/5">
                  {flag.reason}
                </p>
              </div>

              {flag.details && (
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-xs text-white/50 hover:text-white transition-colors select-none">
                    <FileText className="h-4 w-4" />
                    View Raw Data
                  </summary>
                  <pre className="mt-2 p-3 bg-black/50 rounded-lg text-xs text-green-400 overflow-x-auto border border-white/5 font-mono">
                    {JSON.stringify(flag.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            <Separator className="bg-white/10" />

            {/* History Stats */}
            {fraudHistory && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox label="Total Flags" value={fraudHistory.totalFlags} icon={Shield} />
                <StatBox label="Critical" value={fraudHistory.criticalFlags} icon={AlertOctagon} color="text-red-400" />
                <StatBox label="High" value={fraudHistory.highFlags} icon={AlertTriangle} color="text-orange-400" />
                <StatBox label="False Pos." value={fraudHistory.resolvedAsFalsePositive} icon={Check} color="text-green-400" />
              </div>
            )}

            {/* Admin Actions */}
            {!flag.resolved && !isModifiedExternally ? (
              <div className="space-y-4 pt-2">
                <Label className="text-white text-base font-medium">Resolution Action</Label>
                
                <RadioGroup value={selectedAction} onValueChange={setSelectedAction}>
                  <div className="space-y-2">
                    <ActionCard value="warning" icon={Mail} title="Send Warning Email" desc="Issue a formal warning to the user." selectedAction={selectedAction} />
                    <ActionCard value="suspend_7" icon={Clock} title="Suspend (7 Days)" desc="Temporary suspension of account." selectedAction={selectedAction} />
                    <ActionCard value="suspend_30" icon={Clock} title="Suspend (30 Days)" desc="Extended temporary suspension." selectedAction={selectedAction} />
                    <ActionCard value="ban" icon={Ban} title="Ban Permanently" desc="Terminates user access indefinitely." danger selectedAction={selectedAction} />
                    <ActionCard value="false_positive" icon={Check} title="False Positive" desc="Mark as a mistake; no action taken." success selectedAction={selectedAction} />
                  </div>
                </RadioGroup>

                <div>
                  <Label>Admin Notes (Required)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe why you took this action..."
                    className="mt-2 bg-black/20 border-white/10 focus:border-rose-500/50"
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-green-400">Resolved</p>
                  <p className="text-xs text-white/60 mt-1">Action: <span className="text-white/80">{getActionLabel(flag.action_taken || '')}</span></p>
                  {flag.resolution_notes && <p className="text-xs text-white/40 mt-1 italic">"{flag.resolution_notes}"</p>}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Sticky Footer Actions */}
          {!flag.resolved && !isModifiedExternally && (
            <div className="p-6 border-t border-white/10 bg-[#0a0a0f]">
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1 border-white/10 hover:bg-white/5">
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={!selectedAction || !notes.trim() || loading}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {loading ? 'Processing...' : 'Take Action'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-[#0a0a0f] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Resolution</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              You are about to: <strong className="text-white">{getActionLabel(selectedAction)}</strong>
              <br /><br />
              This will update the user's account status and log your admin ID.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResolve}
              disabled={loading}
              className={selectedAction === 'ban' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Helper Components
function ActionCard({ value, icon: Icon, title, desc, danger, success, selectedAction }: any) {
  const isSelected = selectedAction === value;
  return (
    <label className="cursor-pointer">
      <RadioGroupItem value={value} className="sr-only" />
      <div className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all
        ${isSelected ? 'bg-white/5 border-rose-500 ring-1 ring-rose-500/50' : 'border-white/10 hover:bg-white/5'}
        active:scale-[0.99]
      `}>
        <Icon className={`h-5 w-5 ${danger ? 'text-red-500' : success ? 'text-green-500' : 'text-white/60'}`} />
        <div className="flex-1">
          <p className={`text-sm font-semibold ${danger ? 'text-red-400' : success ? 'text-green-400' : 'text-white'}`}>{title}</p>
          <p className="text-xs text-white/40">{desc}</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-rose-500 bg-rose-500' : 'border-white/20'}`}>
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </label>
  );
}

function StatBox({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col items-center justify-center gap-1">
      <Icon className={`h-4 w-4 ${color || 'text-white/50'}`} />
      <span className="text-lg font-bold text-white">{value}</span>
      <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
    </div>
  );
}
