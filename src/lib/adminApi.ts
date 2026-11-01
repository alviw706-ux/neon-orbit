import { callFunction } from '@/lib/edgeFunctions';
import type { Achievement, AvatarKey, Challenge, LeaderboardEntry, Profile } from '@/types/database';

export type AdminStats = {
  players: number;
  runs: number;
  runsToday: number;
  activeChallenges: number;
  bannedPlayers: number;
  highestScore: number;
  coinsInCirculation: number;
};

export type AdminUser = Pick<Profile, 'id' | 'username' | 'avatar_key' | 'role' | 'xp' | 'coins' | 'is_banned' | 'created_at'>;

export type AdminChallenge = Challenge;
export type AdminAchievement = Achievement;

export type ActivityRun = {
  id: string;
  user_id: string;
  username: string;
  score: number;
  duration_seconds: number;
  coins: number;
  gems: number;
  max_combo: number;
  created_at: string;
};

export type ActivityLedger = {
  id: string;
  user_id: string;
  username: string;
  amount: number;
  reason: string;
  created_at: string;
};

export type AdminLeaderboardEntry = LeaderboardEntry & { avatar_key: AvatarKey };

export function adminCall<T>(action: string, body: Record<string, unknown>): Promise<T> {
  return callFunction<T>('admin-api', { action, ...body });
}
