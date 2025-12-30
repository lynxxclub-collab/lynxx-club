import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff, Heart, MessageCircle, Video, Users } from "lucide-react";
import { useLaunchSignups } from "@/hooks/useLaunchSignups";

const emailSchema = z.string().email("Please enter a valid email");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { signUp, signIn, signInWithGoogle } = useAuth(); 
  const navigate = useNavigate();
  const { seekerSpotsLeft, earnerSpotsLeft, seekerCount, earnerCount } = useLaunchSignups();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please sign in instead.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Account created! Let's set up your profile.");
          navigate("/onboarding");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("Invalid email or password. Please try again.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome back!");
          navigate("/onboarding");
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: MessageCircle, text: "Private messaging" },
    { icon: Video, text: "Video calls" },
    { icon: Users, text: "Real connections" },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#0a0a0f]">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-rose-900/20 via-transparent to-transparent" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-rose-500/5 rounded-full blur-[80px] animate-pulse"
          style={{ animationDelay: "2s" }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative z-10 flex-col justify-between p-12 xl:p-20">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-20">
            <div className="relative">
              <Heart className="w-10 h-10 text-rose-400 fill-rose-400/20" />
              <div className="absolute inset-0 blur-lg bg-rose-400/30" />
            </div>
            <span
              className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-rose-200 to-purple-200 bg-clip-text text-transparent"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Lynxx Club
            </span>
          </div>

          {/* Launch banner */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/30 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
            </span>
            <span className="text-sm font-semibold text-amber-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              🚀 Launch Week — Limited Time Offers
            </span>
          </div>

          {/* Hero text */}
          <div className="max-w-xl">
            <h1
              className="text-5xl xl:text-6xl font-bold leading-[1.1] mb-6 text-white"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Where genuine
              <span className="block bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                connections
              </span>
              find their worth
            </h1>
            <p className="text-lg text-white/50 leading-relaxed mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              A premium platform where seekers invest in meaningful conversations with earners. From messages to video
              calls to meeting in person.
            </p>

            {/* Launch Promotions */}
            <div className="space-y-4 mb-12">
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20 p-5 hover:border-purple-500/40 transition-all">
                <div
                  className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  SEEKERS
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                    <span className="text-2xl">💎</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      First 100 Seekers get 100 Free Credits
                    </h3>
                    <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Start connecting instantly — no payment required
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500" 
                      style={{ width: `${(seekerCount / 100) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-purple-300 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {seekerSpotsLeft} spots left
                  </span>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20 p-5 hover:border-amber-500/40 transition-all">
                <div
                  className="absolute top-0 right-0 bg-rose-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  EARNERS
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      First 50 Earners get Featured Status
                    </h3>
                    <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Premium visibility & priority in search results
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500" 
                      style={{ width: `${(earnerCount / 50) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-amber-300 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {earnerSpotsLeft} spots left
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom - Features instead of fake stats */}
        <div className="flex gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 text-white/60"
              style={{
                animation: "fadeInUp 0.6s ease-out forwards",
                animationDelay: `${index * 0.15}s`,
                opacity: 0,
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                <feature.icon className="w-5 h-5 text-rose-400/80" />
              </div>
              <span className="text-sm font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div
          className="w-full max-w-md"
          style={{
            animation: "fadeIn 0.8s ease-out forwards",
          }}
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
            <Heart className="w-8 h-8 text-rose-400 fill-rose-400/20" />
            <span
              className="text-2xl font-bold bg-gradient-to-r from-white to-rose-200 bg-clip-text text-transparent"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Lynxx Club
            </span>
          </div>

          {/* Mobile promotions */}
          <div className="lg:hidden space-y-3 mb-6">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <span className="text-lg">💎</span>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  First 100 Seekers: 100 Free Credits
                </p>
              </div>
              <span className="text-xs text-purple-300 font-medium px-2 py-1 bg-purple-500/20 rounded-full">
                {seekerSpotsLeft} left
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-amber-500/20">
              <span className="text-lg">⭐</span>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  First 50 Earners: Featured Status
                </p>
              </div>
              <span className="text-xs text-amber-300 font-medium px-2 py-1 bg-amber-500/20 rounded-full">{earnerSpotsLeft} left</span>
            </div>
          </div>

          {/* Card */}
          <div className="relative">
            {/* Card glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-amber-500/20 rounded-3xl blur-xl opacity-50" />

            <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {isSignUp ? "Create your account" : "Welcome back"}
                </h2>
                <p className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {isSignUp ? "Start your journey to meaningful connections" : "Sign in to continue where you left off"}
                </p>
              </div>

              {/* Form */}
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
                  {errors.email && (
                    <p className="text-sm text-rose-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-white/70 text-sm font-medium"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Password
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
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-rose-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {errors.password}
                    </p>
                  )}
                </div>

                {!isSignUp && (
                  <div className="flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-white/40 hover:text-rose-400 transition-colors"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-rose-400/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0a0a0f] px-2 text-white/60">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <Button
            type="button"
            onClick={async () => {
              const { error } = await signInWithGoogle();
              if (error) {
                toast.error(error.message);
              }
            }}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 border border-gray-300"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500 hover:from-rose-400 hover:via-purple-400 hover:to-rose-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98] bg-[length:200%_100%] hover:bg-right"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Please wait...</span>
                    </div>
                  ) : isSignUp ? (
                    "Create Account"
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>


              {/* Toggle */}
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-white/50 hover:text-white transition-colors"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {isSignUp ? "Already have an account? " : "Don't have an account? "}
                  <span className="text-rose-400 font-medium hover:underline">{isSignUp ? "Sign in" : "Sign up"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-white/30 mt-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            By continuing, you agree to our{" "}
            <a href="#" className="text-white/50 hover:text-rose-400 transition-colors">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-white/50 hover:text-rose-400 transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>

      {/* CSS Keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translateY(20px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
