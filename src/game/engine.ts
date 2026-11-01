import {
  CHAIN_WINDOW_SECONDS,
  COIN_POINTS,
  GEM_POINTS,
  GRACE_SECONDS,
  LANE_RADII,
  LASER_ACTIVE_SECONDS,
  LASER_WARN_SECONDS,
  MAX_MULTIPLIER,
  ORB_RADIUS,
  POWERUP_DURATION_SECONDS,
  PALETTE,
  PROTECTION_MILESTONE_POINTS,
  SURVIVAL_POINTS_PER_SECOND,
  SWITCH_LERP_RATE,
} from '@/game/config';
import { clamp, lerp, pickWeighted, randomBetween, wrapAngle } from '@/game/math';
import { ParticleSystem } from '@/game/particles';
import type {
  ActiveEffects,
  GameEvent,
  GamePhase,
  HudSnapshot,
  Laser,
  Lane,
  Obstacle,
  Pickup,
  PowerupKind,
  RunSummary,
} from '@/game/types';

export class OrbitEngine {
  phase: GamePhase = 'ready';
  elapsed = 0;
  score = 0;
  coins = 0;
  gems = 0;
  chain = 0;
  maxChain = 0;
  player = { angle: 0, lane: 0 as Lane, visualRadius: LANE_RADII[0], speed: 1.5 };
  obstacles: Obstacle[] = [];
  lasers: Laser[] = [];
  pickups: Pickup[] = [];
  effects: ActiveEffects = { shield: 0, slow: 0, magnet: 0, double: 0, protection: 0 };
  readonly particles: ParticleSystem;

  private events: GameEvent[] = [];
  private nextId = 1;
  private chainTimer = 0;
  private lastMultiplier = 1;
  private timers = { obstacle: 0, laser: 20, coin: 0, powerup: 8 };
  private protectionMilestone = 0;

  constructor(particleDensity = 1) {
    this.particles = new ParticleSystem(particleDensity);
  }

  start() {
    if (this.phase === 'ready') this.phase = 'playing';
  }

  pause() {
    if (this.phase === 'playing') this.phase = 'paused';
  }

  resume() {
    if (this.phase === 'paused') this.phase = 'playing';
  }

  switchLane() {
    if (this.phase !== 'playing') return;
    this.player.lane = this.player.lane === 0 ? 1 : 0;
    this.events.push({ type: 'switch' });
    const { x, y } = this.orbPosition();
    this.particles.burst(x, y, PALETTE.cyan, 10, 0.3);
  }

  drainEvents(): GameEvent[] {
    const pending = this.events;
    this.events = [];
    return pending;
  }

  multiplier(): number {
    return Math.min(MAX_MULTIPLIER, 1 + Math.floor(this.chain / 5));
  }

  orbPosition(): { x: number; y: number } {
    const { angle, visualRadius } = this.player;
    return { x: Math.cos(angle) * visualRadius, y: Math.sin(angle) * visualRadius };
  }

  step(dt: number) {
    if (this.phase === 'paused') return;
    if (this.phase === 'over') {
      this.particles.step(dt);
      return;
    }

    this.elapsed += dt;
    const difficulty = clamp(this.elapsed / 150, 0, 1);
    const hazardDt = dt * (this.effects.slow > 0 ? 0.55 : 1);

    this.tickEffects(dt);
    this.updatePlayer(dt);
    this.updateChain(dt);
    this.moveHazards(hazardDt);
    this.collectPickups();
    this.checkCollisions();
    if (this.phase !== 'playing') {
      this.particles.step(dt);
      return;
    }
    this.spawn(dt, difficulty);
    this.cull();

    const boost = this.effects.double > 0 ? 2 : 1;
    this.score += SURVIVAL_POINTS_PER_SECOND * this.multiplier() * boost * dt;
    this.spawnProtectionMilestones();
    this.particles.step(dt);
  }

