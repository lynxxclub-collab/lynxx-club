import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Video,
  MessageSquare,
  Heart,
  Shield,
  ArrowRight,
  Check,
  Gem,
  Users,
  Clock,
  Wallet,
  Rocket,
  Gift,
  Star,
  Zap,
  Crown,
  PartyPopper,
} from "lucide-react";

export default function Index() {
  const { user } = useAuth();

  const seekerBenefits = [
    { icon: Gift, text: "100 FREE credits on signup ($10 value)" },
    { icon: Gem, text: "50% bonus credits on first purchase" },
    { icon: Crown, text: "Founding Member badge on profile" },
    { icon: Star, text: "Priority access to new features" },
    { icon: Zap, text: "Lower rates locked in forever" },
  ];

  const earnerBenefits = [
    { icon: Wallet, text: "85% earnings (vs 70% standard) for 6 months" },
    { icon: Crown, text: "Founding Earner badge on profile" },
    { icon: Star, text: "Featured placement in browse" },
    { icon: Zap, text: "Early access to premium tools" },
    { icon: Gift, text: "No minimum withdrawal for 3 months" },
  ];

  const features = [
    {
      icon: Video,
      title: "Video Dates",
      description: "Real face-to-face conversations. Know if there's chemistry before meeting up.",
      color: "bg-primary/20 text-primary",
    },
    {
      icon: MessageSquare,
      title: "Meaningful Chat",
      description: "Quality over quantity. Every message matters, every connection counts.",
      color: "bg-teal/20 text-teal",
    },
    {
      icon: Shield,
      title: "Verified & Safe",
      description: "All members verified. Your safety and privacy are our top priority.",
      color: "bg-gold/20 text-gold",
    },
    {
      icon: Heart,
      title: "Real Connections",
      description: "Built for people who want genuine relationships, not endless swiping.",
      color: "bg-primary/20 text-primary",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          <span className="text-2xl font-display font-bold text-foreground">Lynxx Club</span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <Link to="/browse">
              <Button className="bg-primary hover:bg-primary/90">Enter App</Button>
            </Link>
          ) : (
            <>
              <Link to="/auth?mode=login">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button className="bg-primary hover:bg-primary/90">Join Launch</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero - Launch Announcement */}
      <section className="relative pt-16 md:pt-24 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-teal/5" />
        <div className="max-w-4xl mx-auto text-center relative">
          {/* Launch Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Rocket className="w-4 h-4" />
            <span>We're Launching!</span>
            <PartyPopper className="w-4 h-4 text-gold" />
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
            Be First to Experience <span className="text-primary">Video Dating Done Right</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Lynxx Club is launching now. Join as a founding member and get exclusive benefits that will never be offered
            again.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90">
                <Gift className="w-5 h-5 mr-2" />
                Claim Founding Member Benefits
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            🔥 Limited spots for founding members • Benefits decrease after launch
          </p>
        </div>
      </section>

      {/* Two-Column Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gold/10 text-gold px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Gift className="w-4 h-4" />
              Founding Member Exclusives
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Early Adopters Get the Best Perks
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              These benefits are only available during our launch period. Once we hit capacity, they're gone forever.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Seeker Benefits */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">For Seekers</h3>
                    <p className="text-sm text-muted-foreground">Looking to connect</p>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {seekerBenefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <benefit.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-foreground font-medium">{benefit.text}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/auth?mode=signup&type=seeker" className="block">
                  <Button className="w-full h-12 bg-primary hover:bg-primary/90" size="lg">
                    <Gem className="w-4 h-4 mr-2" />
                    Join as Seeker
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Earner Benefits */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-teal/20 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-teal" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">For Earners</h3>
                    <p className="text-sm text-muted-foreground">Get paid to connect</p>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {earnerBenefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                        <benefit.icon className="w-4 h-4 text-teal" />
                      </div>
                      <span className="text-foreground font-medium">{benefit.text}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/auth?mode=signup&type=earner" className="block">
                  <Button className="w-full h-12 bg-teal hover:bg-teal/90 text-background" size="lg">
                    <Wallet className="w-4 h-4 mr-2" />
                    Join as Earner
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">How Lynxx Works</h2>
            <p className="text-lg text-muted-foreground">Simple, safe, and meaningful</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, title: "Create Your Profile", desc: "Sign up in 2 minutes. Add photos and tell your story." },
              { step: 2, title: "Connect & Chat", desc: "Browse verified profiles. Start meaningful conversations." },
              { step: 3, title: "Video Date", desc: "Schedule video calls. Meet face-to-face from anywhere." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Why Lynxx Club?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We're building something different. A platform where real connections happen.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earner Highlight */}
      <section className="py-16 px-4 bg-gradient-to-r from-teal/10 via-primary/5 to-teal/10">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-teal/10 text-teal px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Wallet className="w-4 h-4" />
                Earn Money
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Turn Conversations Into Income
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                As an earner, you set your rates and schedule. Get paid for messages, photos, and video dates. Keep up
                to 85% during our launch period.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Set your own message and video rates",
                  "Get paid for every interaction",
                  "Flexible schedule - work when you want",
                  "Fast withdrawals to your bank",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-teal/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-teal" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth?mode=signup&type=earner">
                <Button size="lg" className="bg-teal hover:bg-teal/90 text-background">
                  Start Earning Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-2xl p-6">
                <Gem className="w-8 h-8 text-primary mb-3" />
                <p className="text-3xl font-bold text-foreground">$0.35</p>
                <p className="text-muted-foreground text-sm">per message</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6">
                <Video className="w-8 h-8 text-teal mb-3" />
                <p className="text-3xl font-bold text-foreground">$15+</p>
                <p className="text-muted-foreground text-sm">per 30min call</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6">
                <Clock className="w-8 h-8 text-gold mb-3" />
                <p className="text-3xl font-bold text-foreground">Flexible</p>
                <p className="text-muted-foreground text-sm">your schedule</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6">
                <Crown className="w-8 h-8 text-primary mb-3" />
                <p className="text-3xl font-bold text-foreground">85%</p>
                <p className="text-muted-foreground text-sm">you keep (launch)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-primary/20 to-teal/20 border border-primary/30 rounded-2xl p-8 text-center">
            <div className="inline-flex items-center gap-2 bg-gold/10 text-gold px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Clock className="w-4 h-4" />
              Limited Time Launch Offer
            </div>

            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
              Don't Miss Your Founding Member Benefits
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join now to lock in exclusive perks. Once launch period ends, these benefits are gone forever.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?mode=signup&type=seeker">
                <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90">
                  <Gem className="w-5 h-5 mr-2" />
                  Join as Seeker
                </Button>
              </Link>
              <Link to="/auth?mode=signup&type=earner">
                <Button size="lg" className="h-14 px-8 text-lg bg-teal hover:bg-teal/90 text-background">
                  <Wallet className="w-5 h-5 mr-2" />
                  Join as Earner
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="font-display font-bold text-lg text-foreground">Lynxx Club</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Lynxx Club. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
