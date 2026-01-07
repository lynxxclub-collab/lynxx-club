import { useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { UserPlus, LogIn, Heart } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

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

  // REAL-TIME UX: Auto-close if user signs in from another tab (e.g. email link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        onClose();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = (mode: "signup" | "login") => {
    onClose();
    navigate(`/auth?mode=${mode}`);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0f] border-white/10 p-0 overflow-hidden shadow-2xl">
        
        {/* Top gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-purple-500 to-amber-500" />

        <div className="p-8 sm:p-6 space-y-6">
          <DialogHeader className="space-y-4">
            {/* Logo/Icon */}
            <div className="mx-auto relative group">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500/10 to-purple-500/10 border border-white/10 flex items-center justify-center shadow-[0_0_40px_-10px_rgba(244,63,94,0.3)] group-hover:scale-105 transition-transform duration-500">
                <Heart className="w-10 h-10 text-rose-400 fill-rose-400/20" />
              </div>
            </div>

            <DialogTitle
              className="text-center text-3xl font-bold text-white leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Join{" "}
              <span className="bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                Lynxx Club
              </span>
            </DialogTitle>

            <DialogDescription className="text-base text-white/60 leading-relaxed text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {contextMessages[context]}
            </DialogDescription>
          </DialogHeader>

          {/* Actions */}
          <div className="flex flex-col gap-3 mt-2">
            <Button
              size="lg"
              className="w-full h-14 gap-2 text-base font-bold rounded-xl shadow-xl shadow-rose-900/20 bg-gradient-to-r from-rose-600 via-purple-600 to-rose-600 hover:from-rose-500 hover:via-purple-500 hover:to-rose-500 text-white bg-[length:200%_100%] hover:bg-right transition-all duration-500 active:scale-[0.98]"
              onClick={() => handleNavigate("signup")}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <UserPlus className="w-5 h-5" />
              Sign up free
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-14 gap-2 text-base font-semibold rounded-xl border-white/10 text-white/70 hover:text-white hover:bg-white/5 hover:border-white/20 active:scale-[0.98]"
              onClick={() => handleNavigate("login")}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <LogIn className="w-5 h-5" />
              Log in
            </Button>
          </div>

          {/* Footer Legal */}
          <div className="pt-2 text-center">
            <p className="text-xs text-white/30 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              By signing up, you agree to our{" "}
              <a href="/terms" className="text-white/50 hover:text-rose-400 transition-colors underline underline-offset-2 decoration-white/10 hover:decoration-rose-400">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-white/50 hover:text-rose-400 transition-colors underline underline-offset-2 decoration-white/10 hover:decoration-rose-400">
                Privacy Policy
              </a>.
            </p>
          </div>
        </div>

        {/* Font import */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        `}</style>
      </DialogContent>
    </Dialog>
  );
}