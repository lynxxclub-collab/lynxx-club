import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Heart, ArrowLeft, Mail, CheckCircle } from "lucide-react";

const emailSchema = z.string().email("Please enter a valid email");

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setEmailSent(true);
        toast.success("Password reset email sent!");
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a0f]">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-rose-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="w-full max-w-md p-6 relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <Heart className="w-8 h-8 text-rose-400 fill-rose-400/20" />
          <span
            className="text-2xl font-bold bg-gradient-to-r from-white to-rose-200 bg-clip-text text-transparent"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Lynxx Club
          </span>
        </div>

        {/* Card */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-amber-500/20 rounded-3xl blur-xl opacity-50" />

          <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10">
            {emailSent ? (
              /* Success State */
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2
                  className="text-2xl font-bold text-white mb-2"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Check your email
                </h2>
                <p
                  className="text-white/50 text-sm mb-6"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  We've sent a password reset link to{" "}
                  <span className="text-white font-medium">{email}</span>
                </p>
                <p
                  className="text-white/40 text-xs mb-8"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Didn't receive the email? Check your spam folder or try again
                  with a different email.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => setEmailSent(false)}
                    variant="outline"
                    className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Try another email
                  </Button>
                  <Link to="/auth">
                    <Button
                      className="w-full h-12 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-semibold rounded-xl"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Back to sign in
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* Form State */
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8 text-rose-400" />
                  </div>
                  <h2
                    className="text-2xl font-bold text-white mb-2"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Forgot your password?
                  </h2>
                  <p
                    className="text-white/50 text-sm"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    No worries! Enter your email and we'll send you a reset link.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-white/70 text-sm font-medium"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20 transition-all"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    />
                    {error && (
                      <p
                        className="text-sm text-rose-400"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {error}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-semibold rounded-xl disabled:opacity-50 transition-all"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </div>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                </form>

                <Link
                  to="/auth"
                  className="flex items-center justify-center gap-2 mt-6 text-white/50 hover:text-white transition-colors"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Back to sign in</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
