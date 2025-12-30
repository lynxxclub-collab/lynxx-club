import { Link } from "react-router-dom";
import { ArrowLeft, Cookie, Lock, Settings, BarChart3, Megaphone, Globe, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const Cookies = () => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-amber-500/20 mb-6">
              <Cookie className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Cookie Policy
              </span>
            </div>

            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Cookie{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Policy
              </span>
            </h1>

            <p className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Last Updated: December 24, 2025
            </p>
          </div>

          <div className="space-y-10">
            {/* What Are Cookies */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                  <span className="text-amber-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    1
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  What Are Cookies?
                </h2>
              </div>
              <p className="text-white/60 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Cookies are small text files stored on your device when you visit our website. They help us provide a
                better user experience by remembering your preferences and analyzing how you use our Service.
              </p>
            </section>

            {/* Types of Cookies */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <span className="text-purple-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    2
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Types of Cookies We Use
                </h2>
              </div>

              <div className="space-y-4">
                {/* Essential Cookies */}
                <div className="rounded-2xl bg-green-500/5 border border-green-500/20 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Essential Cookies
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs font-medium">
                      Required
                    </span>
                  </div>
                  <p className="text-white/50 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    These cookies are necessary for the Service to function:
                  </p>
                  <ul className="space-y-2 mb-4">
                    {[
                      "Authentication cookies (keep you logged in)",
                      "Security cookies (prevent fraud)",
                      "Session cookies (maintain your session)",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-white/60"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <span className="text-green-400 mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-green-400 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Cannot be disabled.
                  </p>
                </div>

                {/* Functional Cookies */}
                <div className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Functional Cookies
                    </h3>
                  </div>
                  <p className="text-white/50 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    These cookies remember your preferences:
                  </p>
                  <ul className="space-y-2 mb-4">
                    {["Language preference", "Theme settings (dark/light mode)", "Notification preferences"].map(
                      (item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-white/60"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          <span className="text-blue-400 mt-1">•</span>
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                  <p className="text-sm text-white/40 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Can be disabled, but may affect user experience.
                  </p>
                </div>

                {/* Analytics Cookies */}
                <div className="rounded-2xl bg-purple-500/5 border border-purple-500/20 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Analytics Cookies
                    </h3>
                  </div>
                  <p className="text-white/50 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    These cookies help us understand how you use the Service:
                  </p>
                  <ul className="space-y-2 mb-4">
                    {[
                      "Google Analytics (page views, interactions)",
                      "Error tracking (Sentry)",
                      "Performance monitoring",
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
                  <p className="text-sm text-white/40 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Can be disabled in settings.
                  </p>
                </div>

                {/* Advertising Cookies */}
                <div className="rounded-2xl bg-rose-500/5 border border-amber-500/20 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Advertising Cookies
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-amber-300 text-xs font-medium">
                      If Applicable
                    </span>
                  </div>
                  <p className="text-white/50 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    These cookies may be used to show relevant ads:
                  </p>
                  <ul className="space-y-2 mb-4">
                    {["Retargeting pixels", "Ad performance tracking"].map((item, i) => (
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
                  <p className="text-sm text-white/40 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Can be disabled in settings.
                  </p>
                </div>
              </div>
            </section>

            {/* Third-Party Cookies */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-rose-400" />
                </div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Third-Party Cookies
                </h2>
              </div>
              <p className="text-white/60 leading-relaxed mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                We use cookies from trusted third-party services:
              </p>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                {[
                  { name: "Google Analytics", desc: "Usage statistics" },
                  { name: "Stripe", desc: "Payment processing" },
                  { name: "Daily.co", desc: "Video calling" },
                ].map((service, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <p className="text-white font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {service.name}
                    </p>
                    <p className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {service.desc}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                These third parties have their own cookie policies, which we encourage you to review.
              </p>
            </section>

            {/* Managing Cookies */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <span className="text-teal-400 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    4
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Managing Cookies
                </h2>
              </div>
              <p className="text-white/60 leading-relaxed mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                You can control cookies through:
              </p>

              <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 mb-4">
                <h3 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Browser Settings
                </h3>
                <ul className="space-y-2">
                  {[
                    { browser: "Chrome", path: "Settings → Privacy and security → Cookies" },
                    { browser: "Firefox", path: "Settings → Privacy & Security → Cookies" },
                    { browser: "Safari", path: "Preferences → Privacy → Cookies" },
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-white/60"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <span className="text-teal-400 mt-1">•</span>
                      <span>
                        <strong className="text-white">{item.browser}:</strong> {item.path}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Our Cookie Banner
                </h3>
                <p className="text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  When you first visit Lynxx Club, you'll see a cookie consent banner where you can accept or customize
                  your cookie preferences.
                </p>
              </div>
            </section>

            {/* Do Not Track */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white/50" />
                </div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Do Not Track
                </h2>
              </div>
              <p className="text-white/60 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Some browsers have a "Do Not Track" feature. We currently do not respond to Do Not Track signals, but
                you can control cookies through your browser settings.
              </p>
            </section>

            {/* Contact */}
            <section className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-rose-500/10 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Questions About Cookies?
              </h2>
              <p className="text-white/60 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Contact us at:
              </p>
              <p className="text-white/80" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                📧 privacy@lynxxclub.com
              </p>
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

export default Cookies;
