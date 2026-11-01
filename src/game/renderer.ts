import { ORB_RADIUS, LANE_RADII, PALETTE, PLANET_RADIUS } from '@/game/config';
import { powerupColor, type OrbitEngine } from '@/game/engine';
import type { Particle } from '@/game/particles';
import type { Laser, Obstacle, Pickup, PowerupKind } from '@/game/types';

export type Star = { x: number; y: number; size: number; phase: number; speed: number };

export type RenderView = { width: number; height: number; time: number };

const POWERUP_GLYPH: Record<PowerupKind, string> = { shield: 'SH', slow: 'SL', magnet: 'MG', double: '2X' };
const ORBIT_MARKERS = 28;

export function createStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: 0.4 + Math.random() * 1.4,
    phase: Math.random() * Math.PI * 2,
    speed: 0.6 + Math.random() * 2.2,
  }));
}

export function renderScene(ctx: CanvasRenderingContext2D, engine: OrbitEngine, stars: Star[], view: RenderView) {
  const { width, height, time } = view;
  const unit = Math.min(width, height) * 0.46;
  const halfWidth = width / 2 / unit;
  const halfHeight = height / 2 / unit;

  drawBackground(ctx, width, height);
  drawStars(ctx, stars, width, height, time);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(unit, unit);

  drawNebula(ctx, halfWidth, halfHeight);
  drawLanes(ctx, time);
  drawPlanet(ctx, time);
  for (const obstacle of engine.obstacles) drawObstacle(ctx, obstacle, time);
  for (const laser of engine.lasers) drawLaser(ctx, laser, time);
  for (const pickup of engine.pickups) drawPickup(ctx, pickup, time);
  drawParticles(ctx, engine.particles.particles);
  drawPlayer(ctx, engine, time);

  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, '#0a0f24');
  base.addColorStop(1, '#03040a');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.6);
  glow.addColorStop(0, 'rgba(61, 123, 255, 0.16)');
  glow.addColorStop(1, 'rgba(61, 123, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], width: number, height: number, time: number) {
  for (const star of stars) {
    const alpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
    const drift = (star.y + time * 0.004 * star.speed) % 1;
    ctx.fillStyle = `rgba(220, 235, 255, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(star.x * width, drift * height, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNebula(ctx: CanvasRenderingContext2D, halfWidth: number, halfHeight: number) {
  const gradient = ctx.createRadialGradient(0, 0, 0.2, 0, 0, 1.25);
  gradient.addColorStop(0, 'rgba(178, 107, 255, 0.14)');
  gradient.addColorStop(0.55, 'rgba(61, 123, 255, 0.06)');
  gradient.addColorStop(1, 'rgba(61, 123, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
}

function drawLanes(ctx: CanvasRenderingContext2D, time: number) {
  LANE_RADII.forEach((radius, lane) => {
    const color = lane === 0 ? PALETTE.cyan : PALETTE.violet;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 0.004;
    ctx.setLineDash([0.018, 0.03]);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < ORBIT_MARKERS; i++) {
      const angle = (i / ORBIT_MARKERS) * Math.PI * 2 + time * (lane === 0 ? 0.12 : -0.08);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.0045, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawPlanet(ctx: CanvasRenderingContext2D, time: number) {
  const atmosphere = ctx.createRadialGradient(0, 0, PLANET_RADIUS * 0.9, 0, 0, PLANET_RADIUS * 1.9);
  atmosphere.addColorStop(0, 'rgba(56, 241, 255, 0.32)');
  atmosphere.addColorStop(1, 'rgba(56, 241, 255, 0)');
  ctx.fillStyle = atmosphere;
  ctx.beginPath();
  ctx.arc(0, 0, PLANET_RADIUS * 1.9, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createRadialGradient(-0.07, -0.08, 0.02, 0, 0, PLANET_RADIUS);
  body.addColorStop(0, '#8fe6ff');
  body.addColorStop(0.45, '#2a5bd7');
  body.addColorStop(1, '#070a16');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, PLANET_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, PLANET_RADIUS, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 0.006;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, PLANET_RADIUS * (0.35 + i * 0.2), PLANET_RADIUS * 0.22, time * 0.08 * i, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 200, 87, 0.55)';
  ctx.lineWidth = 0.009;
  ctx.shadowColor = PALETTE.amber;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(0, 0, PLANET_RADIUS * 1.55, PLANET_RADIUS * 0.4, -0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, obstacle: Obstacle, time: number) {
  const radius = LANE_RADII[obstacle.lane];
  const pulse = 0.85 + 0.15 * Math.sin(time * 6 + obstacle.id);
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = PALETTE.rose;
  ctx.globalAlpha = pulse;
  ctx.lineWidth = 0.034;
  ctx.shadowColor = PALETTE.rose;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(0, 0, radius, obstacle.angle, obstacle.angle + obstacle.length);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 0.007;
  ctx.beginPath();
  ctx.arc(0, 0, radius, obstacle.angle, obstacle.angle + obstacle.length);
  ctx.stroke();
  ctx.restore();
}

function drawLaser(ctx: CanvasRenderingContext2D, laser: Laser, time: number) {
  const radius = LANE_RADII[laser.lane] + 0.05;
  const start = PLANET_RADIUS * 1.05;
  const x0 = Math.cos(laser.angle) * start;
  const y0 = Math.sin(laser.angle) * start;
  const x1 = Math.cos(laser.angle) * radius;
  const y1 = Math.sin(laser.angle) * radius;
  const color = laser.lane === 0 ? PALETTE.cyan : PALETTE.violet;

  ctx.save();
  if (laser.age < laser.warnDuration) {
    const blink = 0.35 + 0.4 * Math.abs(Math.sin(time * 14));
    ctx.strokeStyle = color;
    ctx.globalAlpha = blink;
    ctx.lineWidth = 0.006;
    ctx.setLineDash([0.02, 0.025]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(x1, y1, 0.018, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const remaining = Math.max(0, 1 - (laser.age - laser.warnDuration) / laser.activeDuration);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  ctx.globalAlpha = 0.5 + 0.5 * remaining;
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.shadowBlur = 0;
  ctx.lineWidth = 0.009;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup, time: number) {
  const radius = LANE_RADII[pickup.lane];
  const x = Math.cos(pickup.angle) * radius;
  const y = Math.sin(pickup.angle) * radius;
  ctx.save();
  ctx.translate(x, y);

  if (pickup.kind === 'coin') {
    const spin = Math.abs(Math.cos(time * 4 + pickup.id));
    ctx.shadowColor = PALETTE.amber;
    ctx.shadowBlur = 12;
    ctx.scale(Math.max(0.2, spin), 1);
    const gradient = ctx.createRadialGradient(-0.006, -0.006, 0.002, 0, 0, 0.026);
    gradient.addColorStop(0, '#fff5d6');
    gradient.addColorStop(0.5, PALETTE.amber);
    gradient.addColorStop(1, '#b7791f');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 0.024, 0, Math.PI * 2);
    ctx.fill();
  } else if (pickup.kind === 'gem') {
    const pulse = 1 + 0.08 * Math.sin(time * 6 + pickup.id);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = PALETTE.mint;
    ctx.shadowBlur = 16;
    const gradient = ctx.createLinearGradient(0, -0.03, 0, 0.03);
    gradient.addColorStop(0, PALETTE.mint);
    gradient.addColorStop(1, PALETTE.violet);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -0.032);
    ctx.lineTo(0.026, 0);
    ctx.lineTo(0, 0.032);
    ctx.lineTo(-0.026, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    const color = powerupColor(pickup.kind);
    const pulse = 1 + 0.08 * Math.sin(time * 5 + pickup.id);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(7, 10, 22, 0.92)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.009;
    ctx.beginPath();
    ctx.arc(0, 0, 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = '600 0.03px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(POWERUP_GLYPH[pickup.kind], 0, 0.002);
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const particle of particles) {
    const fade = particle.life / particle.maxLife;
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = particle.color;
    ctx.strokeStyle = particle.color;
    if (particle.kind === 'ring') {
      ctx.lineWidth = 0.008 * fade + 0.002;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (particle.kind === 'trail' ? fade : 1), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, engine: OrbitEngine, time: number) {
  const { x, y } = engine.orbPosition();
  const color = engine.player.lane === 0 ? PALETTE.cyan : PALETTE.violet;

  ctx.save();
  const halo = ctx.createRadialGradient(x, y, 0, x, y, 0.11);
  halo.addColorStop(0, 'rgba(56, 241, 255, 0.45)');
  halo.addColorStop(1, 'rgba(56, 241, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, 0.11, 0, Math.PI * 2);
  ctx.fill();

  if (engine.effects.magnet > 0) {
    ctx.strokeStyle = PALETTE.amber;
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(time * 10);
    ctx.lineWidth = 0.004;
    ctx.setLineDash([0.02, 0.03]);
    ctx.beginPath();
    ctx.arc(x, y, 0.13, time, time + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  if (engine.effects.double > 0) {
    ctx.strokeStyle = PALETTE.mint;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 0.005;
    ctx.beginPath();
    ctx.arc(x, y, 0.075, -time * 2, -time * 2 + Math.PI * 1.2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const core = ctx.createRadialGradient(x - 0.01, y - 0.01, 0.002, x, y, ORB_RADIUS * 1.6);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.35, color);
  core.addColorStop(1, 'rgba(56, 241, 255, 0.1)');
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, ORB_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  if (engine.effects.shield > 0) {
    const blinking = engine.effects.shield < 3 && Math.floor(time * 8) % 2 === 0;
    if (!blinking) {
      ctx.strokeStyle = PALETTE.cyan;
      ctx.lineWidth = 0.007;
      ctx.shadowBlur = 16;
      ctx.setLineDash([0.04, 0.03]);
      ctx.lineDashOffset = -time * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, ORB_RADIUS * 2.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}
