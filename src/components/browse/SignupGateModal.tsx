import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { UserPlus, LogIn, Sparkles } from "lucide-react";

interface SignupGateModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional context for why the modal appeared */
  context?: "profile" | "message" | "like" | "default";
}

const contextMessages: Record<string, string> = {
  profile: "Create an account to view full profiles and photos.",
  message: "Create an account to send messages and start conversations.",
  like: "Create an account to like profiles and see who likes you.",
  default: "Create an account to view full profiles, send messages, and connect with members.",
};

export default function SignupGateModal({ open, onClose, context = "default" }: SignupGateModalProps) {
  const navigate = useNavigate();

  const handleNavigate = (mode: "signup" | "login") => {
    onClose();
    navigate(`/auth?mode=${mode}`); // ✅ Fixed: added opening parenthesis
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">Join Lynxx Club</DialogTitle>
          <DialogDescription className="text-center">{contextMessages[context]}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button size="lg" className="w-full gap-2" onClick={() => handleNavigate("signup")}>
            <UserPlus className="w-5 h-5" />
            Sign up free
          </Button>

          <Button variant="outline" size="lg" className="w-full gap-2" onClick={() => handleNavigate("login")}>
            <LogIn className="w-5 h-5" />
            Already have an account? Log in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
