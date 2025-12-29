import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Video,
  MessageSquare,
  Heart,
  Shield,
  Star,
  ArrowRight,
  Check,
  Gem,
  Users,
  Clock,
  Wallet,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Index() {
  const { user } = useAuth();

  const features = [
    {
      icon: Video,
      title: "Video Dates",
      description: "Connect face-to-face with scheduled video calls. No more guessing if there's chemistry.",
      color: "text-primary bg-primary/10",
    },
    {
      icon: MessageSquare,
      title: "Meaningful Messaging",
      description: "Break the ice with thoughtful messages. Quality over quantity.",
      color: "text-teal-500 bg-teal-500/10",
    },
    {
      icon: Shield,
      title: "Verified Profiles",
      description: "Every member is verified. Connect with real people, not catfish.",
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      icon: Heart,
      title: "Real Connections",
      description: "Built for people seeking genuine relationships, not endless swiping.",
      color: "text-rose-500 bg-rose-500/10",
    },
  ];

  const stats = [
    { value: "50K+", label: "Active Members" },
    { value: "10K+", label: "Video Dates Weekly" },
    { value: "4.8", label: "App Store Rating" },
    { value: "85%", label: "Match Rate" },
  ];

  const testimonials = [
    {
      quote:
        "I was tired of dating apps where you match and nothing happens. On Lynxx, I had my first video date within a day. Now we're engaged!",
      name: "Sarah M.",
      location: "Los Angeles, CA",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    },
    {
      quote:
        "The video dates make it so much easier to know if there's real chemistry. No more wasted time on awkward first meetings.",
      name: "Michael T.",
      location: "New York, NY",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    },
    {
      quote:
        "As an earner, I love that I can set my own schedule and rates. I've met amazing people and built a real income.",
      name: "Jessica K.",
      location: "Miami, FL",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
    },
  ];

  const pricingPlans = [
    { credits: 100, price: 9.99, bonus: 0, popular: false },
    { credits: 500, price: 39.99, bonus: 50, popular: true },
    { credits: 1000, price: 69.99, bonus: 150, popular: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          <span className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Lynxx Club
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <Link to="/browse">
              <Button>Enter App</Button>
            </Link>
          ) : (
            <>
              <Link to="/auth?mode=login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 text-center relative">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -z-10" />

        <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
          <Sparkles className="w-3 h-3 mr-1" />
          #1 Video Dating Platform
        </Badge>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Find Your Person
          <br />
          <span className="bg-gradient-to-r from-primary via-purple-500 to-rose-500 bg-clip-text text-transparent">
            Through Video Dates
          </span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Skip the endless texting. Connect face-to-face with verified members through scheduled video dates. Real
          chemistry, real connections.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link to="/auth?mode=signup">
            <Button size="lg" className="h-14 px-8 text-lg">
              Start Free Today
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
            <Play className="w-5 h-5 mr-2" />
            Watch Demo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Why Lynxx Club?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We're not just another dating app. We're building a community of people seeking real connections.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <Card key={i} className="border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4", feature.color)}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-card/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Get started in minutes</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: 1, title: "Create Profile", desc: "Sign up, add photos, and verify your identity" },
              { step: 2, title: "Browse & Connect", desc: "Find interesting people and start messaging" },
              { step: 3, title: "Book Video Dates", desc: "Schedule a video call and meet face-to-face" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Love Stories</h2>
          <p className="text-xl text-muted-foreground">Join thousands who found their person on Lynxx</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Become an Earner */}
      <section className="py-20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-rose-500/10">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                <Wallet className="w-3 h-3 mr-1" />
                Earn Money
              </Badge>
              <h2 className="text-4xl font-bold mb-4">Become an Earner</h2>
              <p className="text-xl text-muted-foreground mb-6">
                Set your own rates, create your schedule, and earn money having meaningful conversations. You keep 70%
                of everything you earn.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Set your own video date rates",
                  "Earn from every message sent to you",
                  "Flexible schedule - work when you want",
                  "Instant withdrawals to your bank",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth?mode=signup">
                <Button size="lg">
                  Start Earning Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 bg-background">
                <Gem className="w-8 h-8 text-primary mb-3" />
                <p className="text-3xl font-bold">$0.35</p>
                <p className="text-muted-foreground">per message</p>
              </Card>
              <Card className="p-6 bg-background">
                <Video className="w-8 h-8 text-teal-500 mb-3" />
                <p className="text-3xl font-bold">$10.50</p>
                <p className="text-muted-foreground">per 30min video</p>
              </Card>
              <Card className="p-6 bg-background">
                <Clock className="w-8 h-8 text-amber-500 mb-3" />
                <p className="text-3xl font-bold">You Choose</p>
                <p className="text-muted-foreground">your schedule</p>
              </Card>
              <Card className="p-6 bg-background">
                <Users className="w-8 h-8 text-rose-500 mb-3" />
                <p className="text-3xl font-bold">50K+</p>
                <p className="text-muted-foreground">seekers waiting</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to find your person?</h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
          Join thousands of members who've found meaningful connections on Lynxx Club.
        </p>
        <Link to="/auth?mode=signup">
          <Button size="lg" className="h-14 px-10 text-lg">
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="font-display font-bold text-lg">Lynxx Club</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Lynxx Club. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link to="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link to="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
