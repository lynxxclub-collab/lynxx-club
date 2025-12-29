import { Link } from "react-router-dom";
import { ArrowLeft, FileText, CheckCircle2, XCircle, AlertTriangle, Shield, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
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
            <Scale className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Legal Agreement
            </span>
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Terms of{" "}
            <span className="bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent">Service</span>
          </h1>

          <p className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Last Updated: December 27, 2025
          </p>
        </div>

        {/* Table of Contents */}
        <div className="mb-12 p-6 rounded-2xl bg-white/[0.02] border border-white/10">
          <h3 className="text-white font-semibold mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Quick Navigation
          </h3>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            {[
              { num: 1, title: "Agreement to Terms" },
              { num: 2, title: "Eligibility" },
              { num: 3, title: "Account Registration" },
              { num: 4, title: "What Lynxx Club IS and IS NOT" },
              { num: 5, title: "Credits and Payment" },
              { num: 6, title: "Prohibited Conduct" },
              { num: 7, title: "Content and Conduct" },
              { num: 8, title: "Safety and Meeting in Person" },
              { num: 9, title: "Verification and Identity" },
              { num: 10, title: "Intellectual Property" },
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
          {/* 1. Agreement to Terms */}
          <section id="section-1" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <span className="text-purple-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  1
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Agreement to Terms
              </h2>
            </div>
            <div className="space-y-4">
              <p className="text-white/60 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                By accessing or using Lynxx Club ("the Service"), you agree to be bound by these Terms of Service
                ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
              </p>
              <p className="text-white/60 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Lynxx Club is operated by Driven LLC ("we," "us," or "our"). The Service provides a platform where users
                can connect for dating and companionship, with some users ("Seekers") paying credits to initiate
                conversations with other users ("Earners") who receive compensation for their time.
              </p>
            </div>
          </section>

          {/* 2. Eligibility */}
          <section id="section-2" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <span className="text-rose-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  2
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Eligibility
              </h2>
            </div>
            <p className="text-white/60 leading-relaxed mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              You must be at least 18 years old to use this Service. By creating an account, you represent and warrant
              that:
            </p>
            <ul className="space-y-2">
              {[
                "You are at least 18 years of age",
                "You have the legal capacity to enter into these Terms",
                "You are not prohibited by law from using the Service",
                "You have not been previously banned from the Service",
                "You will comply with all applicable laws and regulations",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-white/60"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span className="text-rose-400 mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* 3. Account Registration */}
          <section id="section-3" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <span className="text-amber-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  3
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Account Registration
              </h2>
            </div>
            <p className="text-white/60 leading-relaxed mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              To use the Service, you must create an account and choose whether to register as a Seeker or Earner:
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <h4 className="text-white font-semibold mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Seekers
                </h4>
                <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Users who purchase credits to initiate conversations and book dates
                </p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <h4 className="text-white font-semibold mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Earners
                </h4>
                <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Users who receive payment for responding to messages and participating in dates
                </p>
              </div>
            </div>
            <p className="text-white/60 leading-relaxed mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              You are responsible for:
            </p>
            <ul className="space-y-2">
              {[
                "Maintaining the confidentiality of your account credentials",
                "All activities that occur under your account",
                "Notifying us immediately of any unauthorized use",
                "Providing accurate and complete information",
                "Keeping your account information up to date",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-white/60"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span className="text-amber-400 mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* 4. What Lynxx Club IS and IS NOT */}
          <section id="section-4" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <span className="text-green-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  4
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                What Lynxx Club IS and IS NOT
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="p-5 rounded-xl bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <h3 className="text-green-400 font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Lynxx Club IS:
                  </h3>
                </div>
                <ul className="space-y-2">
                  {[
                    "A dating and social connection platform",
                    "A marketplace for paid conversations and companionship",
                    "A service where Earners are compensated for their time",
                    "A platform for virtual video dates and public meetings",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-white/60 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <h3 className="text-red-400 font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Lynxx Club IS NOT:
                  </h3>
                </div>
                <ul className="space-y-2">
                  {[
                    "An escort service or platform for sexual services",
                    "A marketplace for illegal activities",
                    "A guarantee of any particular outcome",
                    "Responsible for off-platform agreements",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-white/60 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 font-medium text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                ⚠️ IMPORTANT: Any solicitation or arrangement for sexual services is strictly prohibited and will result
                in immediate account termination and potential legal action.
              </p>
            </div>
          </section>

          {/* 5. Credits and Payment */}
          <section id="section-5" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  5
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Credits and Payment
              </h2>
            </div>

            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  5.1 Credit System
                </h3>
                <p className="text-white/60 leading-relaxed mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Credits are a platform token used for all interactions on Lynxx Club.
                </p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 rounded-lg bg-white/[0.02]">
                    <div className="text-purple-400 font-bold text-xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      5
                    </div>
                    <div className="text-white/50 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Text message
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/[0.02]">
                    <div className="text-purple-400 font-bold text-xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      10
                    </div>
                    <div className="text-white/50 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Image unlock
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/[0.02]">
                    <div className="text-purple-400 font-bold text-xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      200-900
                    </div>
                    <div className="text-white/50 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Video dates
                    </div>
                  </div>
                </div>
                <ul className="space-y-2">
                  {[
                    "Credits are non-refundable once purchased",
                    "Credits do not expire but may be forfeited if account is terminated",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-white/50 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <span className="text-blue-400 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  5.2 Earner Compensation
                </h3>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-amber-400 font-bold text-2xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      70%
                    </span>
                    <span className="text-white/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Earner receives
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/10">
                    <span className="text-white/40 font-bold text-2xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      30%
                    </span>
                    <span className="text-white/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Platform fee
                    </span>
                  </div>
                </div>
                <ul className="space-y-2">
                  {[
                    "48-hour processing period for security",
                    "Minimum payout: $25.00",
                    "Payouts sent weekly, every Friday",
                    "Bank account via Stripe Connect",
                    "Earners responsible for taxes",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-white/50 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <span className="text-amber-400 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 6. Prohibited Conduct */}
          <section id="section-6" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  6
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Prohibited Conduct
              </h2>
            </div>
            <p className="text-white/60 leading-relaxed mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              You agree NOT to:
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                "Solicit or arrange sexual services",
                "Harass, threaten, or abuse other users",
                "Share explicit content without consent",
                "Impersonate another person",
                "Use the Service if under 18",
                "Share contact info to avoid fees",
                "Manipulate credit or earnings system",
                "Create multiple accounts for fraud",
                "Use automated tools or bots",
                "Reverse engineer the platform",
                "Engage in any illegal activity",
                "Spam or send unsolicited messages",
                "Upload viruses or malware",
                "Violate intellectual property rights",
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-white/60 text-sm"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* 7. Content and Conduct */}
          <section id="section-7" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-teal-400" />
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Content and Conduct
              </h2>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  7.1 User Content
                </h3>
                <p className="text-white/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  You retain ownership of content you post ("User Content"), but grant us a worldwide, non-exclusive,
                  royalty-free license to use, display, and distribute your content in connection with the Service.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  7.2 Content Standards
                </h3>
                <p className="text-white/60 mb-3 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  All User Content must:
                </p>
                <ul className="space-y-2">
                  {[
                    "Be accurate and not misleading",
                    "Not violate any laws or regulations",
                    "Not infringe on third-party rights",
                    "Not contain explicit sexual content",
                    "Not promote violence, hate speech, or discrimination",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-white/50 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 8. Safety and Meeting in Person */}
          <section id="section-8" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Safety and Meeting in Person
              </h2>
            </div>

            <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
              <p className="text-amber-300 font-medium mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                ⚠️ Your safety is your responsibility. We strongly recommend:
              </p>
              <ul className="space-y-2">
                {[
                  "Always meet in public places for first meetings",
                  "Tell a friend or family member where you're going",
                  "Use the platform's check-in features during dates",
                  "Never send money to other users outside the platform",
                  "Report suspicious behavior immediately",
                  "Trust your instincts - if something feels wrong, leave",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-white/60 text-sm"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="text-amber-400 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-white/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Lynxx Club is not responsible for any physical meetings between users or any harm that may occur. You
              assume all risks associated with in-person meetings.
            </p>
          </section>

          {/* 9. Verification */}
          <section id="section-9" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  9
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Verification and Identity
              </h2>
            </div>
            <p className="text-white/60 leading-relaxed mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Verification badges indicate that a user has completed our verification process, but do not guarantee:
            </p>
            <ul className="space-y-2 mb-4">
              {[
                "The safety or character of the user",
                "The accuracy of all profile information",
                "That the user will behave appropriately",
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
            <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Verification is not an endorsement. You are responsible for your own safety and due diligence.
            </p>
          </section>

          {/* 10. Intellectual Property */}
          <section id="section-10" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <span className="text-purple-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  10
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Intellectual Property
              </h2>
            </div>
            <p className="text-white/60 leading-relaxed mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              The Service, including its design, features, text, graphics, logos, and software, is owned by Driven LLC
              and protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              You may not copy, modify, distribute, sell, or lease any part of the Service without our written
              permission.
            </p>
          </section>

          {/* 11-19: Additional sections in simplified format */}
          {[
            {
              num: 11,
              title: "Disclaimer of Warranties",
              content:
                'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. We do not warrant that the Service will be uninterrupted, error-free, or meet your expectations.',
            },
            {
              num: 12,
              title: "Limitation of Liability",
              content:
                "TO THE MAXIMUM EXTENT PERMITTED BY LAW, LYNXX CLUB SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. Our total liability shall not exceed the amount you paid us in the 12 months prior to the claim, or $100, whichever is greater.",
            },
            {
              num: 13,
              title: "Indemnification",
              content:
                "You agree to indemnify and hold harmless Lynxx Club from any claims, damages, losses, liabilities, and expenses arising from your use of the Service, violation of these Terms, or interactions with other users.",
            },
            {
              num: 14,
              title: "Termination",
              content:
                "You may delete your account at any time. Upon deletion, unused credits are forfeited. We may suspend or terminate your account for Terms violations, fraudulent activity, or safety concerns.",
            },
            {
              num: 15,
              title: "Dispute Resolution",
              content:
                "Before filing a claim, contact legal@lynxxclub.com to attempt informal resolution. Disputes shall be resolved through binding arbitration. You waive your right to a jury trial and class action.",
            },
            {
              num: 16,
              title: "Governing Law",
              content:
                "These Terms shall be governed by the laws of the State of Michigan, without regard to conflict of law provisions.",
            },
            {
              num: 17,
              title: "Changes to Terms",
              content:
                "We may modify these Terms at any time. Changes are effective immediately upon posting. Continued use constitutes acceptance. We will notify you of material changes via email.",
            },
          ].map((section) => (
            <section key={section.num} className="scroll-mt-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <span className="text-white/50 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {section.num}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {section.title}
                </h2>
              </div>
              <p className="text-white/60 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {section.content}
              </p>
            </section>
          ))}

          {/* Contact */}
          <section className="p-6 rounded-2xl bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-amber-500/10 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Contact Information
            </h2>
            <p className="text-white/60 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              For questions about these Terms:
            </p>
            <div className="space-y-2 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <p className="text-white/80">📧 legal@lynxxclub.com</p>
              <p className="text-white/80">📍 Michigan</p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
            <p className="text-white font-semibold mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              BY CREATING AN ACCOUNT, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE
              TERMS OF SERVICE.
            </p>
            <p className="text-sm text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Last updated: December 27, 2025
            </p>
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

export default Terms;
