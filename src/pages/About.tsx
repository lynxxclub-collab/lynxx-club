import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Shield,
  Users,
  Video,
  MessageSquare,
  CreditCard,
  Star,
  CheckCircle2,
  ArrowRight,
  Rocket,
  Zap,
  MessageCircle,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Video Dates",
    description: "Connect face-to-face through secure, private video calls before meeting in person.",
    color: "rose",
  },
  {
    icon: MessageSquare,
    title: "Meaningful Messaging",
    description: "Quality over quantity. Our credit system encourages thoughtful, genuine conversations.",
    color: "purple",
  },
  {
    icon: Shield,
    title: "Verified Profiles",
    description: "ID verification and photo confirmation help ensure you're talking to real people.",
    color: "green",
  },
  {
    icon: CreditCard,
    title: "Fair Compensation",
    description: "Earners receive 70% of all credits spent, valuing their time and attention.",
    color: "amber",
  },
];

const values = [
  {
    title: "Authenticity",
    description:
      "We believe in real connections between real people. No bots, no catfishing, just genuine interactions.",
  },
  {
    title: "Safety First",
    description: "Your security is our priority. From verified profiles to 24/7 moderation, we've got you covered.",
  },
  {
    title: "Respect & Equality",
    description: "Every user deserves respect. We maintain strict community guidelines to ensure positive experiences.",
  },
  {
    title: "Transparency",
    description: "Clear pricing, honest communication, and no hidden fees. What you see is what you get.",
  },
];

