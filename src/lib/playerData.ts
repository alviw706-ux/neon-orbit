import { supabase } from '@/lib/supabase';
import type { Achievement, Challenge, CoinLedgerEntry, GameRun } from '@/types/database';

export const RUN_COLUMNS = 'id, user_id, score, duration_seconds, coins, gems, max_combo, xp_earned, created_at';

export async function loadPlayerRuns(userId: string): Promise<GameRun[]> {
  const { data, error } = await supabase
    .from('game_runs')
    .select(RUN_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error('Your run history could not be loaded.');
  return (data ?? []) as GameRun[];
}

export async function loadAchievements(userId: string): Promise<{ catalogue: Achievement[]; unlockedKeys: Set<string> }> {
  const [catalogueResult, unlockedResult] = await Promise.all([
    supabase
      .from('achievements')
      .select('key, title, description, icon, metric, threshold, xp_reward, coin_reward, is_active')
      .eq('is_active', true)
      .order('threshold', { ascending: true }),
    supabase.from('user_achievements').select('achievement_key').eq('user_id', userId),
  ]);
  if (catalogueResult.error || unlockedResult.error) throw new Error('Your achievements could not be loaded.');
  const unlockedKeys = new Set(
    ((unlockedResult.data ?? []) as { achievement_key: string }[]).map((row) => row.achievement_key),
  );
  return { catalogue: (catalogueResult.data ?? []) as Achievement[], unlockedKeys };
}

export async function loadActiveChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('id, title, description, metric, period, target, xp_reward, coin_reward, is_active')
    .eq('is_active', true)
    .order('period', { ascending: true })
    .order('title', { ascending: true });
  if (error) throw new Error('Missions could not be loaded.');
  return (data ?? []) as Challenge[];
}

export async function loadClaims(userId: string): Promise<{ challenge_id: string; period_start: string }[]> {
  const { data, error } = await supabase
    .from('challenge_claims')
    .select('challenge_id, period_start')
    .eq('user_id', userId);
  if (error) throw new Error('Mission rewards could not be loaded.');
  return (data ?? []) as { challenge_id: string; period_start: string }[];
}

export async function loadLedger(userId: string): Promise<CoinLedgerEntry[]> {
  const { data, error } = await supabase
    .from('coin_ledger')
    .select('id, user_id, amount, reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error('Your coin history could not be loaded.');
  return (data ?? []) as CoinLedgerEntry[];
}
