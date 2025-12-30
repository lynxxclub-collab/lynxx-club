export type AnimationType = 'particles' | 'bokeh' | 'aurora' | 'gradient' | 'rain';

export interface AnimationState {
  frameCount: number;
  time: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface BokehCircle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  speed: number;
}

interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
}

export const ANIMATION_PRESETS: Record<AnimationType, { name: string; icon: string; colors: string[] }> = {
  particles: { name: 'Particles', icon: '✨', colors: ['#ffffff', '#e0e0e0', '#c0c0c0'] },
  bokeh: { name: 'Bokeh', icon: '🔵', colors: ['#ff9f43', '#ee5a24', '#0abde3', '#00d2d3'] },
  aurora: { name: 'Aurora', icon: '🌌', colors: ['#00d9ff', '#00ff87', '#ff00ff', '#7c3aed'] },
  gradient: { name: 'Gradient', icon: '🎨', colors: ['#667eea', '#764ba2', '#f093fb'] },
  rain: { name: 'Rain', icon: '🌧️', colors: ['#88c0d0', '#81a1c1'] },
};

// Particle system state
let particles: Particle[] = [];
let bokehCircles: BokehCircle[] = [];
let rainDrops: RainDrop[] = [];
let initialized = false;
let lastAnimationType: AnimationType | null = null;

function initParticles(width: number, height: number, count: number = 50): void {
  const colors = ANIMATION_PRESETS.particles.colors;
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    size: Math.random() * 3 + 1,
    opacity: Math.random() * 0.5 + 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

function initBokeh(width: number, height: number, count: number = 15): void {
  const colors = ANIMATION_PRESETS.bokeh.colors;
  bokehCircles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 60 + 20,
    opacity: Math.random() * 0.3 + 0.1,
    color: colors[Math.floor(Math.random() * colors.length)],
    speed: Math.random() * 0.3 + 0.1,
  }));
}

function initRain(width: number, height: number, count: number = 100): void {
  rainDrops = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    length: Math.random() * 15 + 10,
    speed: Math.random() * 4 + 3,
    opacity: Math.random() * 0.3 + 0.2,
  }));
}

export function renderAnimatedBackground(
  ctx: CanvasRenderingContext2D,
  type: AnimationType,
  state: AnimationState,
  width: number,
  height: number
): void {
  // Initialize or reinitialize if type changed
  if (!initialized || lastAnimationType !== type) {
    switch (type) {
      case 'particles':
        initParticles(width, height);
        break;
      case 'bokeh':
        initBokeh(width, height);
        break;
      case 'rain':
        initRain(width, height);
        break;
    }
    initialized = true;
    lastAnimationType = type;
  }

  switch (type) {
    case 'particles':
      renderParticles(ctx, width, height);
      break;
    case 'bokeh':
      renderBokeh(ctx, width, height, state);
      break;
    case 'aurora':
      renderAurora(ctx, width, height, state);
      break;
    case 'gradient':
      renderGradient(ctx, width, height, state);
      break;
    case 'rain':
      renderRain(ctx, width, height);
      break;
  }
}

function renderParticles(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Dark background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  particles.forEach(p => {
    // Update position
    p.x += p.vx;
    p.y += p.vy;

    // Wrap around
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    // Draw particle with glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.opacity;
    ctx.fill();
    
    // Add glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = p.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  
  ctx.globalAlpha = 1;
}

function renderBokeh(ctx: CanvasRenderingContext2D, width: number, height: number, state: AnimationState): void {
  // Dark gradient background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#1a1a2e');
  bgGradient.addColorStop(1, '#16213e');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  bokehCircles.forEach(circle => {
    // Gentle floating motion
    circle.y -= circle.speed;
    circle.x += Math.sin(state.time / 1000 + circle.x) * 0.2;

    // Reset when off screen
    if (circle.y + circle.size < 0) {
      circle.y = height + circle.size;
      circle.x = Math.random() * width;
    }

    // Draw bokeh circle
    const gradient = ctx.createRadialGradient(
      circle.x, circle.y, 0,
      circle.x, circle.y, circle.size
    );
    gradient.addColorStop(0, circle.color);
    gradient.addColorStop(0.5, circle.color + '80');
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = circle.opacity;
    ctx.fill();
  });

  ctx.globalAlpha = 1;
}

function renderAurora(ctx: CanvasRenderingContext2D, width: number, height: number, state: AnimationState): void {
  // Dark sky background
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, width, height);

  const colors = ANIMATION_PRESETS.aurora.colors;
  const time = state.time / 2000;

  // Draw multiple aurora waves
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let x = 0; x <= width; x += 5) {
      const wave1 = Math.sin(x / 100 + time + layer) * 30;
      const wave2 = Math.sin(x / 50 + time * 1.5 + layer) * 20;
      const y = height * 0.4 + wave1 + wave2 + layer * 40;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(width, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, height * 0.3, 0, height);
    gradient.addColorStop(0, colors[layer % colors.length] + '60');
    gradient.addColorStop(0.5, colors[(layer + 1) % colors.length] + '30');
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

function renderGradient(ctx: CanvasRenderingContext2D, width: number, height: number, state: AnimationState): void {
  const colors = ANIMATION_PRESETS.gradient.colors;
  const time = state.time / 3000;

  // Animated gradient positions
  const x1 = width * (0.3 + Math.sin(time) * 0.2);
  const y1 = height * (0.3 + Math.cos(time * 0.8) * 0.2);
  const x2 = width * (0.7 + Math.sin(time + 2) * 0.2);
  const y2 = height * (0.7 + Math.cos(time * 0.8 + 2) * 0.2);

  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.5, colors[1]);
  gradient.addColorStop(1, colors[2]);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function renderRain(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Dark stormy background
  ctx.fillStyle = '#1e272e';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = ANIMATION_PRESETS.rain.colors[0];
  ctx.lineWidth = 1;

  rainDrops.forEach(drop => {
    // Update position
    drop.y += drop.speed;
    drop.x += 0.5; // Slight angle

    // Reset when off screen
    if (drop.y > height) {
      drop.y = -drop.length;
      drop.x = Math.random() * width;
    }

    // Draw raindrop
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x + 1, drop.y + drop.length);
    ctx.globalAlpha = drop.opacity;
    ctx.stroke();
  });

  ctx.globalAlpha = 1;
}

// Reset animation state (call when switching effects)
export function resetAnimationState(): void {
  initialized = false;
  lastAnimationType = null;
  particles = [];
  bokehCircles = [];
  rainDrops = [];
}
