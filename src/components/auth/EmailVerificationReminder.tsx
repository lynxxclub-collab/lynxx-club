import { useState, useEffect } from 'react';
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

  // REAL-TIME UPDATE: Listen for authentication state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // If the user just signed in or their session was updated (e.g. verified email)
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (session?.user?.email_confirmed_at) {
            // Automatically dismiss if verified
            setDismissed(true);
            onDismiss?.();
          }
        }
      }
    );

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, [onDismiss]);

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
    <div className="bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500 rounded-r-lg p-4 mb-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Icon */}
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full shrink-0">
          <Mail className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>

        {/* Text Content */}
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-foreground text-base sm:text-sm">
            Verify your email address
          </h3>
          <p className="text-sm text-muted-foreground leading-snug">
            We sent a link to <span className="font-medium text-foreground">{email}</span>. 
            Please verify to access messaging and video calls.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-center">
          <Button
            onClick={handleResendVerification}
            disabled={isResending}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto transition-colors"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend'
            )}
          </Button>
          
          <button
            onClick={handleDismiss}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}