import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sparkles, Heart, Wallet, Shield, ArrowRight, Rocket, Users } from 'lucide-react';
import Footer from '@/components/Footer';
import { FeaturedEarners } from '@/components/home/FeaturedEarners';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.account_status === 'active') {
        if (profile.user_type === 'seeker') {
          navigate('/browse');
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/onboarding');
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-purple/10" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-3xl" />
      
      <div className="relative z-10 container">
        {/* Header */}
        <header className="sticky top-0 z-50 flex items-center justify-between py-4 px-4 -mx-4 border-b border-border bg-background/80 backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <span className="text-2xl font-display font-bold text-gradient-purple">
              Lynxx Club
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/browse">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Users className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Browse</span>
              </Button>
            </Link>
            <Link to="/launch">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Rocket className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Launch</span>
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-primary hover:bg-primary/90 glow-purple">
                Get Started
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="py-24 text-center max-w-4xl mx-auto">
          <div className="animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
              Premium Dating,
              <br />
              <span className="text-gradient-purple">Your Terms</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect with quality people. Whether you're looking for meaningful conversations 
              or earning from your time, Lynxx Club makes it happen.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 glow-purple text-lg px-8">
                  Start Dating <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="border-gold text-gold hover:bg-gold/10 text-lg px-8">
                  <Wallet className="mr-2 w-5 h-5" />
                  Start Earning
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl glass-card animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
              <Heart className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-display font-semibold mb-2">Quality Connections</h3>
            <p className="text-muted-foreground">
              Every member is verified. Browse profiles and connect with people who value meaningful interactions.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="w-14 h-14 rounded-xl bg-gold/20 flex items-center justify-center mb-4">
              <Wallet className="w-7 h-7 text-gold" />
            </div>
            <h3 className="text-xl font-display font-semibold mb-2">Earn on Your Terms</h3>
            <p className="text-muted-foreground">
              Set your rates, manage your availability, and get paid for your time. Withdraw earnings anytime.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="w-14 h-14 rounded-xl bg-teal/20 flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-teal" />
            </div>
            <h3 className="text-xl font-display font-semibold mb-2">Safe & Secure</h3>
            <p className="text-muted-foreground">
              Your privacy and safety are our priority. Advanced verification and moderation keep the community trusted.
            </p>
          </div>
        </section>

        {/* Featured Earners */}
        <FeaturedEarners />

        {/* Launch Section */}
        <section className="py-20 -mx-4 px-4 bg-card/80 border-y border-border">
          <div className="max-w-6xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Rocket className="w-8 h-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-display font-bold">Launching December 2025</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">
              Be among the first to experience dating where quality matters.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-background border border-border rounded-2xl p-6">
                <h3 className="text-2xl font-bold text-primary mb-2">For Seekers</h3>
                <p className="text-muted-foreground mb-4">
                  First 100 members get <strong className="text-foreground">100 bonus credits</strong> ($10 value)
                </p>
                <Link to="/auth?type=seeker">
                  <Button className="bg-primary hover:bg-primary/90 w-full">
                    Join as Seeker
                  </Button>
                </Link>
              </div>
              <div className="bg-background border border-border rounded-2xl p-6">
                <h3 className="text-2xl font-bold text-teal mb-2">For Earners</h3>
                <p className="text-muted-foreground mb-4">
                  First 50 Earners get <strong className="text-foreground">featured placement</strong> for 30 days
                </p>
                <Link to="/auth?type=earner">
                  <Button className="bg-teal hover:bg-teal/90 text-background w-full">
                    Join as Earner
                  </Button>
                </Link>
              </div>
              <div className="bg-background border border-border rounded-2xl p-6">
                <h3 className="text-2xl font-bold text-gold mb-2">Early Access</h3>
                <p className="text-muted-foreground mb-4">
                  Help shape features. <strong className="text-foreground">Your feedback matters</strong> at this stage.
                </p>
                <Link to="/about">
                  <Button variant="outline" className="border-gold text-gold hover:bg-gold/10 w-full">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
