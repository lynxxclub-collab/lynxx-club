import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Shield,
  AlertTriangle,
  Eye,
  Lock,
  UserX,
  MessageSquareWarning,
  Video,
  MapPin,
  Phone,
  Heart,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const safetyTips = [
  {
    icon: Eye,
    title: "Protect Your Identity",
    color: "purple",
    tips: [
      "Don't share your full name, address, or workplace in early conversations",
      "Use the platform messaging system instead of giving out your personal phone number",
      "Never share financial information, bank details, or social security numbers",
      "Be cautious about sharing photos that reveal your location or daily routine",
    ],
  },
  {
    icon: MessageSquareWarning,
    title: "Recognize Red Flags",
    color: "rose",
    tips: [
      "Requests for money or financial help, especially early on",
      "Refusing to video chat or always having excuses",
      "Pushing to move conversations off-platform quickly",
      "Inconsistent stories or details that don't add up",
      "Love bombing or excessive flattery very early",
      "Pressuring you to share intimate photos or content",
    ],
  },
  {
    icon: Video,
    title: "Video Date Safety",
    color: "amber",
    tips: [
      "Use video dates to verify the person matches their photos",
      "Pay attention to their background - does it seem genuine?",
      "Trust your instincts if something feels off",
      "Never feel pressured to do anything you're uncomfortable with",
      "Report any inappropriate behavior immediately",
    ],
  },
  {
    icon: MapPin,
    title: "Meeting in Person",
    color: "green",
    tips: [
      "Complete multiple video dates before meeting in person",
      "Always meet in a public place with lots of people around",
      "Tell a friend or family member where you're going and when",
      "Arrange your own transportation - don't depend on your date",
      "Keep your phone charged and with you at all times",
      "Have an exit strategy if you feel uncomfortable",
    ],
  },
  {
    icon: Lock,
    title: "Account Security",
    color: "blue",
    tips: [
      "Use a strong, unique password (12+ characters)",
      "Enable two-factor authentication when available",
      "Never share your login credentials with anyone",
      "Log out when using shared or public devices",
      "Regularly review your account activity",
    ],
  },
  {
    icon: Phone,
    title: "If You Feel Unsafe",
    color: "red",
    tips: [
      "Trust your instincts - if something feels wrong, it probably is",
      "End the conversation or date immediately",
      "Block and report the user on the platform",
      "If you're in immediate danger, call 911 or local emergency services",
      "Document any threatening messages or behavior",
    ],
  },
];

const dos = [
  "Verify profiles through video chat before meeting",
  "Keep conversations on the platform initially",
  "Meet in public places for first meetings",
  "Tell someone you trust about your plans",
  "Trust your gut feelings",
  "Report suspicious behavior immediately",
  "Take your time getting to know someone",
];

const donts = [
  "Send money to anyone you've met online",
  "Share personal/financial information too soon",
  "Ignore red flags or warning signs",
  "Feel pressured into anything uncomfortable",
  "Meet privately for the first time",
  "Ignore your instincts if something feels off",
  "Share your home or work address early on",
];

