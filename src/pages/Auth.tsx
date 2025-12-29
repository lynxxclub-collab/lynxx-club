import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Chrome,
  Heart,
  Video,
  MessageSquare,
  Gem,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<"login" | "signup">(searchParams.get("mode") === "login" ? "login" : "signup");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const userType = searchParams.get("type") || "seeker";

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/browse");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "login" || urlMode === "signup") {
      setMode(urlMode);
    }
  }, [searchParams]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup" && !agreeTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              user_type: userType,
            },
          },
        });

        if (error) throw error;
        toast.success("Account created! Please check your email to verify.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/browse");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/browse`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Google sign in failed");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-teal/5" />

      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Features (desktop only) */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="max-w-md">
            <Link to="/" className="flex items-center gap-2 mb-8">
              <Sparkles className="w-10 h-10 text-primary" />
              <span className="text-3xl font-display font-bold text-foreground">Lynxx Club</span>
            </Link>

            <h1 className="text-4xl font-display font-bold text-foreground mb-4">
              Where meaningful connections happen
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Meet amazing people through video dates. Real conversations, real connections.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Video Dates</h3>
                  <p className="text-sm text-muted-foreground">
                    Skip the awkward first dates. Connect face-to-face from anywhere.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-teal" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Real Conversations</h3>
                  <p className="text-sm text-muted-foreground">
                    Message verified members and build genuine connections.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Find Your Match</h3>
                  <p className="text-sm text-muted-foreground">
                    Join people finding meaningful relationships on Lynxx.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8">
            <div className="text-center mb-8">
              <Link to="/" className="flex items-center justify-center gap-2 mb-6 lg:hidden">
                <Sparkles className="w-8 h-8 text-primary" />
                <span className="text-2xl font-display font-bold text-foreground">Lynxx Club</span>
              </Link>

              {/* User type indicator */}
              {mode === "signup" && (
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 ${
                    userType === "earner" ? "bg-teal/10 text-teal" : "bg-primary/10 text-primary"
                  }`}
                >
                  {userType === "earner" ? (
                    <>
                      <Wallet className="w-4 h-4" />
                      Joining as Earner
                    </>
                  ) : (
                    <>
                      <Gem className="w-4 h-4" />
                      Joining as Seeker
                    </>
                  )}
                </div>
              )}

              <h2 className="text-2xl font-display font-bold text-foreground">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-muted-foreground mt-2">
                {mode === "login"
                  ? "Sign in to continue to Lynxx Club"
                  : "Join and claim your founding member benefits"}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-muted/50 rounded-lg mb-6">
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === "signup"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-background border-border"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-border"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground">
                    Password
                  </Label>
                  {mode === "login" && (
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background border-border"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(!!checked)}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              )}

              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                {mode === "signup" ? "Create Account" : "Sign In"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Social login */}
            <Button type="button" variant="outline" className="w-full border-border" onClick={handleGoogleAuth}>
              <Chrome className="w-4 h-4 mr-2" />
              Google
            </Button>

            {/* Switch user type */}
            {mode === "signup" && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Want to {userType === "earner" ? "find connections" : "earn money"} instead?{" "}
                  <Link
                    to={`/auth?mode=signup&type=${userType === "earner" ? "seeker" : "earner"}`}
                    className={userType === "earner" ? "text-primary hover:underline" : "text-teal hover:underline"}
                  >
                    Join as {userType === "earner" ? "Seeker" : "Earner"}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
