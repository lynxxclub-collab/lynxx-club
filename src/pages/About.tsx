import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Shield,
  Sparkles,
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
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Video Dates",
    description: "Connect face-to-face through secure, private video calls before meeting in person.",
  },
  {
    icon: MessageSquare,
    title: "Meaningful Messaging",
    description: "Quality over quantity. Our credit system encourages thoughtful, genuine conversations.",
  },
  {
    icon: Shield,
    title: "Verified Profiles",
    description: "ID verification and photo confirmation help ensure you're talking to real people.",
  },
  {
    icon: CreditCard,
    title: "Fair Compensation",
    description: "Earners receive 70% of all credits spent, valuing their time and attention.",
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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Redefining Online Dating
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
              Where Real Connections
              <span className="text-primary"> Begin</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Lynxx Club is a premium dating platform that values quality over quantity. We connect Seekers looking for
              meaningful relationships with Earners who deserve compensation for their time and attention.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/auth">
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/help">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Early Access */}
      <section className="py-12 border-y border-border">
        <div className="container">
          <div className="bg-gradient-to-r from-primary/30 to-teal/30 rounded-2xl p-8 border border-primary/20">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Join Our Launch</h2>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8 text-primary" />
              </div>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Lynxx Club is brand new and growing fast. Be part of our founding community and help shape the future of
                dating.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">Early Adopter Benefits</h3>
                  <p className="text-sm text-muted-foreground">
                    First 100 Seekers get 500 bonus credits. First 50 Earners get featured placement.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">Shape the Product</h3>
                  <p className="text-sm text-muted-foreground">
                    Your feedback directly influences features. We're building this together.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">Less Competition</h3>
                  <p className="text-sm text-muted-foreground">
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How Lynxx Club Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A unique approach to online dating that respects everyone's time and creates genuine opportunities for
              connection.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* For Seekers */}
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">For Seekers</h3>
              <p className="text-muted-foreground mb-6">
                Purchase credits to initiate conversations and book video dates with verified, quality members.
              </p>
              <ul className="space-y-3">
                {[
                  "Browse verified profiles",
                  "Send thoughtful messages",
                  "Book private video dates",
                  "Rate and review experiences",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-teal" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* For Earners */}
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center mb-6">
                <Star className="w-6 h-6 text-teal" />
              </div>
              <h3 className="text-2xl font-bold mb-4">For Earners</h3>
              <p className="text-muted-foreground mb-6">
                Get paid for your time and attention while meeting interesting people on your own terms.
              </p>
              <ul className="space-y-3">
                {[
                  "Earn 70% of all credits spent",
                  "Set your own video rates",
                  "Control your availability",
                  "Earnings withdraw weekly",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-teal" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-card/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Lynxx Club</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We've built a platform that prioritizes safety, authenticity, and meaningful connections.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-background border border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do at Lynxx Club.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <div key={index} className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="py-20 bg-card/50">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <Users className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">About the Company</h2>
          </div>

          <div className="prose prose-invert max-w-none text-center">
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Lynxx Club is operated by Driven LLC, based in Michigan. Launched December 2025, we set out to create a
              dating platform that addresses the frustrations of traditional apps—low-quality matches, endless swiping,
              and one-sided conversations.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Our unique model ensures that every interaction is meaningful. Seekers invest in connections they
              genuinely want to pursue, while Earners are fairly compensated for the time and energy they put into
              building relationships.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We're committed to fostering a safe, respectful community where real connections can flourish. Every
              feature we build is designed with this mission in mind.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="bg-gradient-to-r from-primary/20 to-teal/20 rounded-2xl p-8 md:p-12 text-center border border-primary/30">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Find Your Connection?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join a growing community experiencing a more intentional way to connect online.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/auth">Create Your Profile</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/safety">Safety Information</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className="py-8 border-t border-border">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/faq/pricing" className="text-muted-foreground hover:text-primary transition-colors">
              Pricing FAQ
            </Link>
            <Link to="/guidelines" className="text-muted-foreground hover:text-primary transition-colors">
              Community Guidelines
            </Link>
            <Link to="/safety" className="text-muted-foreground hover:text-primary transition-colors">
              Safety
            </Link>
            <Link to="/help" className="text-muted-foreground hover:text-primary transition-colors">
              Help Center
            </Link>
            <Link to="/report" className="text-muted-foreground hover:text-primary transition-colors">
              Report a Problem
            </Link>
          </div>
        </div>
      </section>

      {user && <MobileNav />}
    </div>
  );
}
