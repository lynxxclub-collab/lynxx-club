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
import { Loader2, Ban, ShieldAlert } from 'lucide-react';
import { cn } from "@/lib/utils";

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
      <AlertDialogContent 
        className="bg-[#0f0f12] border-white/10 shadow-2xl"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <Ban className="w-5 h-5 text-rose-500" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-white">
              Block {userName}?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-white/60 pl-[3.25rem]">
            They won't be able to message you or see your profile. 
            You can unblock them later from settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel 
            disabled={loading}
            className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleBlock();
            }}
            disabled={loading}
            className={cn(
              "bg-rose-600 hover:bg-rose-500 text-white border-0 shadow-lg shadow-rose-500/20",
              "transition-colors duration-200"
            )}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Blocking...
              </div>
            ) : (
              "Block User"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}