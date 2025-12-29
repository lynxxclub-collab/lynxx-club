import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Heart, Eye, EyeOff, Lock, CheckCircle } from "lucide-react";

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Invalid or expired reset link. Please request a new one.");
        navigate("/forgot-password");
      }
    };
    checkSession();
  }, [navigate]);

  const validateForm = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success("Password updated successfully!");
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
            {success ? (
              /* Success State */
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2
                  className="text-2xl font-bold text-white mb-2"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Password updated!
                </h2>
                <p
                  className="text-white/50 text-sm mb-8"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Your password has been successfully reset. You can now sign in
                  with your new password.
                </p>
                <Button
                  onClick={() => navigate("/auth")}
                  className="w-full h-12 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-semibold rounded-xl"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Continue to sign in
                </Button>
              </div>
            ) : (
              /* Form State */
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-8 h-8 text-rose-400" />
                  </div>
                  <h2
                    className="text-2xl font-bold text-white mb-2"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Set new password
                  </h2>
                  <p
                    className="text-white/50 text-sm"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Create a strong password for your account
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-white/70 text-sm font-medium"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      New password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20 pr-12 transition-all"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p
                        className="text-sm text-rose-400"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-white/70 text-sm font-medium"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Confirm new password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20 pr-12 transition-all"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p
                        className="text-sm text-rose-400"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {errors.confirmPassword}
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
                        Updating...
                      </div>
                    ) : (
                      "Update password"
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
