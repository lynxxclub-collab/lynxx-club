1import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorCap } from "@/hooks/useCreatorCap";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Wallet,
  Shield,
  ArrowRight,
  MessageCircle,
  Video,
  Users,
  Star,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import Footer from "@/components/Footer";
import { useLaunchSignups } from "@/hooks/useLaunchSignups";

// Lazy load FeaturedEarners - not needed for initial viewport
const FeaturedEarners = lazy(() =>
  import("@/components/home/FeaturedEarners").then((m) => ({ default: m.FeaturedEarners })),
);
export default function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { seekerSpotsLeft, earnerSpotsLeft, loading: launchLoading } = useLaunchSignups();
  const { is_capped, spots_remaining } = useCreatorCap();

  // Temporarily disabled for public access
  // useEffect(() => {
  //   if (!loading && user && profile) {
  //     if (profile.account_status === "active") {
  //       if (profile.user_type === "seeker") {
  //         navigate("/browse");
  //       } else {
  //         navigate("/dashboard");
  //       }
  //     } else {
  //       navigate("/onboarding");
  //     }
  //   }
  // }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-rose-400 animate-spin" />
            <div
              className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-r-purple-400 animate-spin"
              style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
            />
          </div>
          <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Heart,
      title: "Quality Connections",
      description: "Every member is verified. Connect with people who value meaningful interactions.",
      gradient: "from-rose-500/20 to-rose-500/5",
      iconBg: "bg-rose-500/20",
      iconColor: "text-rose-400",
    },
    {
      icon: Wallet,
      title: "Earn on Your Terms",
      description: "Set your rates, manage availability, and withdraw earnings anytime.",
      gradient: "from-amber-500/20 to-amber-500/5",
      iconBg: "bg-rose-500/20",
      iconColor: "text-amber-400",
    },
    {
      icon: Shield,
      title: "Safe & Secure",
      description: "Advanced verification and moderation keep the community trusted.",
      gradient: "from-purple-500/20 to-purple-500/5",
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-400",
    },
  ];

  const steps = [
    { icon: Users, label: "Create Profile", desc: "Sign up and verify your identity" },
    { icon: MessageCircle, label: "Connect", desc: "Message and get to know each other" },
    { icon: Video, label: "Video Chat", desc: "Take it to the next level with video calls" },
    { icon: Heart, label: "Meet Up", desc: "Turn virtual connections into real ones" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
      {/* Background effects - using fixed positioning to prevent layout shifts */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-rose-900/15 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-500/5 rounded-full blur-[150px]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <main className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-3">
                <div className="relative">
                  <Heart className="w-8 h-8 text-rose-400 fill-rose-400/20" />
                  <div className="absolute inset-0 blur-lg bg-rose-400/30" />
                </div>
                <span
                  className="text-2xl font-bold bg-gradient-to-r from-white via-rose-200 to-purple-200 bg-clip-text text-transparent"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Lynxx Club
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-8">
                <Link
                  to="/browse"
                  className="text-sm text-white/50 hover:text-white transition-colors"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Browse
                </Link>
                <Link
                  to="/about"
                  className="text-sm text-white/50 hover:text-white transition-colors"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  How It Works
                </Link>
                <Link
                  to="/faq/pricing"
                  className="text-sm text-white/50 hover:text-white transition-colors"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Pricing
                </Link>
              </nav>

              <div className="flex items-center gap-3">
                <Link to="/auth">
                  <Button
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/5"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button
                    className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white shadow-lg shadow-rose-500/20"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="container mx-auto px-4 pt-20 pb-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Launch badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/30 mb-8"
              style={{ animation: "fadeInUp 0.6s ease-out forwards" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
              </span>
              <span className="text-sm font-semibold text-amber-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                🚀 Now Live — Limited Launch Offers Available
              </span>
            </div>

            <h1
              className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] text-white"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Premium Dating,
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Your Terms
              </span>
            </h1>

            <p
              className="text-xl text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                animation: "fadeInUp 0.6s ease-out 0.2s forwards",
                opacity: 0,
              }}
            >
              Connect with quality people. Whether you're seeking meaningful conversations or earning from your time,
              Lynxx Club makes it happen.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              style={{ animation: "fadeInUp 0.6s ease-out 0.3s forwards", opacity: 0 }}
            >
              <Link to="/auth?type=seeker">
                <Button
                  size="lg"
                  className="h-14 px-8 bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500 hover:from-rose-400 hover:via-purple-400 hover:to-rose-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.02] bg-[length:200%_100%] hover:bg-right"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Start Dating
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/auth?type=earner">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 border-amber-500/50 text-amber-300 hover:bg-rose-500/10 hover:border-amber-500 rounded-xl transition-all"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Wallet className="mr-2 w-5 h-5" />
                  Start Earning
                </Button>
              </Link>
            </div>

            {/* Quick stats */}
            <div
              className="flex items-center justify-center gap-8 mt-12 pt-12 border-t border-white/5"
              style={{ animation: "fadeInUp 0.6s ease-out 0.4s forwards", opacity: 0 }}
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  100
                </div>
                <div className="text-xs text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Free credits for seekers
                </div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  50
                </div>
                <div className="text-xs text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Featured earner spots
                </div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  30
                </div>
                <div className="text-xs text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Days featured placement
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Launch Promotions */}
        <section className="container mx-auto px-4 pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Seeker promo */}
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 p-8 hover:border-purple-500/40 transition-all">
                <div
                  className="absolute top-4 right-4 bg-purple-700 text-white text-xs font-bold px-3 py-1 rounded-full"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  SEEKERS
                </div>
                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6">
                  <span className="text-3xl">💎</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                  100 Free Credits
                </h2>
                <p className="text-white/50 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  First 100 seekers get 100 credits to start connecting instantly — no payment required.
                </p>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[68%] bg-gradient-to-r from-purple-400 to-purple-600 rounded-full" />
                  </div>
                  <span className="text-sm text-purple-300 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {seekerSpotsLeft} spots left
                  </span>
                </div>
                <Link to="/auth?type=seeker">
                  <Button
                    className="w-full h-12 bg-purple-700 hover:bg-purple-600 text-white rounded-xl"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Claim Your Credits
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {/* Earner promo */}
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-8 hover:border-amber-500/40 transition-all">
                <div
                  className="absolute top-4 right-4 bg-rose-500 text-black text-xs font-bold px-3 py-1 rounded-full"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  CREATORS
                </div>
                <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mb-6">
                  <span className="text-3xl">⭐</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {is_capped ? "Apply to Create" : "Featured Status"}
                </h2>
                <p className="text-white/50 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {is_capped
                    ? "Creator spots are limited during early access. We're onboarding a small group to ensure quality, stability, and fair earnings."
                    : "First 50 creators get featured placement for 30 days — premium visibility & priority in search."}
                </p>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                      style={{ width: `${Math.max(0, 100 - (spots_remaining / 50) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-amber-300 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {is_capped ? "Full" : `${spots_remaining} spots left`}
                  </span>
                </div>
                <Link to="/auth?type=earner">
                  <Button
                    className="w-full h-12 bg-rose-500 hover:bg-rose-400 text-black rounded-xl"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {is_capped ? (
                      <>
                        <AlertCircle className="mr-2 w-4 h-4" />
                        Apply to Become a Creator
                      </>
                    ) : (
                      <>
                        Get Featured
                        <ChevronRight className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-24">
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Why{" "}
              <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
                Lynxx Club
              </span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              A premium platform designed for meaningful connections and mutual value.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${feature.gradient} border border-white/10 p-8 hover:border-white/20 transition-all group`}
                style={{ animation: `fadeInUp 0.6s ease-out ${0.1 * index}s forwards`, opacity: 0 }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${feature.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {feature.title}
                </h3>
                <p className="text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 py-24">
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              How It{" "}
              <span className="bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">Works</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              From first message to meeting in person — simple, safe, and rewarding.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="text-center"
                  style={{ animation: `fadeInUp 0.6s ease-out ${0.1 * index}s forwards`, opacity: 0 }}
                >
                  <div className="relative inline-flex mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <step.icon className="w-7 h-7 text-rose-400" />
                    </div>
                    <div
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-rose-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="text-white font-semibold mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {step.label}
                  </h3>
                  <p className="text-white/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Earners - lazy loaded */}
        <Suspense fallback={<div className="py-20 px-4 bg-[#0a0a0f]" />}>
          <FeaturedEarners />
        </Suspense>

        {/* Final CTA */}
        <section className="container mx-auto px-4 py-24">
          <div className="relative max-w-4xl mx-auto">
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-amber-500/20 rounded-[40px] blur-2xl opacity-50" />

            <div className="relative rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-12 md:p-16 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 mb-6">
                <Star className="w-4 h-4 text-rose-400 fill-rose-400" />
                <span className="text-sm font-medium text-rose-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Join the community
                </span>
              </div>

              <h2
                className="text-4xl md:text-5xl font-bold text-white mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Ready to{" "}
                <span className="bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                  connect?
                </span>
              </h2>

              <p
                className="text-white/50 text-lg mb-8 max-w-xl mx-auto"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Whether you're looking to meet someone special or earn on your own terms, your journey starts here.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/auth">
                  <Button
                    size="lg"
                    className="h-14 px-10 bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500 hover:from-rose-400 hover:via-purple-400 hover:to-rose-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.02] bg-[length:200%_100%] hover:bg-right"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>

              <p className="text-white/30 text-sm mt-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                No credit card required • Launch offers ending soon
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </main>

      {/* CSS Keyframes */}
      <style>{`
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
