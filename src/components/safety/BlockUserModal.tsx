import { useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Ban } from 'lucide-react';

interface BlockUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onBlocked?: () => void;
}

export default function BlockUserModal({
  open,
  onOpenChange,
  userId,
  userName,
  onBlocked
}: BlockUserModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('blocked_users').insert({
        blocker_id: user.id,
        blocked_id: userId
      });

      if (error) throw error;

      toast.success(`${userName} has been blocked`);
      onOpenChange(false);
      onBlocked?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to block user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-destructive" />
            Block {userName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            They won't be able to message you or see your profile. 
            You can unblock them later from settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBlock}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Block User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}