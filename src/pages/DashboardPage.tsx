import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Coins, Gauge, Gem, Loader2, Target, Trophy, Zap } from 'lucide-react';
import { StateMessage } from '@/components/ui/StateMessage';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { challengeProgress, formatCountdown, nextPeriodStart, periodStart } from '@/lib/missions';
import { loadAchievements, loadActiveChallenges, loadClaims, loadPlayerRuns } from '@/lib/playerData';
import { levelProgress } from '@/lib/progression';
import { callFunction, errorMessage } from '@/lib/edgeFunctions';
import { navigate } from '@/lib/router';
import { formatClock } from '@/components/game/GameHud';
import type { ClaimRewardResult } from '@/types/api';
import type { Achievement, Challenge, GameRun } from '@/types/database';

type Data = {
  runs: GameRun[];
  challenges: Challenge[];
  claims: { challenge_id: string; period_start: string }[];
  achievements: { catalogue: Achievement[]; unlockedKeys: Set<string> };
};

export function DashboardPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [runs, challenges, claims, achievements] = await Promise.all([
        loadPlayerRuns(userId),
        loadActiveChallenges(),
        loadClaims(userId),
        loadAchievements(userId),
      ]);
      setData({ runs, challenges, claims, achievements });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const runs = data?.runs ?? [];
    return {
      games: runs.length,
      bestScore: runs.reduce((best, run) => Math.max(best, run.score), 0),
      coins: runs.reduce((sum, run) => sum + run.coins, 0),
      gems: runs.reduce((sum, run) => sum + run.gems, 0),
      survived: runs.reduce((sum, run) => sum + run.duration_seconds, 0),
      bestChain: runs.reduce((best, run) => Math.max(best, run.max_combo), 0),
    };
  }, [data]);

  const handleClaim = async (challenge: Challenge) => {
    setClaimingId(challenge.id);
    try {
      const result = await callFunction<ClaimRewardResult>('claim-reward', { challengeId: challenge.id });
      setData((current) =>
        current
          ? {
              ...current,
              claims: [
                ...current.claims,
                { challenge_id: challenge.id, period_start: periodStart(challenge.period, new Date()).toISOString() },
              ],
            }
          : current,
      );
      showToast(`Reward claimed: +${result.xpEarned} XP and +${result.coinsEarned} coins.`);
      void refreshProfile();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setClaimingId(null);
    }
  };

  if (!user) {
    return (
      <StateMessage
        tone="empty"
        icon={Gauge}
        title="Sign in to see your dashboard"
        description="Your totals, missions and rewards are saved to your pilot profile."
        action={
          <button type="button" onClick={() => navigate('auth')} className="btn-primary px-5 py-2.5 text-sm">
            Sign in
          </button>
        }
      />
    );
  }

  if (loading && !data) return <StateMessage tone="loading" title="Loading your dashboard" />;

  if (error || !data) {
    return (
      <StateMessage
        tone="error"
        title="Dashboard unavailable"
        description={error ?? 'Your data could not be loaded.'}
        action={
          <button type="button" onClick={() => void load()} className="btn-secondary px-4 py-2 text-sm">
            Try again
          </button>
        }
      />
    );
  }

  const level = profile ? levelProgress(profile.xp) : null;
  const now = new Date();
  const unlocked = data.achievements.unlockedKeys.size;

  return (
    <div className="space-y-8">
      <header>
        <p className="label-eyebrow">Pilot dashboard</p>
        <h1 className="heading-display mt-2 text-3xl text-white sm:text-4xl">
          Welcome back{profile ? `, ${profile.username}` : ''}
        </h1>
      </header>

      <section aria-label="Totals" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Games played" value={totals.games.toLocaleString()} icon={Target} tone="cyan" />
        <StatCard label="Personal best" value={totals.bestScore.toLocaleString()} icon={Trophy} tone="amber" />
        <StatCard label="Coin wallet" value={(profile?.coins ?? 0).toLocaleString()} icon={Coins} tone="amber" />
        <StatCard label="Time in orbit" value={formatClock(totals.survived)} icon={Gauge} tone="mint" />
      </section>

      <section className="panel grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="label-eyebrow">Experience</p>
          <p className="font-display mt-2 text-2xl text-white">Level {level?.level ?? 1}</p>
          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((level?.ratio ?? 0) * 100)}
            aria-label="Progress to next level"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-blue shadow-glow-cyan transition-[width] duration-700"
              style={{ width: `${Math.round((level?.ratio ?? 0) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {(level?.current ?? 0).toLocaleString()} / {(level?.needed ?? 0).toLocaleString()} XP to level {(level?.level ?? 1) + 1}
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <span className="flex items-center gap-2 text-slate-300">
            <Gem className="h-4 w-4 text-neon-mint" aria-hidden="true" /> {totals.gems} gems
          </span>
          <span className="flex items-center gap-2 text-slate-300">
            <Zap className="h-4 w-4 text-neon-amber" aria-hidden="true" /> Best chain {totals.bestChain}
          </span>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section aria-labelledby="missions-title" className="space-y-4">
          <h2 id="missions-title" className="heading-display text-lg text-white">
            Missions
          </h2>
          {data.challenges.length === 0 && (
            <p className="panel p-5 text-sm text-slate-400">No missions are active right now. Check back soon.</p>
          )}
          {(['daily', 'weekly'] as const).map((period) => {
            const items = data.challenges.filter((challenge) => challenge.period === period);
            if (items.length === 0) return null;
            const start = periodStart(period, now);
            const resetsIn = formatCountdown(nextPeriodStart(period, now).getTime() - now.getTime());
            return (
              <div key={period} className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {period === 'daily' ? 'Daily' : 'Weekly'} resets in {resetsIn}
                </p>
                {items.map((challenge) => {
                  const periodRuns = data.runs.filter((run) => new Date(run.created_at).getTime() >= start.getTime());
                  const progress = challengeProgress(challenge, periodRuns);
                  const ratio = Math.min(1, progress / challenge.target);
                  const claimed = data.claims.some(
                    (claim) =>
                      claim.challenge_id === challenge.id &&
                      new Date(claim.period_start).getTime() === start.getTime(),
                  );
                  const ready = ratio >= 1 && !claimed;
                  return (
                    <article key={challenge.id} className="panel p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white">{challenge.title}</h3>
                          <p className="mt-1 text-sm text-slate-400">{challenge.description}</p>
                        </div>
                        <span className="shrink-0 rounded-md border border-neon-amber/30 bg-neon-amber/10 px-2 py-1 text-xs font-semibold text-neon-amber">
                          +{challenge.xp_reward} XP
                        </span>
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-neon-mint to-neon-cyan transition-[width] duration-700"
                            style={{ width: `${Math.round(ratio * 100)}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-xs tabular-nums text-slate-300">
                          {Math.min(progress, challenge.target).toLocaleString()} / {challenge.target.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-4 flex justify-end">
                        {claimed ? (
                          <span className="text-sm font-semibold text-neon-mint">Reward claimed</span>
                        ) : (
                          <button
                            type="button"
                            disabled={!ready || claimingId !== null}
                            onClick={() => void handleClaim(challenge)}
                            className="btn-primary px-4 py-2 text-sm"
                          >
                            {claimingId === challenge.id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {ready ? 'Claim reward' : 'In progress'}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })}
        </section>

        <div className="space-y-8">
          <section className="panel p-5" aria-labelledby="rewards-title">
            <h2 id="rewards-title" className="heading-display text-lg text-white">
              Rewards
            </h2>
            <div className="mt-4 flex items-center gap-4">
              <Award className="h-10 w-10 text-neon-amber" aria-hidden="true" />
              <div>
                <p className="font-display text-2xl text-white">
                  {unlocked} / {data.achievements.catalogue.length}
                </p>
                <p className="text-sm text-slate-400">achievements unlocked</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('profile')} className="btn-secondary mt-5 w-full px-4 py-2 text-sm">
              View all achievements
            </button>
          </section>

          <section className="panel p-5" aria-labelledby="recent-title">
            <h2 id="recent-title" className="heading-display text-lg text-white">
              Recent runs
            </h2>
            {data.runs.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                No runs yet. <button type="button" className="text-neon-cyan underline-offset-4 hover:underline" onClick={() => navigate('play')}>Launch your first orbit</button>.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06]">
                {data.runs.slice(0, 6).map((run) => (
                  <li key={run.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-semibold tabular-nums text-white">{run.score.toLocaleString()} pts</p>
                      <p className="text-xs text-slate-500">{new Date(run.created_at).toLocaleString()}</p>
                    </div>
                    <p className="text-xs tabular-nums text-slate-400">
                      {formatClock(run.duration_seconds)} · +{run.xp_earned} XP
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const TONES = {
  cyan: 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/25',
  amber: 'text-neon-amber bg-neon-amber/10 border-neon-amber/25',
  mint: 'text-neon-mint bg-neon-mint/10 border-neon-mint/25',
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Target;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="panel p-5">
      <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg border ${TONES[tone]}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="font-display mt-1 text-xl tabular-nums text-white">{value}</p>
    </div>
  );
}
