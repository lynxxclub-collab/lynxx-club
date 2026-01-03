import { useEffect, useMemo, useState } from "react";
import { Mail, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { resendSignupVerificationEmail } from "@/lib/auth/resendVerification";

interface EmailVerificationReminderProps {
  email: string;
  onDismiss?: () => void;

  /** Seconds before user can resend again */
  cooldownSeconds?: number;

  /**
   * If set (in hours), dismissal expires and the banner will show again after that time
   * as a gentle reminder (e.g. 24).
   * Set to 0/undefined to keep dismissed indefinitely.
   */
  snoozeHours?: number;

  /** Optional key prefix if you have multiple apps/environments */
  storageKeyPrefix?: string;
}

export function EmailVerificationReminder({
  email,
  onDismiss,
  cooldownSeconds = 30,
  snoozeHours = 0,
  storageKeyPrefix = "email-verify-reminder",
}: EmailVerificationReminderProps) {
  const [isResending, setIsResending] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const safeEmail = useMemo(() => (email || "").trim(), [email]);
  const storageKey = useMemo(
    () => `${storageKeyPrefix}:${safeEmail.toLowerCase() || "unknown"}`,
    [storageKeyPrefix, safeEmail],
  );

  const canResend = !isResending && cooldownLeft === 0 && !!safeEmail;

  // Load dismissed state for this email
  useEffect(() => {
    if (!safeEmail) {
      setDismissed(false);
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setDismissed(false);
        return;
      }

      const parsed = JSON.parse(raw) as { dismissedAt: number };
      if (!parsed?.dismissedAt) {
        setDismissed(false);
        return;
      }

      // If snoozeHours is set, auto-un-dismiss after that duration
      if (snoozeHours && snoozeHours > 0) {
        const ms = snoozeHours * 60 * 60 * 1000;
        const expired = Date.now() - parsed.dismissedAt > ms;
        setDismissed(!expired);
        if (expired) localStorage.removeItem(storageKey);
      } else {
        setDismissed(true);
      }
    } catch {
      setDismissed(false);
    }
  }, [safeEmail, storageKey, snoozeHours]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setInterval(() => setCooldownLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldownLeft]);

  const humanizeError = (err: unknown) => {
    const msg = typeof err === "object" && err && "message" in err ? String((err as any).message) : "";

    if (/rate/i.test(msg) || /too many/i.test(msg)) return "Please wait a moment before trying again.";
    if (/invalid/i.test(msg) && /email/i.test(msg)) return "That email address doesn’t look valid.";
    if (/network/i.test(msg) || /fetch/i.test(msg)) return "Network error. Please check your connection and try again.";

    return msg || "Failed to resend verification email";
  };

  const handleResendVerification = async () => {
    if (!canResend) return;

    setIsResending(true);
    try {
      await resendSignupVerificationEmail(safeEmail);
      toast.success("Verification email sent! Check your inbox (and spam).");
      setCooldownLeft(cooldownSeconds);
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ dismissedAt: Date.now() }));
    } catch {
      // ignore storage issues
    }
    onDismiss?.();
  };

  if (dismissed) return null;

  return (
    <div
      className="bg-rose-500/10 border border-amber-500/30 rounded-lg p-4 mb-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-rose-500/20 rounded-full">
          <Mail className="w-5 h-5 text-amber-500" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1">Verify your email address</h3>

          <p className="text-sm text-muted-foreground mb-3 break-words">
            Please verify <span className="font-medium text-foreground/90">{safeEmail}</span> to access all features.
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleResendVerification}
              disabled={!canResend}
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold disabled:opacity-60"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : cooldownLeft > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend in {cooldownLeft}s
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend verification email
                </>
              )}
            </Button>

            <span className="text-xs text-muted-foreground">
              Didn’t get it? Check spam/promotions.
            </span>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss verification reminder"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}