export default function Safety() {
  const { user } = useAuth();

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
      purple: {
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        text: "text-purple-400",
        iconBg: "bg-purple-500/20",
      },
      rose: { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400", iconBg: "bg-rose-500/20" },
      amber: {
        bg: "bg-rose-500/10",
        border: "border-amber-500/20",
        text: "text-amber-400",
        iconBg: "bg-rose-500/20",
      },
      green: {
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        text: "text-green-400",
        iconBg: "bg-green-500/20",
      },
      blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", iconBg: "bg-blue-500/20" },
      red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", iconBg: "bg-red-500/20" },
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-green-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
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

        <div className="container py-12 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20 mb-6">
              <Shield className="w-10 h-10 text-green-400" />
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Your Safety{" "}
              <span className="bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">Matters</span>
            </h1>
            <p className="text-xl text-white/50 max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              At Lynxx Club, we're committed to creating a safe environment. Here are essential tips to protect yourself
              while using our platform.
            </p>
          </div>

          {/* Emergency Banner */}
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-6 mb-12">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-red-400 mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  In Immediate Danger?
                </h2>
                <p className="text-white/60 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  If you or someone you know is in immediate danger, please contact emergency services right away.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    asChild
                    className="bg-red-500 hover:bg-red-400 text-white"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <a href="tel:911">Call 911</a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <a href="https://www.thehotline.org" target="_blank" rel="noopener noreferrer">
                      National Domestic Violence Hotline
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Do's and Don'ts */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="rounded-2xl bg-green-500/5 border border-green-500/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-green-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Do's
                </h2>
              </div>
              <ul className="space-y-3">
                {dos.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-1" />
                    <span className="text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-red-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Don'ts
                </h2>
              </div>
              <ul className="space-y-3">
                {donts.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-1" />
                    <span className="text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Detailed Safety Tips */}
          <div className="space-y-6 mb-12">
            <h2
              className="text-2xl font-bold text-white text-center mb-8"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Safety{" "}
              <span className="bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent">
                Guidelines
              </span>
            </h2>

            {safetyTips.map((section, index) => {
              const colors = getColorClasses(section.color);
              return (
                <div
                  key={index}
                  className={`rounded-2xl bg-white/[0.02] border border-white/10 p-6 hover:${colors.border} transition-all`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
                      <section.icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {section.title}
                    </h3>
                  </div>
                  <ul className="space-y-3 ml-16">
                    {section.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="flex items-start gap-3">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${colors.text.replace("text-", "bg-")} shrink-0 mt-2`}
                        />
                        <span className="text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {tip}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Report Section */}
          <div className="relative mb-12">
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-green-500/20 rounded-3xl blur-xl opacity-50" />
            <div className="relative rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/10 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-6">
                <UserX className="w-8 h-8 text-rose-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                See Something{" "}
                <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
                  Suspicious?
                </span>
              </h2>
              <p className="text-white/50 mb-6 max-w-lg mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                If you encounter any suspicious behavior, harassment, or feel unsafe, please report it immediately. Your
                reports help keep our community safe.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <a href="mailto:support@lynxxclub.com">Report to Safety Team</a>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Link to="/help">Visit Help Center</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Resources */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6">
            <h2
              className="text-xl font-bold text-white mb-6 flex items-center gap-3"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-rose-400" />
              </div>
              Additional Resources
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <a
                href="https://www.thehotline.org"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-rose-500/30 hover:bg-white/[0.04] transition-all"
              >
                <p className="font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  National Domestic Violence Hotline
                </p>
                <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  1-800-799-7233
                </p>
              </a>
              <a
                href="https://www.rainn.org"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-purple-500/30 hover:bg-white/[0.04] transition-all"
              >
                <p className="font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  RAINN
                </p>
                <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  1-800-656-4673
                </p>
              </a>
              <a
                href="https://988lifeline.org"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-green-500/30 hover:bg-white/[0.04] transition-all"
              >
                <p className="font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Suicide & Crisis Lifeline
                </p>
                <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  988
                </p>
              </a>
              <a
                href="https://www.ic3.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-amber-500/30 hover:bg-white/[0.04] transition-all"
              >
                <p className="font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  FBI Internet Crime Complaint Center
                </p>
                <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Report online fraud
                </p>
              </a>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-12 text-center">
            <div
              className="flex flex-wrap justify-center gap-4 text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Link to="/terms" className="text-white/40 hover:text-rose-400 transition-colors">
                Terms of Service
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/privacy" className="text-white/40 hover:text-rose-400 transition-colors">
                Privacy Policy
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/guidelines" className="text-white/40 hover:text-rose-400 transition-colors">
                Community Guidelines
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/help" className="text-white/40 hover:text-rose-400 transition-colors">
                Help Center
              </Link>
            </div>
          </div>
        </div>

        {user && <MobileNav />}
      </div>

    </div>
  );
}
