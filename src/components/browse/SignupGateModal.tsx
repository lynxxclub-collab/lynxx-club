import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { UserPlus, LogIn } from 'lucide-react';

interface SignupGateModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SignupGateModal({ open, onClose }: SignupGateModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Join Lynxx Club</DialogTitle>
          <DialogDescription className="text-center">
            Create an account to view full profiles, send messages, and connect with members.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={() => {
              onClose();
              navigate('/auth?mode=signup');
            }}
          >
            <UserPlus className="w-5 h-5" />
            Sign up free
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2"
            onClick={() => {
              onClose();
              navigate('/auth?mode=login');
            }}
          >
            <LogIn className="w-5 h-5" />
            Already have an account? Log in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