export default function About() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-rose-900/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-2/3 left-1/3 w-64 h-64 bg-rose-500/5 rounded-full blur-[100px]" />
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

        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Redefining Online Dating
                </span>
              </div>
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Where Real Connections{" "}
                <span className="bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                  Begin
                </span>
              </h1>
              <p
                className="text-xl text-white/50 mb-10 leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Lynxx Club is a premium dating platform that values quality over quantity. We connect Seekers looking
                for meaningful relationships with Earners who deserve compensation for their time and attention.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  asChild
                  className="h-14 px-8 bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500 hover:from-rose-400 hover:via-purple-400 hover:to-rose-400 text-white font-semibold rounded-xl shadow-lg shadow-rose-500/20 bg-[length:200%_100%] hover:bg-right transition-all duration-300"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Link to="/auth">
                    Get Started <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-14 px-8 border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Link to="/help">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Early Access */}
        <section className="py-16">
          <div className="container">
            <div className="relative rounded-3xl overflow-hidden">
              {/* Card glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-50" />

              <div className="relative bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-12">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-amber-500/20 mb-6">
                    <Rocket className="w-4 h-4 text-amber-400" />
                    <span
                      className="text-sm font-medium text-amber-200"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Launch Week
                    </span>
                  </div>
                  <h2
                    className="text-3xl md:text-4xl font-bold text-white mb-4"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Join Our{" "}
                    <span className="bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
                      Launch
                    </span>
                  </h2>
                  <p className="text-white/50 max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Lynxx Club is brand new and growing fast. Be part of our founding community and help shape the
                    future of dating.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center hover:border-amber-500/30 transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-7 h-7 text-amber-400" />
                    </div>
                    <h3 className="font-bold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Early Adopter Benefits
                    </h3>
                    <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      First 100 Seekers get 100 bonus credits. First 50 Earners get featured placement.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center hover:border-purple-500/30 transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-7 h-7 text-purple-400" />
                    </div>
                    <h3 className="font-bold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Shape the Product
                    </h3>
                    <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Your feedback directly influences features. We're building this together.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center hover:border-rose-500/30 transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                      <Star className="w-7 h-7 text-rose-400" />
                    </div>
                    <h3 className="font-bold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Less Competition
                    </h3>
                    <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Join early and stand out while the community is small and engaged.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-12">
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                How Lynxx Club{" "}
                <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
                  Works
                </span>
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                A unique approach to online dating that respects everyone's time and creates genuine opportunities for
                connection.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* For Seekers */}
              <div className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 p-8 hover:border-purple-500/40 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6">
                  <Heart className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                  For Seekers
                </h3>
                <p className="text-white/50 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Purchase credits to initiate conversations and book video dates with verified, quality members.
                </p>
                <ul className="space-y-3">
                  {[
                    "Browse verified profiles",
                    "Send thoughtful messages",
                    "Book private video dates",
                    "Rate and review experiences",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 text-white/70"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* For Earners */}
              <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-8 hover:border-amber-500/40 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center mb-6">
                  <Star className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                  For Earners
                </h3>
                <p className="text-white/50 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Get paid for your time and attention while meeting interesting people on your own terms.
                </p>
                <ul className="space-y-3">
                  {[
                    "Earn 70% of all credits spent",
                    "Set your own video rates",
                    "Control your availability",
                    "Earnings paid out weekly",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 text-white/70"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-12">
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Why Choose{" "}
                <span className="bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                  Lynxx Club
                </span>
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                We've built a platform that prioritizes safety, authenticity, and meaningful connections.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => {
                const colorClasses = {
                  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:border-rose-500/40",
                  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:border-purple-500/40",
                  green: "bg-green-500/10 text-green-400 border-green-500/20 hover:border-green-500/40",
                  amber: "bg-rose-500/10 text-amber-400 border-amber-500/20 hover:border-amber-500/40",
                };
                const classes = colorClasses[feature.color as keyof typeof colorClasses];

                return (
                  <div
                    key={index}
                    className={`rounded-2xl bg-white/[0.02] border p-6 text-center transition-all ${classes.split(" ").slice(2).join(" ")}`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${classes.split(" ").slice(0, 1).join(" ")}`}
                    >
                      <feature.icon className={`w-7 h-7 ${classes.split(" ").slice(1, 2).join(" ")}`} />
                    </div>
                    <h3 className="font-semibold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {feature.title}
                    </h3>
                    <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-12">
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Our{" "}
                <span className="bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent">
                  Values
                </span>
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                The principles that guide everything we do at Lynxx Club.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 hover:border-white/20 transition-all"
                >
                  <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {value.title}
                  </h3>
                  <p className="text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Company Info */}
        <section className="py-20">
          <div className="container max-w-3xl">
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                About the{" "}
                <span className="bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">
                  Company
                </span>
              </h2>
            </div>

            <div className="text-center space-y-6">
              <p className="text-white/50 text-lg leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Lynxx Club is operated by Driven LLC, based in Michigan. Launched December 2025, we set out to create a
                dating platform that addresses the frustrations of traditional apps—low-quality matches, endless
                swiping, and one-sided conversations.
              </p>
              <p className="text-white/50 text-lg leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Our unique model ensures that every interaction is meaningful. Seekers invest in connections they
                genuinely want to pursue, while Earners are fairly compensated for the time and energy they put into
                building relationships.
              </p>
              <p className="text-white/50 text-lg leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                We're committed to fostering a safe, respectful community where real connections can flourish. Every
                feature we build is designed with this mission in mind.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container">
            <div className="relative max-w-4xl mx-auto">
              {/* Card glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-amber-500/20 rounded-[32px] blur-xl opacity-50" />

              <div className="relative rounded-3xl bg-white/[0.03] backdrop-blur-sm border border-white/10 p-8 md:p-12 text-center">
                <h2
                  className="text-3xl md:text-4xl font-bold text-white mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Ready to Find Your{" "}
                  <span className="bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                    Connection?
                  </span>
                </h2>
                <p className="text-white/50 mb-8 max-w-lg mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Join a growing community experiencing a more intentional way to connect online.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    asChild
                    className="h-14 px-8 bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500 hover:from-rose-400 hover:via-purple-400 hover:to-rose-400 text-white font-semibold rounded-xl shadow-lg shadow-rose-500/20 bg-[length:200%_100%] hover:bg-right transition-all duration-300"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Link to="/auth">Create Your Profile</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="h-14 px-8 border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Link to="/safety">Safety Information</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Links */}
        <section className="py-8 border-t border-white/5">
          <div className="container">
            <div
              className="flex flex-wrap justify-center gap-6 text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Link to="/terms" className="text-white/40 hover:text-rose-400 transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="text-white/40 hover:text-rose-400 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/faq/pricing" className="text-white/40 hover:text-rose-400 transition-colors">
                Pricing FAQ
              </Link>
              <Link to="/guidelines" className="text-white/40 hover:text-rose-400 transition-colors">
                Community Guidelines
              </Link>
              <Link to="/safety" className="text-white/40 hover:text-rose-400 transition-colors">
                Safety
              </Link>
              <Link to="/help" className="text-white/40 hover:text-rose-400 transition-colors">
                Help Center
              </Link>
              <Link to="/contact" className="text-white/40 hover:text-rose-400 transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </section>

        {user && <MobileNav />}
      </div>

    </div>
  );
}
