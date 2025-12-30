import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { useLaunchSignups } from "@/hooks/useLaunchSignups";
import { Gem, Wallet, Rocket, Users, Sparkles, TrendingUp } from "lucide-react";

export default function Launch() {
  const { user } = useAuth();
  const { seekerCount, earnerCount, seekerSpotsLeft, earnerSpotsLeft, loading } = useLaunchSignups();
  
  const seekerGoal = 100;
  const earnerGoal = 50;
  
  const seekerPercentage = Math.min((seekerCount / seekerGoal) * 100, 100);
  const earnerPercentage = Math.min((earnerCount / earnerGoal) * 100, 100);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10">
        <Header />

        {/* Hero */}
        <section className="relative pt-20 pb-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-amber-500/20 mb-6">
              <Rocket className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Live Progress
              </span>
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
              </span>
            </div>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Launch{" "}
              <span className="bg-gradient-to-r from-purple-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
                Progress
              </span>
            </h1>
            <p className="text-xl text-white/50 max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Watch Lynxx Club grow in real-time. Claim your early adopter perks before they're gone!
            </p>
          </div>
        </section>

        {/* Progress Cards */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Seekers Progress */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-rose-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative rounded-2xl bg-white/[0.02] border border-white/10 p-6 md:p-8 hover:border-purple-500/30 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                      <Gem className="w-7 h-7 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Seekers
                      </h2>
                      <p className="text-sm text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        100 bonus credits each
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-3xl font-bold text-purple-400"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {loading ? "..." : seekerCount}
                    </span>
                    <span className="text-xl text-white/30"> / {seekerGoal}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-rose-500 h-3 rounded-full transition-all duration-500 relative"
                      style={{ width: `${seekerPercentage}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                    </div>
                  </div>
                </div>

                {seekerSpotsLeft > 0 ? (
                  <p className="text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <strong className="text-white">{seekerSpotsLeft} spots left</strong> for{" "}
                    <span className="text-purple-400 font-semibold">100 bonus credits</span> — a head start on
                    conversations or your first video date.
                  </p>
                ) : (
                  <p
                    className="text-green-400 font-semibold flex items-center gap-2"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Launch bonus claimed! Regular pricing now active.
                  </p>
                )}
              </div>
            </div>

            {/* Earners Progress */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative rounded-2xl bg-white/[0.02] border border-white/10 p-6 md:p-8 hover:border-amber-500/30 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-amber-500/30 flex items-center justify-center">
                      <Wallet className="w-7 h-7 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Earners
                      </h2>
                      <p className="text-sm text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        30 days featured placement
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-amber-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {loading ? "..." : earnerCount}
                    </span>
                    <span className="text-xl text-white/30"> / {earnerGoal}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-500 relative"
                      style={{ width: `${earnerPercentage}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                    </div>
                  </div>
                </div>

                {earnerSpotsLeft > 0 ? (
                  <p className="text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <strong className="text-white">{earnerSpotsLeft} spots left</strong> for{" "}
                    <span className="text-amber-400 font-semibold">featured placement</span> (30 days at the top of
                    search results)
                  </p>
                ) : (
                  <p
                    className="text-green-400 font-semibold flex items-center gap-2"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Featured spots claimed! Regular onboarding now active.
                  </p>
                )}
              </div>
            </div>

            {/* Total Members */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Users className="w-5 h-5 text-rose-400" />
                <span className="text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Total Early Members
                </span>
              </div>
              <p
                className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-rose-400 to-amber-300 bg-clip-text text-transparent"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {loading ? "..." : seekerCount + earnerCount}
              </p>
              <div className="flex items-center justify-center gap-1 mt-2 text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Growing every day
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 via-rose-500/20 to-amber-500/20 rounded-[32px] blur-xl opacity-50" />
              <div className="relative rounded-3xl bg-white/[0.03] backdrop-blur-sm border border-white/10 p-8 md:p-10 text-center">
                <h3
                  className="text-2xl md:text-3xl font-bold text-white mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Ready to{" "}
                  <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
                    Join?
                  </span>
                </h3>
                <p className="text-white/50 mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Don't miss out on early adopter perks. Sign up now and claim your bonus!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    asChild
                    className="h-14 px-8 bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-400 hover:to-rose-400 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/20"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Link to="/auth?type=seeker">
                      <Gem className="w-5 h-5 mr-2" />
                      Join as Seeker
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    asChild
                    className="h-14 px-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Link to="/auth?type=earner">
                      <Wallet className="w-5 h-5 mr-2" />
                      Join as Earner
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Links */}
        <section className="py-8 px-4 border-t border-white/5">
          <div className="max-w-4xl mx-auto text-center">
            <div
              className="flex flex-wrap justify-center gap-4 text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Link to="/about" className="text-white/40 hover:text-rose-400 transition-colors">
                About Us
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/help" className="text-white/40 hover:text-rose-400 transition-colors">
                Help Center
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/safety" className="text-white/40 hover:text-rose-400 transition-colors">
                Safety
              </Link>
            </div>
          </div>
        </section>

        {user && <MobileNav />}
      </div>

    </div>
  );
}
