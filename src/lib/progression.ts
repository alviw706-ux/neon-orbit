export const LEVEL_BASE_XP = 250;

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / LEVEL_BASE_XP)) + 1;
}

export function xpAtLevelStart(level: number): number {
  return LEVEL_BASE_XP * (level - 1) ** 2;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const start = xpAtLevelStart(level);
  const end = xpAtLevelStart(level + 1);
  const current = xp - start;
  const needed = end - start;
  return { level, current, needed, ratio: Math.min(1, current / needed) };
}
