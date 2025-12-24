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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  History
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

  useEffect(() => {
    if (open) {
      loadUserData();
    }
  }, [open, flag.id]);

  async function loadUserData() {
    try {
      // Load user profile
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', flag.user_id)
        .single();
      setUser(userData);

      // Load fraud history
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
      // Take action on user account
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
        // In production, this would call an edge function to send email
        toast.success('Warning email sent (simulation)');

      } else if (selectedAction === 'false_positive') {
        toast.success('Resolved as false positive');
      }

      // Mark flag as resolved
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
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return <Badge variant="destructive" className="text-sm">🔴 Critical</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-500 text-sm">🟠 High</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-500 text-sm">🟡 Medium</Badge>;
      case 'LOW':
        return <Badge className="bg-green-500 text-sm">🟢 Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
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
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <ScrollArea className="max-h-[85vh]">
            <div className="space-y-6 pr-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Fraud Flag Detail
                </DialogTitle>
              </DialogHeader>

              {/* User Info */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.profile_photos?.[0]} />
                  <AvatarFallback className="text-xl">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{user?.name || 'Unknown User'}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user?.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ID: {flag.user_id.slice(0, 8)}...
                  </p>
                  {user?.account_status && (
                    <Badge variant="outline" className="mt-1 capitalize">
                      {user.account_status}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Flag Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Severity:</span>
                  {getSeverityBadge(flag.severity)}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <Badge variant="secondary" className="capitalize">
                    {flag.flag_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Created: {flag.created_at ? new Date(flag.created_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Reason</h4>
                <p className="bg-muted/50 p-3 rounded-lg text-sm">{flag.reason}</p>
              </div>

              {flag.details && (
                <div>
                  <h4 className="font-medium mb-2">Details</h4>
                  <pre className="bg-muted/50 p-3 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(flag.details, null, 2)}
                  </pre>
                </div>
              )}

              <Separator />

              {/* Fraud History */}
              {fraudHistory && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    User's Fraud History
                  </h4>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                    <p>Total flags: <span className="font-semibold">{fraudHistory.totalFlags}</span></p>
                    <p>Critical: <span className="font-semibold text-red-500">{fraudHistory.criticalFlags}</span></p>
                    <p>High: <span className="font-semibold text-orange-500">{fraudHistory.highFlags}</span></p>
                    <p>Resolved as false positive: <span className="font-semibold text-green-500">{fraudHistory.resolvedAsFalsePositive}</span></p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Admin Actions */}
              {!flag.resolved ? (
                <div className="space-y-4">
                  <h4 className="font-medium">Admin Actions</h4>
                  
                  <RadioGroup value={selectedAction} onValueChange={setSelectedAction}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="warning" id="warning" />
                        <Label htmlFor="warning" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Send Warning Email
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="suspend_7" id="suspend_7" />
                        <Label htmlFor="suspend_7" className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Suspend Account (7 days)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="suspend_30" id="suspend_30" />
                        <Label htmlFor="suspend_30" className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Suspend Account (30 days)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ban" id="ban" />
                        <Label htmlFor="ban" className="flex items-center gap-2 text-destructive">
                          <Ban className="h-4 w-4" />
                          Ban Permanently
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false_positive" id="false_positive" />
                        <Label htmlFor="false_positive" className="flex items-center gap-2 text-green-600">
                          <Check className="h-4 w-4" />
                          Resolve as False Positive
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>

                  <div>
                    <Label>Resolution Notes (required)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Explain your decision..."
                      className="mt-2"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={!selectedAction || !notes.trim()}
                    >
                      Take Action
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Resolved
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>Action taken: <span className="font-medium">{getActionLabel(flag.action_taken || '')}</span></p>
                    <p>Resolved at: {flag.resolved_at ? new Date(flag.resolved_at).toLocaleString() : 'N/A'}</p>
                    {flag.resolution_notes && (
                      <div className="mt-2">
                        <p className="text-muted-foreground">Notes:</p>
                        <p>{flag.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to: <strong>{getActionLabel(selectedAction)}</strong>
              <br /><br />
              This action will be logged and cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResolve}
              disabled={loading}
              className={selectedAction === 'ban' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
