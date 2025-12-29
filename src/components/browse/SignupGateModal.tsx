import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { UserPlus, LogIn, Heart } from "lucide-react";

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
    navigate(`/auth?mode=${mode}`);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0f] border-white/10 p-0 overflow-hidden">
        {/* Top gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-purple-500 to-amber-500" />

        <div className="p-6">
          <DialogHeader className="space-y-4">
            {/* Logo */}
            <div className="mx-auto relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                <Heart className="w-8 h-8 text-rose-400 fill-rose-400/20" />
              </div>
              <div className="absolute inset-0 blur-xl bg-rose-500/20 -z-10" />
            </div>

            <DialogTitle
              className="text-center text-2xl text-white"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Join{" "}
              <span className="bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                Lynxx Club
              </span>
            </DialogTitle>

            <DialogDescription className="text-center text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {contextMessages[context]}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-6">
            <Button
              size="lg"
              className="w-full h-12 gap-2 bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500 hover:from-rose-400 hover:via-purple-400 hover:to-rose-400 text-white font-semibold rounded-xl shadow-lg shadow-rose-500/20 bg-[length:200%_100%] hover:bg-right transition-all duration-300"
              onClick={() => handleNavigate("signup")}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <UserPlus className="w-5 h-5" />
              Sign up free
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 gap-2 border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl"
              onClick={() => handleNavigate("login")}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <LogIn className="w-5 h-5" />
              Already have an account? Log in
            </Button>
          </div>

          {/* Bottom text */}
          <p className="text-center text-xs text-white/30 mt-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            By signing up, you agree to our{" "}
            <a href="/terms" className="text-white/50 hover:text-rose-400 transition-colors">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-white/50 hover:text-rose-400 transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Font import */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
