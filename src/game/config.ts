export const LANE_RADII: readonly [number, number] = [0.46, 0.74];
export const PLANET_RADIUS = 0.22;
export const ORB_RADIUS = 0.036;
export const ARENA_RADIUS = 1;

export const GRACE_SECONDS = 2.5;
export const SURVIVAL_POINTS_PER_SECOND = 10;
export const COIN_POINTS = 5;
export const GEM_POINTS = 25;
export const MAX_MULTIPLIER = 5;
export const CHAIN_WINDOW_SECONDS = 2.8;
export const SWITCH_LERP_RATE = 13;
export const LASER_WARN_SECONDS = 1.1;
export const LASER_ACTIVE_SECONDS = 0.85;

export const POWERUP_DURATION_SECONDS: Record<'shield' | 'slow' | 'magnet' | 'double', number> = {
  shield: 25,
  slow: 5,
  magnet: 7,
  double: 8,
};

export const PALETTE = {
  cyan: '#38f1ff',
  blue: '#3d7bff',
  violet: '#b26bff',
  mint: '#52ffb0',
  amber: '#ffc857',
  rose: '#ff5c8a',
};