  snapshot(): HudSnapshot {
    return {
      phase: this.phase,
      score: Math.floor(this.score),
      elapsed: this.elapsed,
      coins: this.coins,
      gems: this.gems,
      chain: this.chain,
      multiplier: this.multiplier(),
      chainRatio: this.chain > 0 ? clamp(this.chainTimer / CHAIN_WINDOW_SECONDS, 0, 1) : 0,
      effects: { ...this.effects },
      shield: this.effects.shield > 0,
      difficulty: clamp(this.elapsed / 150, 0, 1),
    };
  }

  summary(): RunSummary {
    return {
      score: Math.floor(this.score),
      durationSeconds: Math.floor(this.elapsed),
      coins: this.coins,
      gems: this.gems,
      maxCombo: this.maxChain,
    };
  }

  private tickEffects(dt: number) {
    for (const key of Object.keys(this.effects) as PowerupKind[]) {
      this.effects[key] = Math.max(0, this.effects[key] - dt);
    }
  }

  private updatePlayer(dt: number) {
    const { player } = this;
    player.speed = 1.5 + 1.5 * clamp(this.elapsed / 120, 0, 1);
    player.angle = wrapAngle(player.angle + player.speed * dt);
    player.visualRadius = lerp(
      player.visualRadius,
      LANE_RADII[player.lane],
      1 - Math.exp(-SWITCH_LERP_RATE * dt),
    );
    const { x, y } = this.orbPosition();
    this.particles.trail(x, y, player.lane === 0 ? PALETTE.cyan : PALETTE.violet);
  }

  private updateChain(dt: number) {
    if (this.chain === 0) return;
    this.chainTimer -= dt;
    if (this.chainTimer <= 0) {
      this.chain = 0;
      this.lastMultiplier = 1;
    }
  }

  private moveHazards(dt: number) {
    for (const obstacle of this.obstacles) {
      obstacle.angle = wrapAngle(obstacle.angle + obstacle.spin * dt);
    }
    for (const laser of this.lasers) {
      laser.age += dt;
      if (laser.age >= laser.warnDuration && laser.age < laser.warnDuration + laser.activeDuration) {
        if (!laser.fired) {
          laser.fired = true;
          this.events.push({ type: 'laser-fire' });
        }
        laser.angle = wrapAngle(laser.angle + laser.sweep * dt);
      }
    }
  }

  private collectPickups() {
    const magnetOn = this.effects.magnet > 0;
    const boost = this.effects.double > 0 ? 2 : 1;
    this.pickups = this.pickups.filter((pickup) => {
      if (!magnetOn && pickup.lane !== this.player.lane) return true;
      const window = magnetOn ? 0.55 : 0.14;
      if (Math.abs(wrapAngle(pickup.angle - this.player.angle)) > window) return true;
      this.collect(pickup, boost);
      return false;
    });
  }

  private collect(pickup: Pickup, boost: number) {
    const { x, y } = this.orbPosition();
    if (pickup.kind === 'coin' || pickup.kind === 'gem') {
      this.chain += 1;
      this.chainTimer = CHAIN_WINDOW_SECONDS;
      this.maxChain = Math.max(this.maxChain, this.chain);
      const multiplier = this.multiplier();
      if (multiplier > this.lastMultiplier) {
        this.lastMultiplier = multiplier;
        this.events.push({ type: 'chain-tier', multiplier });
      }
      if (pickup.kind === 'coin') {
        this.coins += 1;
        this.score += COIN_POINTS * multiplier * boost;
        this.events.push({ type: 'coin' });
        this.particles.burst(x, y, PALETTE.amber, 12, 0.45);
      } else {
        this.gems += 1;
        this.score += GEM_POINTS * multiplier * boost;
        this.events.push({ type: 'gem' });
        this.particles.burst(x, y, PALETTE.mint, 20, 0.6);
        this.particles.ring(x, y, PALETTE.mint, 0.1, 0.4);
      }
      return;
    }

    const alreadyProtected = pickup.kind === 'protection' && this.effects.protection > 0;
    if (!alreadyProtected) this.effects[pickup.kind] = POWERUP_DURATION_SECONDS[pickup.kind];
    this.events.push({ type: 'powerup', kind: pickup.kind });
    this.particles.ring(x, y, powerupColor(pickup.kind), 0.16, 0.5);
    this.particles.burst(x, y, powerupColor(pickup.kind), 18, 0.55);
  }

