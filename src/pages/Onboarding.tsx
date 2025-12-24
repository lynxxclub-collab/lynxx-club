import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import BasicInfoStep from '@/components/onboarding/BasicInfoStep';
import RoleSelectionStep from '@/components/onboarding/RoleSelectionStep';
import ProfileSetupStep from '@/components/onboarding/ProfileSetupStep';
import { Sparkles } from 'lucide-react';

export default function Onboarding() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile?.account_status === 'active') {
      if (profile.user_type === 'seeker') {
        navigate('/browse');
      } else {
        navigate('/dashboard');
      }
    }
  }, [profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  const currentStep = profile?.onboarding_step || 1;

  const handleStepComplete = async () => {
    await refreshProfile();
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-purple/5" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-purple/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-teal/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 container max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-display text-gradient-purple">Lynxx Club</span>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === currentStep
                    ? 'w-8 bg-primary glow-purple'
                    : step < currentStep
                    ? 'w-8 bg-primary/50'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
          
          <p className="text-muted-foreground">
            Step {currentStep} of 4
          </p>
        </div>

        {/* Step content */}
        <div className="animate-fade-in">
          {currentStep === 1 && (
            <BasicInfoStep onComplete={handleStepComplete} />
          )}
          {currentStep === 2 && (
            <RoleSelectionStep onComplete={handleStepComplete} />
          )}
          {currentStep === 3 && (
            <ProfileSetupStep onComplete={handleStepComplete} />
          )}
        </div>
      </div>
    </div>
  );
}
