import type { Challenge, ChallengePeriod } from '@/types/database';

export type RunStats = {
  score: number;
  duration_seconds: number;
  coins: number;
  gems: number;
  max_combo: number;
};

export function periodStart(period: ChallengePeriod, now: Date): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  if (period === 'daily') return new Date(Date.UTC(year, month, day));
  const offsetToMonday = (now.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(year, month, day - offsetToMonday));
}

export function nextPeriodStart(period: ChallengePeriod, now: Date): Date {
  const start = periodStart(period, now);
  const days = period === 'daily' ? 1 : 7;
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

export function challengeProgress(challenge: Challenge, runs: RunStats[]): number {
  switch (challenge.metric) {
    case 'games':
      return runs.length;
    case 'coins':
      return runs.reduce((sum, run) => sum + run.coins + run.gems, 0);
    case 'score':
      return runs.reduce((best, run) => Math.max(best, run.score), 0);
    case 'survival':
      return runs.reduce((best, run) => Math.max(best, run.duration_seconds), 0);
    case 'combo':
      return runs.reduce((best, run) => Math.max(best, run.max_combo), 0);
  }
}

export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}