  private checkCollisions() {
    const lane = this.player.lane;
    const angle = this.player.angle;
    const margin = ORB_RADIUS / LANE_RADII[lane] + 0.02;

    const hitObstacle = this.obstacles.find((obstacle) => {
      if (obstacle.lane !== lane) return false;
      const relative = wrapAngle(angle - obstacle.angle);
      return relative >= -margin && relative <= obstacle.length + margin;
    });
    if (hitObstacle) this.registerHit(hitObstacle.id, 'obstacle');

    const hitLaser = this.lasers.find((laser) => {
      if (laser.lane !== lane || laser.age < laser.warnDuration) return false;
      if (laser.age >= laser.warnDuration + laser.activeDuration) return false;
      return Math.abs(wrapAngle(angle - laser.angle)) <= margin + 0.03;
    });
    if (hitLaser && this.phase === 'playing') this.registerHit(hitLaser.id, 'laser');
  }

  private registerHit(id: number, kind: 'obstacle' | 'laser') {
    const { x, y } = this.orbPosition();
    if (this.effects.protection > 0) {
      this.removeHazard(id, kind);
      this.particles.ring(x, y, PALETTE.ice, 0.3, 0.6);
      return;
    }
    if (this.effects.shield > 0) {
      this.effects.shield = 0;
      this.removeHazard(id, kind);
      this.events.push({ type: 'shield-break' });
      this.particles.ring(x, y, PALETTE.cyan, 0.28, 0.6);
      this.particles.burst(x, y, PALETTE.cyan, 30, 0.8);
      return;
    }
    this.phase = 'over';
    this.events.push({ type: 'hit' });
    this.particles.burst(x, y, PALETTE.rose, 56, 1);
    this.particles.ring(x, y, PALETTE.rose, 0.45, 0.8);
    this.particles.ring(x, y, PALETTE.amber, 0.3, 0.6);
  }

  private removeHazard(id: number, kind: 'obstacle' | 'laser') {
    if (kind === 'obstacle') this.obstacles = this.obstacles.filter((item) => item.id !== id);
    else this.lasers = this.lasers.filter((item) => item.id !== id);
  }

  private spawn(dt: number, difficulty: number) {
    if (this.elapsed < GRACE_SECONDS) return;
    const t = this.timers;

    t.obstacle -= dt;
    if (t.obstacle <= 0) {
      this.spawnObstacle(difficulty);
      t.obstacle = lerp(1.9, 0.75, difficulty) * randomBetween(0.85, 1.15);
    }

    t.laser -= dt;
    if (t.laser <= 0) {
      this.spawnLaser(difficulty);
      t.laser = lerp(7, 3.4, difficulty) * randomBetween(0.85, 1.2);
    }

    t.coin -= dt;
    if (t.coin <= 0) {
      this.spawnCoinTrail(difficulty);
      t.coin = randomBetween(2.15, 3.7);
    }

    t.powerup -= dt;
    if (t.powerup <= 0) {
      this.spawnPowerup();
      t.powerup = randomBetween(11, 16);
    }
  }

  private spawnObstacle(difficulty: number) {
    const lane = randomLane();
    const length = randomBetween(0.42, 0.7 + 0.4 * difficulty);
    const angle = wrapAngle(this.player.angle + randomBetween(2.1, 3.3));
    if (this.overlapsLane(lane, angle, length, 0.25)) return;
    if (this.overlapsLane(lane === 0 ? 1 : 0, angle, length, 0)) return;

    const moving = Math.random() < 0.25 + 0.45 * difficulty;
    const speed = randomBetween(0.3, 0.55 + 0.45 * difficulty);
    const spin = moving ? (Math.random() < 0.5 ? -1 : 1) * speed : 0;
    this.obstacles.push({ id: this.nextId++, lane, angle, length, spin });
  }

