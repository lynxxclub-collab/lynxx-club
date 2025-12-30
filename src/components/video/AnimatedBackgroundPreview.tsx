import { useEffect, useRef } from 'react';
import { AnimationType, ANIMATION_PRESETS } from '@/lib/animatedBackgrounds';

interface AnimatedBackgroundPreviewProps {
  type: AnimationType;
  size?: number;
}

export default function AnimatedBackgroundPreview({ type, size = 48 }: AnimatedBackgroundPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const preset = ANIMATION_PRESETS[type];
    const colors = preset.colors;

    // Simple mini animation loop
    const animate = () => {
      const time = performance.now() - startTimeRef.current;
      
      switch (type) {
        case 'particles':
          renderMiniParticles(ctx, size, time, colors);
          break;
        case 'bokeh':
          renderMiniBokeh(ctx, size, time, colors);
          break;
        case 'aurora':
          renderMiniAurora(ctx, size, time, colors);
          break;
        case 'gradient':
          renderMiniGradient(ctx, size, time, colors);
          break;
        case 'rain':
          renderMiniRain(ctx, size, time, colors);
          break;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [type, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="w-full h-full"
    />
  );
}

function renderMiniParticles(ctx: CanvasRenderingContext2D, size: number, time: number, colors: string[]) {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, size, size);

  // Draw a few simple particles
  for (let i = 0; i < 5; i++) {
    const x = (size * 0.2 + i * size * 0.15 + Math.sin(time / 500 + i) * 3) % size;
    const y = (size * 0.3 + i * size * 0.1 + Math.cos(time / 600 + i) * 3) % size;
    
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.7;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function renderMiniBokeh(ctx: CanvasRenderingContext2D, size: number, time: number, colors: string[]) {
  ctx.fillStyle = '#16213e';
  ctx.fillRect(0, 0, size, size);

  // Draw a few bokeh circles
  for (let i = 0; i < 3; i++) {
    const x = size * 0.3 + i * size * 0.2;
    const y = (size * 0.5 + Math.sin(time / 800 + i) * size * 0.2) % size;
    const radius = 8 + i * 3;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colors[i % colors.length] + '80');
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

function renderMiniAurora(ctx: CanvasRenderingContext2D, size: number, time: number, colors: string[]) {
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, size, size);

  const t = time / 1000;
  
  ctx.beginPath();
  ctx.moveTo(0, size);
  for (let x = 0; x <= size; x += 2) {
    const y = size * 0.4 + Math.sin(x / 10 + t) * 5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(size, size);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, colors[0] + '60');
  gradient.addColorStop(1, colors[1] + '30');
  ctx.fillStyle = gradient;
  ctx.fill();
}

function renderMiniGradient(ctx: CanvasRenderingContext2D, size: number, time: number, colors: string[]) {
  const t = time / 2000;
  const x1 = size * (0.3 + Math.sin(t) * 0.2);
  const y1 = size * (0.3 + Math.cos(t) * 0.2);

  const gradient = ctx.createLinearGradient(x1, y1, size - x1, size - y1);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.5, colors[1]);
  gradient.addColorStop(1, colors[2]);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}

function renderMiniRain(ctx: CanvasRenderingContext2D, size: number, time: number, colors: string[]) {
  ctx.fillStyle = '#1e272e';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = colors[0];
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;

  for (let i = 0; i < 5; i++) {
    const x = size * 0.1 + i * size * 0.2;
    const y = ((time / 10 + i * 20) % (size + 10)) - 5;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 1, y + 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
