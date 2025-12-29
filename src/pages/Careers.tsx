import { Link } from "react-router-dom";
import { Heart, Users, Zap, Globe, Coffee, Laptop, Sparkles, ArrowRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";

const benefits = [
  {
    icon: Laptop,
    title: "Remote-First",
    description: "Work from anywhere in the world. We believe in flexibility and trust.",
    color: "purple",
  },
  {
    icon: Heart,
    title: "Health & Wellness",
    description: "Comprehensive health coverage and wellness programs for you and your family.",
    color: "rose",
  },
  {
    icon: Coffee,
    title: "Unlimited PTO",
    description: "Take the time you need to recharge. We value work-life balance.",
    color: "amber",
  },
  {
    icon: Zap,
    title: "Growth Budget",
    description: "Annual learning stipend for courses, conferences, and skill development.",
    color: "green",
  },
  {
    icon: Users,
    title: "Team Retreats",
    description: "Regular in-person gatherings to connect and collaborate with your teammates.",
    color: "blue",
  },
  {
    icon: Globe,
    title: "Diverse & Inclusive",
    description: "We celebrate diversity and foster an inclusive environment for everyone.",
    color: "teal",
  },
];

const values = [
  {
    title: "User-Obsessed",
    description:
      "Every decision starts with our users. We're building something that genuinely helps people find meaningful connections.",
    color: "purple",
  },
  {
    title: "Move Fast, Stay Thoughtful",
    description: "We ship quickly but never compromise on quality or user safety.",
    color: "rose",
  },
  {
    title: "Radical Transparency",
    description: "Open communication and honest feedback are the foundation of how we work.",
    color: "amber",
  },
  {
    title: "Own Your Impact",
    description: "Everyone here has the autonomy to make decisions and drive real change.",
    color: "green",
  },
];

const getColorClasses = (color: string) => {
  const colors: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    purple: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      text: "text-purple-400",
      iconBg: "bg-purple-500/20",
    },
    rose: { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400", iconBg: "bg-rose-500/20" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", iconBg: "bg-amber-500/20" },
    green: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", iconBg: "bg-green-500/20" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", iconBg: "bg-blue-500/20" },
    teal: { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-400", iconBg: "bg-teal-500/20" },
  };
  return colors[color] || colors.purple;
};

const Careers = () => {
  const { user } = useAuth();

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

      <div className="relative z-10">
        <Header />

        {/* Hero Section */}
        <section className="relative pt-20 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <Briefcase className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Join Our Team
              </span>
            </div>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Help Us Build the Future of{" "}
              <span className="bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                Meaningful Connections
              </span>
            </h1>
            <p
              className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              We're on a mission to create a platform where genuine relationships thrive. Join a passionate team that's
              redefining how people meet and connect.
            </p>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
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
                These principles guide everything we do at Lynxx Club.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {values.map((value, index) => {
                const colors = getColorClasses(value.color);
                return (
                  <div
                    key={index}
                    className={`rounded-2xl bg-white/[0.02] border border-white/10 p-6 hover:${colors.border} transition-all`}
                  >
                    <div className={`w-2 h-2 rounded-full ${colors.text.replace("text-", "bg-")} mb-4`} />
                    <h3
                      className="text-xl font-semibold text-white mb-2"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {value.title}
                    </h3>
                    <p className="text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {value.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Why Work{" "}
                <span className="bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
                  With Us
                </span>
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                We take care of our team so they can take care of our users.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => {
                const colors = getColorClasses(benefit.color);
                return (
                  <div
                    key={index}
                    className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 hover:border-white/20 hover:bg-white/[0.04] transition-all group"
                  >
                    <div
                      className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <benefit.icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <h3
                      className="text-lg font-semibold text-white mb-2"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {benefit.title}
                    </h3>
                    <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* No Openings Section */}
        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 via-rose-500/20 to-amber-500/20 rounded-[32px] blur-xl opacity-50" />
              <div className="relative rounded-3xl bg-white/[0.03] backdrop-blur-sm border border-white/10 p-8 md:p-12">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
                <h2
                  className="text-2xl md:text-3xl font-bold text-white mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  No Open Positions{" "}
                  <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
                    Right Now
                  </span>
                </h2>
                <p className="text-white/50 mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  We're not actively hiring at the moment, but we're always interested in connecting with talented
                  people. Check back soon or reach out to introduce yourself.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    asChild
                    className="h-12 px-6 bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white font-semibold rounded-xl"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Link to="/contact">
                      Get in Touch
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="h-12 px-6 border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Link to="/about">Learn About Us</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Links */}
        <section className="py-12 px-4 border-t border-white/5">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-white/40 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Have questions about working at Lynxx Club?
            </p>
            <div className="flex flex-wrap justify-center gap-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <Link to="/about" className="text-white/50 hover:text-rose-400 transition-colors">
                About Us
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/contact" className="text-white/50 hover:text-rose-400 transition-colors">
                Contact
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/guidelines" className="text-white/50 hover:text-rose-400 transition-colors">
                Community Guidelines
              </Link>
            </div>
          </div>
        </section>

        <MobileNav />
      </div>

      {/* Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default Careers;
