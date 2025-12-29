import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Eye, Lock, Database, Globe, Trash2, Bell, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
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

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-12">
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
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Your Privacy Matters
            </span>
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Privacy{" "}
            <span className="bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent">Policy</span>
          </h1>

          <p className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Last Updated: December 27, 2025
          </p>
        </div>

        {/* Quick Summary Card */}
        <div className="mb-12 p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
          <h2
            className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <Lock className="w-5 h-5" />
            What We Do NOT Do
          </h2>
          <ul
            className="grid md:grid-cols-2 gap-3 text-white/70 text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              We do NOT sell your personal data
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              We do NOT record video dates
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              We do NOT share financial info with users
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              We do NOT track your real-time location
            </li>
          </ul>
        </div>

        {/* Table of Contents */}
        <div className="mb-12 p-6 rounded-2xl bg-white/[0.02] border border-white/10">
          <h3 className="text-white font-semibold mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Quick Navigation
          </h3>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            {[
              { num: 1, title: "Introduction" },
              { num: 2, title: "Information We Collect" },
              { num: 3, title: "How We Use Your Information" },
              { num: 4, title: "Legal Basis (GDPR)" },
              { num: 5, title: "How We Share Information" },
              { num: 6, title: "Data Retention" },
              { num: 7, title: "Data Security" },
              { num: 8, title: "Your Privacy Rights" },
              { num: 9, title: "Cookies" },
              { num: 10, title: "Children's Privacy" },
            ].map((item) => (
              <a
                key={item.num}
                href={`#section-${item.num}`}
                className="text-white/50 hover:text-rose-400 transition-colors py-1"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {item.num}. {item.title}
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-12">
          {/* Section 1 */}
          <section id="section-1" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <span className="text-purple-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  1
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Introduction
              </h2>
            </div>
            <div className="pl-13 space-y-4">
              <p className="text-white/60 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Lynxx Club ("we," "us," or "our") respects your privacy and is committed to protecting your personal
                data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when
                you use our Service.
              </p>
              <p className="text-white/60 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                By using Lynxx Club, you consent to the data practices described in this policy.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="section-2" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-rose-400" />
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Information We Collect
              </h2>
            </div>

            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  2.1 Information You Provide
                </h3>
                <ul className="space-y-2 text-white/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <li>
                    <strong className="text-white/80">Account Information:</strong> Email, name, date of birth, gender,
                    location
                  </li>
                  <li>
                    <strong className="text-white/80">Profile Information:</strong> Photos, bio, preferences, rates (for
                    Earners)
                  </li>
                  <li>
                    <strong className="text-white/80">Payment Information:</strong> Credit card details (processed by
                    Stripe), bank account info for payouts
                  </li>
                  <li>
                    <strong className="text-white/80">Communications:</strong> Messages, conversation history, ratings,
                    reviews
                  </li>
                  <li>
                    <strong className="text-white/80">Verification Data:</strong> ID documents, selfies for verification
                  </li>
                  <li>
                    <strong className="text-white/80">Video Date Content:</strong> Recordings are NOT stored; metadata
                    (duration, participants) is retained
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  2.2 Information Collected Automatically
                </h3>
                <ul className="space-y-2 text-white/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <li>
                    <strong className="text-white/80">Device Information:</strong> IP address, browser type, operating
                    system, device ID
                  </li>
                  <li>
                    <strong className="text-white/80">Usage Data:</strong> Pages viewed, features used, time spent,
                    clicks
                  </li>
                  <li>
                    <strong className="text-white/80">Location Data:</strong> Approximate location based on IP address
                  </li>
                  <li>
                    <strong className="text-white/80">Cookies:</strong> Session cookies, preference cookies, analytics
                    cookies
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  2.3 Information from Third Parties
                </h3>
                <ul className="space-y-2 text-white/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <li>
                    <strong className="text-white/80">Social Media:</strong> If you sign up via Google, we receive your
                    name, email, and profile picture
                  </li>
                  <li>
                    <strong className="text-white/80">Payment Processors:</strong> Transaction status and payment method
                    details from Stripe
                  </li>
                  <li>
                    <strong className="text-white/80">Identity Verification:</strong> Verification results from
                    third-party services
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section id="section-3" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                How We Use Your Information
              </h2>
            </div>
            <p className="text-white/60 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              We use your information to:
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                "Provide and maintain the Service",
                "Process payments and payouts",
                "Verify your identity and prevent fraud",
                "Enable communication between users",
                "Personalize your experience",
                "Send notifications about your account",
                "Improve the Service and develop features",
                "Analyze usage patterns and trends",
                "Comply with legal obligations",
                "Enforce our Terms of Service",
                "Resolve disputes and provide support",
                "Send marketing (with consent)",
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-white/60 text-sm"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span className="text-amber-400 mt-0.5">•</span>
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* Section 4 */}
          <section id="section-4" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Legal Basis for Processing (GDPR)
              </h2>
            </div>
            <p className="text-white/60 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              If you are in the European Economic Area (EEA), we process your data based on:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: "Contract", desc: "To provide the Service you've agreed to use" },
                { title: "Legitimate Interests", desc: "To improve the Service, prevent fraud, ensure security" },
                { title: "Consent", desc: "For marketing communications and optional features" },
                { title: "Legal Obligation", desc: "To comply with laws and regulations" },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                  <h4 className="text-white font-semibold mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {item.title}
                  </h4>
                  <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5 */}
          <section id="section-5" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <span className="text-teal-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  5
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                How We Share Your Information
              </h2>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  With Other Users
                </h3>
                <p className="text-white/60 text-sm mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Certain information is visible to other users:
                </p>
                <ul className="space-y-1 text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <li>• Profile information (photos, bio, age, location)</li>
                  <li>• Ratings and reviews</li>
                  <li>• Messages (only to recipient)</li>
                  <li>• Online status</li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  With Service Providers
                </h3>
                <div
                  className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {[
                    { name: "Stripe", use: "Payments" },
                    { name: "Supabase", use: "Database" },
                    { name: "Daily.co", use: "Video calls" },
                    { name: "Vercel", use: "Hosting" },
                    { name: "Resend", use: "Email" },
                    { name: "Sentry", use: "Error tracking" },
                  ].map((provider, i) => (
                    <div key={i} className="text-white/60">
                      <span className="text-white/80">{provider.name}:</span> {provider.use}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  For Legal Reasons
                </h3>
                <p className="text-white/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  We may disclose information to comply with legal process, enforce Terms of Service, protect rights and
                  safety, investigate fraud, or respond to government requests.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section id="section-6" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Data Retention
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { period: "Active accounts", retention: "While account is active" },
                { period: "Paused accounts", retention: "2 years, then deleted" },
                { period: "Deleted accounts", retention: "30 days (most data)" },
                { period: "Messages", retention: "2 years from last message" },
                { period: "Transactions", retention: "7 years (legal requirement)" },
                { period: "Verification data", retention: "1 year after verification" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 rounded-lg bg-white/[0.02] border border-white/10"
                >
                  <span className="text-white/80 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {item.period}
                  </span>
                  <span className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {item.retention}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 7 */}
          <section id="section-7" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Data Security
              </h2>
            </div>
            <p className="text-white/60 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              We implement industry-standard security measures:
            </p>
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              {[
                "Encryption in transit (TLS/SSL) and at rest",
                "Secure database with row-level security",
                "Regular security audits",
                "Access controls and authentication",
                "Monitoring of suspicious activity",
                "Employee training on data protection",
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-white/60 text-sm"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span className="text-green-400 mt-0.5">✓</span>
                  {item}
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-300 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                ⚠️ No system is 100% secure. You are responsible for maintaining the confidentiality of your password.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section id="section-8" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <span className="text-pink-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  8
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Your Privacy Rights
              </h2>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  All Users
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { right: "Access", desc: "Request a copy of your data" },
                    { right: "Correction", desc: "Update inaccurate info" },
                    { right: "Deletion", desc: "Delete your account and data" },
                    { right: "Opt-out", desc: "Unsubscribe from marketing" },
                    { right: "Portability", desc: "Download your data" },
                  ].map((item, i) => (
                    <div key={i} className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      <span className="text-white/80 font-medium">{item.right}:</span>
                      <span className="text-white/50 ml-1">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <h3
                  className="text-lg font-semibold text-purple-300 mb-3"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  How to Exercise Your Rights
                </h3>
                <p className="text-white/60 text-sm mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Email <strong className="text-white">privacy@lynxxclub.com</strong> with:
                </p>
                <ul className="space-y-1 text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <li>• Subject: "Privacy Rights Request"</li>
                  <li>• Your name and account email</li>
                  <li>• Description of your request</li>
                </ul>
                <p className="text-white/60 text-sm mt-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  We will respond within 30 days.
                </p>
              </div>
            </div>
          </section>

          {/* Section 9 */}
          <section id="section-9" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Cookies and Tracking
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { type: "Essential", desc: "Required for login and security", color: "green" },
                { type: "Functional", desc: "Remember your preferences", color: "blue" },
                { type: "Analytics", desc: "Understand how you use the Service", color: "purple" },
                { type: "Advertising", desc: "Show relevant ads (if applicable)", color: "amber" },
              ].map((cookie, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl bg-${cookie.color}-500/10 border border-${cookie.color}-500/20`}
                >
                  <h4 className="text-white font-semibold mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {cookie.type}
                  </h4>
                  <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {cookie.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 10 */}
          <section id="section-10" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  18+
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Children's Privacy
              </h2>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
              <p className="text-red-300 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                ⚠️ Lynxx Club is NOT intended for users under 18 years of age.
              </p>
            </div>
            <p className="text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              We do not knowingly collect personal information from anyone under 18. If we discover a minor has created
              an account, we will immediately terminate it and delete all data. Report concerns to{" "}
              <strong className="text-white">support@lynxxclub.com</strong>.
            </p>
          </section>

          {/* Contact */}
          <section className="p-6 rounded-2xl bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-amber-500/10 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-6 h-6 text-rose-400" />
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Contact Us
              </h2>
            </div>
            <p className="text-white/60 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              For questions about this Privacy Policy:
            </p>
            <div className="space-y-2 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <p className="text-white/80">📧 privacy@lynxxclub.com</p>
              <p className="text-white/80">📍 Michigan</p>
            </div>
          </section>
        </div>
      </div>

      {/* CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default Privacy;
