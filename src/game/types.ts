export type Lane = 0 | 1;

export type PowerupKind = 'shield' | 'slow' | 'magnet' | 'double';
export type PickupKind = 'coin' | 'gem' | PowerupKind;

export type GamePhase = 'ready' | 'playing' | 'paused' | 'over';

export type Obstacle = {
  id: number;
  lane: Lane;
  angle: number;
  length: number;
  spin: number;
};

export type Laser = {
  id: number;
  lane: Lane;
  angle: number;
  sweep: number;
  age: number;
  warnDuration: number;
  activeDuration: number;
  fired: boolean;
};

export type Pickup = {
  id: number;
  lane: Lane;
  angle: number;
  kind: PickupKind;
};

export type GameEvent =
  | { type: 'switch' }
  | { type: 'coin' }
  | { type: 'gem' }
  | { type: 'powerup'; kind: PowerupKind }
  | { type: 'shield-break' }
  | { type: 'laser-warn' }
  | { type: 'laser-fire' }
  | { type: 'chain-tier'; multiplier: number }
  | { type: 'hit' };

export type ActiveEffects = Record<PowerupKind, number>;

export type HudSnapshot = {
  phase: GamePhase;
  score: number;
  elapsed: number;
  coins: number;
  gems: number;
  chain: number;
  multiplier: number;
  chainRatio: number;
  effects: ActiveEffects;
  shield: boolean;
  difficulty: number;
};

export type RunSummary = {
  score: number;
  durationSeconds: number;
  coins: number;
  gems: number;
  maxCombo: number;
};
