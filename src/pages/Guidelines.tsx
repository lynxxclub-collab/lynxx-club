import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Shield,
  XCircle,
  Camera,
  MessageSquare,
  Gem,
  Wallet,
  AlertTriangle,
  Scale,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Guidelines = () => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-rose-900/10 via-transparent to-transparent" />
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

      <div className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
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
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Community Standards
              </span>
            </div>

            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Community{" "}
              <span className="bg-gradient-to-r from-purple-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
                Guidelines
              </span>
            </h1>

            <p className="text-lg text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Lynxx Club is built on respect, safety, and genuine connections. These guidelines help create a positive
              environment for everyone.
            </p>
          </div>

          <div className="space-y-6">
            {/* Be Respectful */}
            <section className="rounded-2xl bg-green-500/5 border border-green-500/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-green-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Be Respectful
                </h2>
              </div>
              <ul className="space-y-2">
                {[
                  "Treat all users with kindness and respect",
                  'Accept "no" gracefully - respect boundaries',
                  "Be patient with response times",
                  "Use appropriate language",
                  "Be honest in your profile and conversations",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-white/60"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="text-green-400 mt-1">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* Stay Safe */}
            <section className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-blue-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Stay Safe
                </h2>
              </div>
              <ul className="space-y-2">
                {[
                  "Keep conversations on the platform initially",
                  "Meet in public places for first meetings",
                  "Tell someone where you're going",
                  "Never send money to other users",
                  "Trust your instincts - report suspicious behavior",
                  "Use the check-in feature for in-person dates",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-white/60"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="text-blue-400 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* Prohibited Behavior */}
            <section className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-red-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Prohibited Behavior
                </h2>
              </div>
              <p className="text-white font-semibold mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                The following will result in immediate account termination:
              </p>
              <ul className="space-y-2">
                {[
                  "Soliciting sexual services or escort services",
                  "Harassment, threats, or abuse",
                  "Sharing explicit sexual content without consent",
                  "Impersonation or catfishing",
                  "Discrimination based on race, gender, religion, etc.",
                  "Spamming or soliciting for commercial purposes",
                  "Attempting to circumvent platform fees",
                  "Creating multiple accounts to defraud",
                  "Sharing personal contact info to avoid platform fees",
                  "Any illegal activity",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-white/60"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* Profile Guidelines */}
            <section className="rounded-2xl bg-purple-500/5 border border-purple-500/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-purple-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Profile Guidelines
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-white font-semibold mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Your profile should:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Use recent, accurate photos of you",
                      "Show your face clearly in at least one photo",
                      "Be appropriate (no nudity or sexual content)",
                      "Represent who you really are",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-white/60"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <span className="text-purple-400 mt-1">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-white font-semibold mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Do NOT:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Use photos of celebrities or other people",
                      "Use heavily filtered or misleading photos",
                      "Include minors in your photos",
                      "Display weapons, drugs, or illegal items",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-white/60"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <span className="text-red-400 mt-1">✗</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Messaging Guidelines */}
            <section className="rounded-2xl bg-teal-500/5 border border-teal-500/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-teal-400" />
                </div>
                <h2 className="text-2xl font-bold text-teal-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Messaging Guidelines
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-white font-semibold mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Good practices:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Be genuine and engaged",
                      "Ask questions and show interest",
                      "Respond in a reasonable timeframe",
                      "Keep the conversation light initially",
                      "Respect if someone doesn't want to continue",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-white/60"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <span className="text-teal-400 mt-1">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-white font-semibold mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Do NOT:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Send unsolicited explicit messages",
                      "Pressure someone for personal info",
                      "Copy-paste generic messages",
                      "Share links to external sites",
                      "Request contact info to avoid fees",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-white/60"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <span className="text-red-400 mt-1">✗</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* For Seekers & Earners */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* For Seekers */}
              <section className="rounded-2xl bg-purple-500/5 border border-purple-500/20 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Gem className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-purple-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    For Seekers
                  </h2>
                </div>
                <ul className="space-y-2 text-sm">
                  {[
                    "Earners provide time and attention",
                    "Be respectful - payment doesn't entitle disrespect",
                    "Expect conversation and companionship only",
                    "Leave honest ratings",
                    "Report any violations",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-white/60"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <span className="text-purple-400 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              {/* For Earners */}
              <section className="rounded-2xl bg-rose-500/5 border border-amber-500/20 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-amber-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    For Earners
                  </h2>
                </div>
                <ul className="space-y-2 text-sm">
                  {[
                    "Be responsive and engaged",
                    "Set clear boundaries and stick to them",
                    "Decline uncomfortable interactions",
                    "Report inappropriate requests",
                    "Payouts: Fridays, $25 minimum, 48hr hold",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-white/60"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <span className="text-amber-400 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Pricing */}
            <section className="rounded-2xl bg-white/[0.02] border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
                  <Gem className="w-6 h-6 text-rose-400" />
                </div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Pricing & Credits
                </h2>
              </div>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                {[
                  { label: "Text message", value: "5 credits" },
                  { label: "Image unlock", value: "10 credits" },
                  { label: "Video date", value: "200-900 credits" },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                    <p className="text-white/50 text-sm mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {item.label}
                    </p>
                    <p className="text-white font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Earners receive 70% of all credits spent.{" "}
                <Link to="/faq/pricing" className="text-rose-400 hover:text-rose-300 transition-colors">
                  See full Pricing FAQ →
                </Link>
              </p>
            </section>

            {/* Reporting */}
            <section className="rounded-2xl bg-rose-500/10 border border-amber-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-amber-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Reporting Violations
                </h2>
              </div>
              <p className="text-white font-semibold mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                If you experience or witness a violation:
              </p>
              <ul className="space-y-2 mb-4">
                {[
                  'Use the "Report" button on profiles or in messages',
                  "Provide specific details about the violation",
                  "Include screenshots if possible",
                  "For safety emergencies, contact local authorities first",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-white/60"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="text-amber-400 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                We review all reports within 24 hours. False reports may result in action against your account.
              </p>
            </section>

            {/* Consequences */}
            <section className="rounded-2xl bg-white/[0.02] border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Scale className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-red-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Consequences
                </h2>
              </div>
              <p className="text-white mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Violations may result in:
              </p>
              <div className="grid md:grid-cols-4 gap-3 mb-4">
                {[
                  { level: "Warning", desc: "First minor violation", color: "amber" },
                  { level: "Suspension", desc: "7-30 days", color: "orange" },
                  { level: "Permanent Ban", desc: "Serious violations", color: "red" },
                  { level: "Legal Action", desc: "Illegal activity", color: "red" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/20 text-center`}
                  >
                    <p
                      className={`text-${item.color}-400 font-bold text-sm`}
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {item.level}
                    </p>
                    <p className="text-white/50 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Decisions are at our sole discretion. Banned users forfeit all credits and pending earnings.
              </p>
            </section>

            {/* Remember */}
            <section className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 via-rose-500/20 to-amber-500/20 rounded-3xl blur-xl opacity-50" />
              <div className="relative rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/10 p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-rose-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Remember
                </h2>
                <p className="text-white/60 max-w-xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Lynxx Club works best when everyone follows these guidelines. Be kind, be safe, and be yourself.
                  Together, we create a community where genuine connections can flourish.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default Guidelines;
