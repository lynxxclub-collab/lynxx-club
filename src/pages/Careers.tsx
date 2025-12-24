import { Link } from "react-router-dom";
import { Heart, Users, Zap, Globe, Coffee, Laptop, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";

const benefits = [
  {
    icon: Laptop,
    title: "Remote-First",
    description: "Work from anywhere in the world. We believe in flexibility and trust."
  },
  {
    icon: Heart,
    title: "Health & Wellness",
    description: "Comprehensive health coverage and wellness programs for you and your family."
  },
  {
    icon: Coffee,
    title: "Unlimited PTO",
    description: "Take the time you need to recharge. We value work-life balance."
  },
  {
    icon: Zap,
    title: "Growth Budget",
    description: "Annual learning stipend for courses, conferences, and skill development."
  },
  {
    icon: Users,
    title: "Team Retreats",
    description: "Regular in-person gatherings to connect and collaborate with your teammates."
  },
  {
    icon: Globe,
    title: "Diverse & Inclusive",
    description: "We celebrate diversity and foster an inclusive environment for everyone."
  }
];

const values = [
  {
    title: "User-Obsessed",
    description: "Every decision starts with our users. We're building something that genuinely helps people find meaningful connections."
  },
  {
    title: "Move Fast, Stay Thoughtful",
    description: "We ship quickly but never compromise on quality or user safety."
  },
  {
    title: "Radical Transparency",
    description: "Open communication and honest feedback are the foundation of how we work."
  },
  {
    title: "Own Your Impact",
    description: "Everyone here has the autonomy to make decisions and drive real change."
  }
];

const Careers = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Join Our Team
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Help Us Build the Future of{" "}
            <span className="text-primary">Meaningful Connections</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            We're on a mission to create a platform where genuine relationships thrive. 
            Join a passionate team that's redefining how people meet and connect.
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Values
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do at Lynxx Club.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <div 
                key={index}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Work With Us
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We take care of our team so they can take care of our users.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* No Openings Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              No Open Positions Right Now
            </h2>
            <p className="text-muted-foreground mb-6">
              We're not actively hiring at the moment, but we're always interested in 
              connecting with talented people. Check back soon or reach out to introduce yourself.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/contact">
                  Get in Touch
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/about">Learn About Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className="py-12 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">
            Have questions about working at Lynxx Club?
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/about" className="text-primary hover:underline">
              About Us
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/contact" className="text-primary hover:underline">
              Contact
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/guidelines" className="text-primary hover:underline">
              Community Guidelines
            </Link>
          </div>
        </div>
      </section>

      <MobileNav />
    </div>
  );
};

export default Careers;
