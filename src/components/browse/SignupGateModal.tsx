import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { UserPlus, LogIn, Heart, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SignupGateContext = "profile" | "message" | "like" | "default";

interface SignupGateModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional context for why the modal appeared */
  context?: SignupGateContext;
  /** Optional: show a small "Not now" action */
  showNotNow?: boolean;
}

const CONTEXT_COPY: Record<SignupGateContext, { title: string; body: string }> = {
  profile: {
    title: "Unlock full profiles",
    body: "Create an account to view full profiles and photos.",
  },
  message: {
    title: "Start the conversation",
    body: "Create an account to send messages and start conversations.",
  },
  like: {
    title: "Save your favorites",
    body: "Create an account to like profiles and see who likes you.",
  },
  default: {
    title: "Join Lynxx Club",
    body: "Create an account to view full profiles, send messages, and connect with members.",
  },
};

export default function SignupGateModal({
  open,
  onClose,
  context = "default",
  showNotNow = true,
}: SignupGateModalProps) {
  const navigate = useNavigate();
  const copy = CONTEXT_COPY[context];

  const go = (mode: "signup" | "login") => {
    onClose();
    navigate(`/auth?mode=${mode}`);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          "sm:max-w-md p-0 overflow-hidden",
          "bg-[#0a0a0f] border border-white/10",
          "shadow-2xl shadow-black/40",
          "rounded-2xl"
        )}
      >
        {/* Top gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-purple-500 to-amber-500" />

        <div className="p-6">
          <DialogHeader className="space-y-4">
            {/* Emblem */}
            <div className="mx-auto relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/15 to-purple-500/15 border border-white/10 flex items-center justify-center">
                <Heart className="w-8 h-8 text-rose-400 fill-rose-400/15" />
              </div>
              <div className="absolute inset-0 blur-xl bg-rose-500/15 -z-10" />
            </div>

            <DialogTitle
              className="text-center text-2xl text-white"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {copy.title}{" "}
              {context === "default" && (
                <span className="bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                  Lynxx Club
                </span>
              )}
            </DialogTitle>

            <DialogDescription
              className="text-center text-white/55"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {copy.body}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              size="lg"
              className={cn(
                "w-full h-12 gap-2 rounded-xl font-semibold",
                "text-white",
                "bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500",
                "hover:from-rose-400 hover:via-purple-400 hover:to-rose-400",
                "shadow-lg shadow-rose-500/15",
                "bg-[length:200%_100%] hover:bg-right transition-all duration-300",
                "focus-visible:ring-2 focus-visible:ring-rose-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
              )}
              onClick={() => go("signup")}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <UserPlus className="w-5 h-5" />
              Sign up free
              <ArrowRight className="w-4 h-4 ml-auto opacity-80" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className={cn(
                "w-full h-12 gap-2 rounded-xl",
                "border-white/10 text-white/75",
                "hover:text-white hover:bg-white/5",
                "focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
              )}
              onClick={() => go("login")}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <LogIn className="w-5 h-5" />
              Log in
            </Button>

            {showNotNow && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-white/50 hover:text-white hover:bg-white/5 rounded-xl"
                onClick={onClose}
              >
                Not now
              </Button>
            )}
          </div>

          {/* Bottom links */}
          <p
            className="text-center text-xs text-white/30 mt-6"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            By signing up, you agree to our{" "}
            <a href="/terms" className="text-white/55 hover:text-rose-300 transition-colors">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-white/55 hover:text-rose-300 transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}