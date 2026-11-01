export type Particle = {
  kind: 'spark' | 'ring' | 'trail';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  growth: number;
  color: string;
};

export class ParticleSystem {
  particles: Particle[] = [];
  density: number;

  constructor(density: number) {
    this.density = density;
  }

  private add(particle: Particle) {
    if (this.particles.length > 420) this.particles.shift();
    this.particles.push(particle);
  }

  burst(x: number, y: number, color: string, count: number, speed: number) {
    const total = Math.max(1, Math.round(count * this.density));
    for (let i = 0; i < total; i++) {
      const angle = Math.random() * Math.PI * 2;
      const magnitude = speed * (0.35 + Math.random() * 0.65);
      const life = 0.45 + Math.random() * 0.4;
      this.add({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(angle) * magnitude,
        vy: Math.sin(angle) * magnitude,
        life,
        maxLife: life,
        size: 0.006 + Math.random() * 0.01,
        growth: 0,
        color,
      });
    }
  }

  ring(x: number, y: number, color: string, maxRadius: number, life: number) {
    const startRadius = 0.02;
    this.add({
      kind: 'ring',
      x,
      y,
      vx: 0,
      vy: 0,
      life,
      maxLife: life,
      size: startRadius,
      growth: (maxRadius - startRadius) / life,
      color,
    });
  }

  trail(x: number, y: number, color: string) {
    if (Math.random() > this.density) return;
    const life = 0.35;
    this.add({ kind: 'trail', x, y, vx: 0, vy: 0, life, maxLife: life, size: 0.02, growth: 0, color });
  }

  step(dt: number) {
    const alive: Particle[] = [];
    for (const particle of this.particles) {
      particle.life -= dt;
      if (particle.life <= 0) continue;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.94;
      particle.vy *= 0.94;
      particle.size += particle.growth * dt;
      alive.push(particle);
    }
    this.particles = alive;
  }
}
