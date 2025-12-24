import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Flag, AlertTriangle } from 'lucide-react';

interface ReportUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

const REPORT_REASONS = [
  { value: 'inappropriate', label: 'Inappropriate messages', icon: '💬' },
  { value: 'harassment', label: 'Harassment or bullying', icon: '😠' },
  { value: 'scam', label: 'Scam attempt', icon: '🚨' },
  { value: 'fake', label: 'Fake profile', icon: '🎭' },
  { value: 'other', label: 'Other', icon: '📝' },
];

export default function ReportUserModal({
  open,
  onOpenChange,
  userId,
  userName
}: ReportUserModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!user || !reason) {
      toast.error('Please select a reason');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_id: userId,
        reason,
        description: description.trim() || null
      });

      if (error) throw error;

      toast.success('Report submitted. Our team will review it.');
      onOpenChange(false);
      setReason('');
      setDescription('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            Report {userName}
          </DialogTitle>
          <DialogDescription>
            Help us keep Lynxx Club safe. Select a reason for your report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup value={reason} onValueChange={setReason}>
            {REPORT_REASONS.map((r) => (
              <div
                key={r.value}
                className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => setReason(r.value)}
              >
                <RadioGroupItem value={r.value} id={r.value} />
                <Label htmlFor={r.value} className="flex-1 cursor-pointer flex items-center gap-2">
                  <span>{r.icon}</span>
                  {r.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label>Additional details (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more context about what happened..."
              rows={3}
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-secondary/50 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 text-gold mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              False reports may result in action against your account. 
              Only report genuine violations.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !reason}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}