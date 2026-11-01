export const AVATAR_KEYS = ['nova', 'pulse', 'comet', 'helix', 'quasar', 'drift', 'ion', 'vega'] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

export type Profile = {
  id: string;
  username: string;
  avatar_key: AvatarKey;
  role: 'player' | 'admin';
  xp: number;
  coins: number;
  is_banned: boolean;
  created_at: string;
};

export type GameRun = {
  id: string;
  user_id: string;
  score: number;
  duration_seconds: number;
  coins: number;
  gems: number;
  max_combo: number;
  xp_earned: number;
  created_at: string;
};

export type AchievementMetric = 'total_games' | 'best_score' | 'lifetime_coins' | 'best_combo' | 'best_survival';
export type ChallengeMetric = 'games' | 'coins' | 'score' | 'survival' | 'combo';
export type ChallengePeriod = 'daily' | 'weekly';

export type Achievement = {
  key: string;
  title: string;
  description: string;
  icon: string;
  metric: AchievementMetric;
  threshold: number;
  xp_reward: number;
  coin_reward: number;
  is_active: boolean;
};

export type Challenge = {
  id: string;
  title: string;
  description: string;
  metric: ChallengeMetric;
  period: ChallengePeriod;
  target: number;
  xp_reward: number;
  coin_reward: number;
  is_active: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  username: string;
  avatar_key: AvatarKey;
  xp: number;
  best_score: number;
  games_played: number;
};

export type CoinLedgerEntry = {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  created_at: string;
};

export type LeaderboardPeriod = 'daily' | 'weekly' | 'all';
