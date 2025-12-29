import { useState } from 'react';
import { Mail, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailVerificationReminderProps {
  email: string;
  onDismiss?: () => void;
}

export function EmailVerificationReminder({ email, onDismiss }: EmailVerificationReminderProps) {
  const [isResending, setIsResending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/20 rounded-full">
          <Mail className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">
            Verify your email address
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Please verify your email address ({email}) to access all features. 
            Check your inbox for a verification link.
          </p>
          <Button
            onClick={handleResendVerification}
            disabled={isResending}
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend verification email
              </>
            )}
          </Button>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
