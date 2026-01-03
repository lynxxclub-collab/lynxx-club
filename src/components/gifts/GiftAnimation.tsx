import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { playGiftSound } from "@/lib/giftSounds";

type AnimationType = "standard" | "premium" | "ultra";
type Phase = "enter" | "show" | "exit";

interface GiftAnimationProps {
  emoji: string;
  animationType: AnimationType;
  onComplete?: () => void;
  recipientName?: string;
}

const DURATIONS: Record<AnimationType, number> = {
  standard: 2000,
  premium: 2200,
  ultra: 2500,
};

function clampEmoji(value: string) {
  // Keep it simple: allow any string, but avoid empty rendering
  return value?.trim() ? value : "🎁";
}

export default function GiftAnimation({ emoji, animationType, onComplete, recipientName }: GiftAnimationProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<Phase>("enter");

  // Avoid re-rendering because of media query access
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return true; // SSR-safe default
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  // Prevent double-calling onComplete (React Strict Mode + fast unmounts)
  const completedRef = useRef(false);
  const safeComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setVisible(false);
    onComplete?.();
  };

  // Pre-compute deterministic particle positions to avoid “jumping” on rerender
  const particles = useMemo(() => {
    const count = animationType === "ultra" ? 20 : animationType === "premium" ? 12 : 0;
    const seeds = Array.from({ length: count }, (_, i) => i + 1);

    return seeds.map((seed) => {
      // tiny deterministic PRNG
      const rand = (n: number) => {
        const x = Math.sin(seed * 999 + n * 131) * 10000;
        return x - Math.floor(x);
      };

      return {
        left: `${50 + (rand(1) - 0.5) * 60}%`,
        top: `${50 + (rand(2) - 0.5) * 60}%`,
        anim: `particle-${seed % 4}`,
        dur: `${1 + rand(3)}s`,
        delay: `${rand(4) * 0.5}s`,
      };
    });
  }, [animationType]);

  useEffect(() => {
    completedRef.current = false;

    // Reduced motion: short fade + subtle sound
    if (prefersReducedMotion) {
      playGiftSound("standard");
      const t = window.setTimeout(safeComplete, 900);
      return () => window.clearTimeout(t);
    }

    const duration = DURATIONS[animationType];

    // Enter -> Show
    const enterT = window.setTimeout(() => {
      setPhase("show");
      playGiftSound(animationType);
    }, 180);

    // Exit
    const exitT = window.setTimeout(() => setPhase("exit"), Math.max(0, duration - 320));

    // Complete
    const doneT = window.setTimeout(safeComplete, duration);

    return () => {
      window.clearTimeout(enterT);
      window.clearTimeout(exitT);
      window.clearTimeout(doneT);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationType, prefersReducedMotion]); // safeComplete intentionally not in deps

  if (!visible) return null;

  const safeEmoji = clampEmoji(emoji);

  // Reduced motion: simple fade
  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
        <div className="text-7xl animate-fade-in">{safeEmoji}</div>
      </div>
    );
  }

  const isStandard = animationType === "standard";
  const isUltra = animationType === "ultra";
  const show = phase === "show";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Background overlay for premium/ultra */}
      {!isStandard && (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            show ? "opacity-100" : "opacity-0",
            isUltra
              ? "bg-gradient-radial from-amber-500/20 via-transparent to-transparent"
              : "bg-gradient-radial from-purple-500/20 via-transparent to-transparent",
          )}
        />
      )}

      {/* Particle effects for premium/ultra (deterministic) */}
      {!isStandard && show && (
        <div className="absolute inset-0">
          {particles.map((p, i) => (
            <div
              key={i}
              className={cn("absolute w-2 h-2 rounded-full", isUltra ? "bg-amber-400" : "bg-purple-400")}
              style={{
                left: p.left,
                top: p.top,
                animation: `${p.anim} ${p.dur} ease-out forwards`,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Main emoji */}
      <div
        className={cn(
          "relative transition-all will-change-transform",
          phase === "enter" && "scale-0 opacity-0",
          phase === "show" && "scale-100 opacity-100",
          phase === "exit" && "scale-150 opacity-0 -translate-y-20",
        )}
        style={{
          transitionDuration: phase === "enter" ? "320ms" : phase === "exit" ? "420ms" : "200ms",
          transitionTimingFunction: phase === "enter" ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "ease-out",
        }}
      >
        {/* Glow */}
        {!isStandard && (
          <div
            className={cn(
              "absolute inset-0 blur-3xl opacity-60",
              isUltra
                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                : "bg-gradient-to-r from-purple-400 to-pink-500",
            )}
            style={{ transform: "scale(2)" }}
          />
        )}

        <span className={cn("relative text-8xl sm:text-9xl", show && isUltra && "animate-pulse")}>{safeEmoji}</span>
      </div>

      {/* Ultra: recipient line */}
      {isUltra && show && recipientName?.trim() && (
        <div className="absolute top-[30%] text-center animate-float" style={{ animationDuration: "2s" }}>
          <p className="text-base sm:text-lg font-medium text-amber-400 drop-shadow-lg">For {recipientName}</p>
        </div>
      )}

      {/* Ultra: light rays */}
      {isUltra && show && (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 h-[200vh] w-1 bg-gradient-to-t from-amber-400/30 to-transparent origin-bottom"
              style={{
                transform: `translateX(-50%) rotate(${i * 45}deg)`,
                animation: "ray-pulse 2s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Local keyframes (kept self-contained) */}
      <style>{`
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
          0%, 100% { opacity: 0.28; }
          50% { opacity: 0.65; }
        }
        .bg-gradient-radial {
          background: radial-gradient(circle at center, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to));
        }
      `}</style>
    </div>
  );
}