  private spawnLaser(difficulty: number) {
    const lane = randomLane();
    const angle = wrapAngle(this.player.angle + randomBetween(2.6, 3.6));
    const sweep = (Math.random() < 0.5 ? -1 : 1) * randomBetween(0.6, 0.9 + 0.6 * difficulty);
    this.lasers.push({
      id: this.nextId++,
      lane,
      angle,
      sweep,
      age: 0,
      warnDuration: LASER_WARN_SECONDS,
      activeDuration: LASER_ACTIVE_SECONDS + 0.3 * difficulty,
      fired: false,
    });
    this.events.push({ type: 'laser-warn' });
  }

  private spawnCoinTrail(difficulty: number) {
    const lane = randomLane();
    const start = this.player.angle + randomBetween(2, 3);
    const count = 4 + Math.floor(Math.random() * 4);
    const includeGem = Math.random() < 0.12 + 0.1 * difficulty;
    for (let index = 0; index < count; index++) {
      const angle = wrapAngle(start + index * 0.2);
      if (this.overlapsLane(lane, angle, 0, 0.12)) continue;
      const kind = includeGem && index === count - 1 ? 'gem' : 'coin';
      this.pickups.push({ id: this.nextId++, lane, angle, kind });
    }
  }

  private spawnPowerup() {
    const lane = randomLane();
    const angle = wrapAngle(this.player.angle + randomBetween(2.4, 3.4));
    if (this.overlapsLane(lane, angle, 0, 0.15)) return;
    const kind = pickWeighted<Exclude<PowerupKind, 'protection'>>({ shield: 28, slow: 24, magnet: 24, double: 24 });
    this.pickups.push({ id: this.nextId++, lane, angle, kind });
  }

  private spawnProtectionMilestones() {
    const milestone = Math.floor(this.score / PROTECTION_MILESTONE_POINTS);
    while (this.protectionMilestone < milestone) {
      this.protectionMilestone += 1;
      this.spawnProtection();
    }
  }

  private spawnProtection() {
    let angle = 0;
    let lane: Lane = 0;
    for (let attempt = 0; attempt < 6; attempt++) {
      lane = randomLane();
      angle = wrapAngle(this.player.angle + randomBetween(2.4, 2.9));
      if (!this.overlapsLane(lane, angle, 0, 0.15)) break;
    }
    this.pickups.push({ id: this.nextId++, lane, angle, kind: 'protection' });
  }

  private overlapsLane(lane: Lane, angle: number, length: number, pad: number): boolean {
    return this.obstacles.some((obstacle) => {
      if (obstacle.lane !== lane) return false;
      const offset = wrapAngle(obstacle.angle - angle);
      return offset >= -pad - obstacle.length && offset <= length + pad;
    });
  }

  private cull() {
    const playerAngle = this.player.angle;
    this.obstacles = this.obstacles.filter(
      (obstacle) => wrapAngle(obstacle.angle + obstacle.length - playerAngle) > -0.6,
    );
    this.lasers = this.lasers.filter((laser) => laser.age < laser.warnDuration + laser.activeDuration);
    this.pickups = this.pickups.filter((pickup) => wrapAngle(pickup.angle - playerAngle) > -0.4);
  }
}

function randomLane(): Lane {
  return Math.random() < 0.5 ? 0 : 1;
}

export function powerupColor(kind: PowerupKind): string {
  switch (kind) {
    case 'shield':
      return PALETTE.cyan;
    case 'slow':
      return PALETTE.violet;
    case 'magnet':
      return PALETTE.amber;
    case 'double':
      return PALETTE.mint;
    case 'protection':
      return PALETTE.ice;
  }
}
