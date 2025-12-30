import { Link } from "react-router-dom";
import { ArrowLeft, CreditCard, Wallet, HelpCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import PricingFAQ from "@/components/faq/PricingFAQ";
import CreatorPayoutFAQ from "@/components/faq/CreatorPayoutFAQ";

export default function PricingFAQPage() {
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

        <main className="container max-w-4xl mx-auto px-4 py-8">
          <Link to="/">
            <Button
              variant="ghost"
              className="mb-8 text-white/70 hover:text-white hover:bg-white/5"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Help Center
              </span>
            </div>

            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Pricing &{" "}
              <span className="bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
                Payout FAQ
              </span>
            </h1>

            <p className="text-white/50 text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Everything you need to know about credits, pricing, and payouts on Lynxx Club.
            </p>
          </div>

          {/* Quick Reference Card */}
          <div className="mb-10 p-6 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10">
            <h3
              className="text-lg font-semibold text-white mb-6 flex items-center gap-2"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Zap className="w-5 h-5 text-amber-400" />
              Quick Reference
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4
                  className="text-sm font-medium text-white/40 mb-4 uppercase tracking-wider"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Interaction Costs
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Text message
                    </span>
                    <span className="text-purple-400 font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      5 credits
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Image unlock
                    </span>
                    <span className="text-purple-400 font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      10 credits
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Video call
                    </span>
                    <span className="text-purple-400 font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      200–900 credits
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4
                  className="text-sm font-medium text-white/40 mb-4 uppercase tracking-wider"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Creator Earnings
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Revenue share
                    </span>
                    <span className="text-amber-400 font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      70%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Minimum payout
                    </span>
                    <span className="text-amber-400 font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      $25
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Payout schedule
                    </span>
                    <span className="text-amber-400 font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Weekly (Fri)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* For Users Section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  For Seekers
                </h2>
                <p className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Credits, pricing, and purchasing
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6">
              <PricingFAQ showTitle={false} />
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-10">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* For Creators Section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  For Earners
                </h2>
                <p className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Earnings, payouts, and withdrawals
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6">
              <CreatorPayoutFAQ showTitle={false} />
            </div>
          </div>

          {/* Need More Help */}
          <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-amber-500/10 border border-white/10 text-center">
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Still have questions?
            </h3>
            <p className="text-white/50 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Our support team is here to help
            </p>
            <Link to="/contact">
              <Button
                className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Contact Support
              </Button>
            </Link>
          </div>
        </main>

        <Footer />
      </div>

      {/* CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
