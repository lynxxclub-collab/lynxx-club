import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { Gem, Wallet, Rocket, Users, Sparkles } from 'lucide-react';

export default function Launch() {
  const { user } = useAuth();
  const [progress, setProgress] = useState({
    seekers: 0,
    earners: 0,
    seekerGoal: 100,
    earnerGoal: 50
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        // Get claimed seeker promotions
        const { count: seekerCount } = await supabase
          .from('launch_promotions')
          .select('*', { count: 'exact', head: true })
          .eq('user_type', 'seeker');

        // Get claimed earner promotions
        const { count: earnerCount } = await supabase
          .from('launch_promotions')
          .select('*', { count: 'exact', head: true })
          .eq('user_type', 'earner');

        setProgress({
          seekers: seekerCount || 0,
          earners: earnerCount || 0,
          seekerGoal: 100,
          earnerGoal: 50
        });
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();

    // Refresh every 10 seconds
    const interval = setInterval(loadProgress, 10000);
    return () => clearInterval(interval);
  }, []);

  const seekerPercentage = Math.min((progress.seekers / progress.seekerGoal) * 100, 100);
  const earnerPercentage = Math.min((progress.earners / progress.earnerGoal) * 100, 100);
  const seekerSpotsLeft = Math.max(progress.seekerGoal - progress.seekers, 0);
  const earnerSpotsLeft = Math.max(progress.earnerGoal - progress.earners, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative pt-24 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-teal/5" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Rocket className="w-4 h-4" />
            Live Progress
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-4">
            Launch Progress
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Watch Lynxx Club grow in real-time. Claim your early adopter perks before they're gone!
          </p>
        </div>
      </section>

      {/* Progress Cards */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Seekers Progress */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Gem className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Seekers</h2>
              </div>
              <span className="text-2xl font-bold text-primary">
                {loading ? '...' : `${progress.seekers} / ${progress.seekerGoal}`}
              </span>
            </div>

            <div className="mb-4">
              <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                <div
                  className="bg-primary h-4 rounded-full transition-all duration-500"
                  style={{ width: `${seekerPercentage}%` }}
                />
              </div>
            </div>

            {seekerSpotsLeft > 0 ? (
              <p className="text-muted-foreground">
                <strong className="text-foreground">{seekerSpotsLeft} spots left</strong> for{' '}
                <span className="text-primary font-semibold">100 bonus credits</span> ($10 value) — enough for 20 messages or one 15-minute video date!
              </p>
            ) : (
              <p className="text-teal font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Launch bonus claimed! Regular pricing now active.
              </p>
            )}
          </div>

          {/* Earners Progress */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-teal" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Earners</h2>
              </div>
              <span className="text-2xl font-bold text-teal">
                {loading ? '...' : `${progress.earners} / ${progress.earnerGoal}`}
              </span>
            </div>

            <div className="mb-4">
              <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                <div
                  className="bg-teal h-4 rounded-full transition-all duration-500"
                  style={{ width: `${earnerPercentage}%` }}
                />
              </div>
            </div>

            {earnerSpotsLeft > 0 ? (
              <p className="text-muted-foreground">
                <strong className="text-foreground">{earnerSpotsLeft} spots left</strong> for{' '}
                <span className="text-teal font-semibold">featured placement</span> (30 days)
              </p>
            ) : (
              <p className="text-teal font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Featured spots claimed! Regular onboarding now active.
              </p>
            )}
          </div>

          {/* Total Members */}
          <div className="bg-muted/30 border border-border rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-5 h-5 text-gold" />
              <span className="text-muted-foreground">Total Early Members</span>
            </div>
            <p className="text-4xl font-bold text-foreground">
              {loading ? '...' : progress.seekers + progress.earners}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-primary/20 to-teal/20 border border-primary/30 rounded-2xl p-8 text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to Join?
            </h3>
            <p className="text-muted-foreground mb-6">
              Don't miss out on early adopter perks. Sign up now and claim your bonus!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90">
                <Link to="/auth?type=seeker">
                  <Gem className="w-4 h-4 mr-2" />
                  Join as Seeker
                </Link>
              </Button>
              <Button size="lg" asChild className="bg-teal hover:bg-teal/90 text-background">
                <Link to="/auth?type=earner">
                  <Wallet className="w-4 h-4 mr-2" />
                  Join as Earner
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className="py-8 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
              About Us
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/help" className="text-muted-foreground hover:text-primary transition-colors">
              Help Center
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/safety" className="text-muted-foreground hover:text-primary transition-colors">
              Safety
            </Link>
          </div>
        </div>
      </section>

      {user && <MobileNav />}
    </div>
  );
}
