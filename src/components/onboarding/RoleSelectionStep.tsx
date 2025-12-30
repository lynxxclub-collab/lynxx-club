import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCreatorCap } from '@/hooks/useCreatorCap';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CreditCard, Wallet, ArrowRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import LaunchBonusModal from '@/components/launch/LaunchBonusModal';
import CreatorApplicationForm from '@/components/onboarding/CreatorApplicationForm';

interface Props {
  onComplete: () => void;
}

export default function RoleSelectionStep({ onComplete }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { is_capped, spots_remaining, loading: capLoading } = useCreatorCap();
  const [selectedRole, setSelectedRole] = useState<'seeker' | 'earner' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusType, setBonusType] = useState<'seeker' | 'earner'>('seeker');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [hasExistingApplication, setHasExistingApplication] = useState(false);

  // Check if user already has a pending application
  useEffect(() => {
    const checkExistingApplication = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('creator_applications')
        .select('id, status')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setHasExistingApplication(true);
        if (data.status === 'pending' || data.status === 'approved') {
          // Redirect to application status page
          navigate('/application-status');
        }
      }
    };
    
    checkExistingApplication();
  }, [user?.id, navigate]);

  const handleSelect = async (role: 'seeker' | 'earner') => {
    if (!user?.id) return;
    
    // If selecting earner and cap is reached, show application form
    if (role === 'earner' && is_capped) {
      setShowApplicationForm(true);
      return;
    }
    
    setSelectedRole(role);
    setLoading(true);

    try {
      // Check if eligible for launch bonus
      const { count } = await supabase
        .from('launch_promotions')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', role);

      const isEligible = role === 'seeker' ? (count || 0) < 100 : (count || 0) < 50;

      if (isEligible) {
        if (role === 'seeker') {
          // Give 100 bonus credits
          await supabase
            .from('profiles')
            .update({
              user_type: role,
              onboarding_step: 3,
              credit_balance: 100,
            })
            .eq('id', user.id);

          // Record promotion
          await supabase
            .from('launch_promotions')
            .insert({
              user_id: user.id,
              user_type: 'seeker',
              promotion_type: 'launch_bonus_100',
              bonus_credits: 100,
            });

          setBonusType('seeker');
          setShowBonusModal(true);
        } else {
          // Give featured placement for 30 days
          const featuredUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          await supabase
            .from('profiles')
            .update({
              user_type: role,
              onboarding_step: 3,
              featured_until: featuredUntil,
              is_featured: true,
            })
            .eq('id', user.id);

          // Record promotion
          await supabase
            .from('launch_promotions')
            .insert({
              user_id: user.id,
              user_type: 'earner',
              promotion_type: 'launch_featured_30d',
              featured_until: featuredUntil,
            });

          setBonusType('earner');
          setShowBonusModal(true);
        }
      } else {
        // No bonus, just update profile
        const { error } = await supabase
          .from('profiles')
          .update({
            user_type: role,
            onboarding_step: 3,
          })
          .eq('id', user.id);

        if (error) {
          // Check if it's the creator cap trigger
          if (error.message?.includes('Creator cap reached')) {
            toast.error('Creator spots are full. Please apply instead.');
            setShowApplicationForm(true);
            return;
          }
          toast.error('Failed to save your choice. Please try again.');
          console.error(error);
          setSelectedRole(null);
        } else {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Error during role selection:', error);
      toast.error('Something went wrong. Please try again.');
      setSelectedRole(null);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowBonusModal(false);
    onComplete();
  };

  const handleApplicationSubmitted = () => {
    navigate('/application-status');
  };

  // Show application form if cap reached and user clicked earner
  if (showApplicationForm) {
    return (
      <CreatorApplicationForm onSubmitted={handleApplicationSubmitted} />
    );
  }

  if (capLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display">Choose your path</CardTitle>
          <CardDescription>This determines how you'll use Lynxx Club</CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Seeker Card */}
            <button
              onClick={() => handleSelect('seeker')}
              disabled={loading}
              className={`relative p-6 rounded-xl border-2 transition-all duration-300 text-left group ${
                selectedRole === 'seeker'
                  ? 'border-primary bg-primary/10 glow-purple'
                  : 'border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50'
              }`}
            >
              {selectedRole === 'seeker' && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              
              <div className="mb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">I Want to Date</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Browse profiles and pay for quality conversations with interesting people.
                </p>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  Browse premium profiles
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  Pay with credits to message
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  Book video dates
                </div>
              </div>

              {/* Early adopter badge */}
              <div className="mt-4 px-3 py-1.5 bg-primary/20 rounded-full text-xs text-primary font-medium inline-block">
                🎁 First 100 get 100 bonus credits!
              </div>
            </button>

            {/* Earner Card */}
            <button
              onClick={() => handleSelect('earner')}
              disabled={loading}
              className={`relative p-6 rounded-xl border-2 transition-all duration-300 text-left group ${
                selectedRole === 'earner'
                  ? 'border-gold bg-gold/10 glow-gold'
                  : 'border-border bg-secondary/30 hover:border-gold/50 hover:bg-secondary/50'
              }`}
            >
              {selectedRole === 'earner' && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-gold rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-gold-foreground" />
                </div>
              )}
              
              <div className="mb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gold to-gold/60 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Wallet className="w-8 h-8 text-gold-foreground" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">I Want to Earn</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Get paid to chat and go on dates. Set your rates and earn on your terms.
                </p>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="w-3 h-3 text-gold" />
                  Earn money per message
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="w-3 h-3 text-gold" />
                  Set your own rates
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="w-3 h-3 text-gold" />
                  Withdraw anytime
                </div>
              </div>

              {/* Early adopter badge or application notice */}
              {is_capped ? (
                <div className="mt-4 px-3 py-1.5 bg-amber-500/20 rounded-full text-xs text-amber-400 font-medium inline-flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Application required
                </div>
              ) : (
                <div className="mt-4 px-3 py-1.5 bg-gold/20 rounded-full text-xs text-gold font-medium inline-block">
                  ⭐ {spots_remaining} spots left — get featured!
                </div>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            You can only choose one role. This cannot be changed later.
          </p>
        </CardContent>
      </Card>

      <LaunchBonusModal 
        open={showBonusModal} 
        onClose={handleModalClose} 
        bonusType={bonusType} 
      />
    </>
  );
}
