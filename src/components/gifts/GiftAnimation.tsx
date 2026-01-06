import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { playGiftSound } from '@/lib/giftSounds';

interface GiftAnimationProps {
  emoji: string;
  animationType: 'standard' | 'premium' | 'ultra';
  onComplete?: () => void;
  recipientName?: string;
}

// Define styles outside the component to prevent React warnings about style tags
const ANIMATION_STYLES = `
  @keyframes particle-0 {
    0% { transform: translate(0, 0) scale(1); opacity: 1; }
    100% { transform: translate(-80px, -120px) scale(0); opacity: 0; }
  }
  @keyframes particle-1 {
    0% { transform: translate(0, 0) scale(1); opacity: 1; }
    100% { transform: translate(80px, -100px) scale(0); opacity: 0; }
  }
  @keyframes particle-2 {
    0% { transform: translate(0, 0) scale(1); opacity: 1; }
    100% { transform: translate(-60px, 80px) scale(0); opacity: 0; }
  }
  @keyframes particle-3 {
    0% { transform: translate(0, 0) scale(1); opacity: 1; }
    100% { transform: translate(70px, 90px) scale(0); opacity: 0; }
  }
  @keyframes ray-pulse {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 0.5; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .bg-gradient-radial {
    background: radial-gradient(circle at center, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to));
  }
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
`;

export default function GiftAnimation({
  emoji,
  animationType,
  onComplete,
  recipientName
}: GiftAnimationProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      playGiftSound('standard');
      const timeout = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timeout);
    }

    // Enter phase
    const enterTimeout = setTimeout(() => {
      setPhase('show');
      playGiftSound(animationType);
    }, 200);
    
    // Duration based on animation type
    const duration = animationType === 'ultra' ? 2500 : animationType === 'premium' ? 2200 : 2000;
    
    // Exit phase
    const exitTimeout = setTimeout(() => setPhase('exit'), duration - 300);
    
    // Complete
    const completeTimeout = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(enterTimeout);
      clearTimeout(exitTimeout);
      clearTimeout(completeTimeout);
    };
  }, [animationType, onComplete, prefersReducedMotion]);

  if (!visible) return null;

  // Reduced motion: simple fade
  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-[#0a0a0f]/50 backdrop-blur-sm">
        <div className="text-8xl animate-fade-in">{emoji}</div>
      </div>
    );
  }

  return (
    <>
      <style>{ANIMATION_STYLES}</style>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Background overlay for premium/ultra */}
        {animationType !== 'standard' && (
          <div 
            className={cn(
              "absolute inset-0 transition-opacity duration-500 backdrop-blur-[2px]",
              phase === 'show' ? "opacity-100" : "opacity-0",
              animationType === 'ultra' 
                ? "bg-gradient-radial from-amber-500/10 via-[#0a0a0f]/50 to-[#0a0a0f]"
                : "bg-gradient-radial from-purple-500/10 via-[#0a0a0f]/50 to-[#0a0a0f]"
            )}
          />
        )}

        {/* Particle effects for premium/ultra */}
        {animationType !== 'standard' && phase === 'show' && (
          <div className="absolute inset-0">
            {[...Array(animationType === 'ultra' ? 20 : 12)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute w-2 h-2 rounded-full",
                  animationType === 'ultra' 
                    ? "bg-amber-400" 
                    : "bg-purple-400"
                )}
                style={{
                  left: `${50 + (Math.random() - 0.5) * 60}%`,
                  top: `${50 + (Math.random() - 0.5) * 60}%`,
                  animation: `particle-${i % 4} ${1 + Math.random()}s ease-out forwards`,
                  animationDelay: `${Math.random() * 0.5}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Main emoji */}
        <div
          className={cn(
            "relative transition-all",
            phase === 'enter' && "scale-0 opacity-0",
            phase === 'show' && "scale-100 opacity-100",
            phase === 'exit' && "scale-150 opacity-0 -translate-y-20"
          )}
          style={{
            transitionDuration: phase === 'enter' ? '300ms' : phase === 'exit' ? '400ms' : '200ms',
            transitionTimingFunction: phase === 'enter' ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-out'
          }}
        >
          {/* Glow effect */}
          {animationType !== 'standard' && (
            <div 
              className={cn(
                "absolute inset-0 blur-3xl opacity-60",
                animationType === 'ultra'
                  ? "bg-gradient-to-r from-amber-400 to-orange-500"
                  : "bg-gradient-to-r from-purple-400 to-pink-500"
              )}
              style={{ transform: 'scale(1.5)' }}
            />
          )}
          
          {/* Responsive Emoji Size: Smaller on mobile to fit viewport */}
          <span 
            className={cn(
              "relative block text-[5rem] sm:text-9xl",
              phase === 'show' && animationType === 'ultra' && "animate-pulse"
            )}
          >
            {emoji}
          </span>
        </div>

        {/* Ultra animation: Crown hovers above */}
        {animationType === 'ultra' && phase === 'show' && recipientName && (
          <div 
            className="absolute top-[30%] sm:top-1/3 w-full text-center animate-float px-4"
          >
            <p className="text-base sm:text-lg font-medium text-amber-400 drop-shadow-lg truncate px-4">
              For {recipientName}
            </p>
          </div>
        )}

        {/* Light rays for ultra */}
        {animationType === 'ultra' && phase === 'show' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 h-[200vh] w-1 bg-gradient-to-t from-amber-400/20 to-transparent origin-bottom"
                style={{
                  transform: `translateX(-50%) rotate(${i * 45}deg)`,
                  animation: 'ray-pulse 2s ease-in-out infinite',
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}