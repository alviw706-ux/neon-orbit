import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { StateMessage } from '@/components/ui/StateMessage';
import { adminCall, type ActivityLedger, type ActivityRun, type AdminLeaderboardEntry } from '@/lib/adminApi';
import { errorMessage } from '@/lib/edgeFunctions';
import { formatClock } from '@/components/game/GameHud';
import type { LeaderboardPeriod } from '@/types/database';

type ActivityData = { runs: ActivityRun[]; ledger: ActivityLedger[] };

export function AdminActivity() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    adminCall<ActivityData>('activity', {})
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (error) {
    return (
      <StateMessage
        tone="error"
        title="Activity unavailable"
        description={error}
        action={
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="btn-secondary px-4 py-2 text-sm">
            Try again
          </button>
        }
      />
    );
  }
  if (!data) return <StateMessage tone="loading" title="Loading activity" />;

  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <section aria-labelledby="runs-activity" className="panel p-5">
        <h2 id="runs-activity" className="heading-display text-lg text-white">Latest runs</h2>
        {data.runs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No runs recorded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {data.runs.map((run) => (
              <li key={run.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-white">{run.username}</p>
                  <p className="text-xs text-slate-500">{new Date(run.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right text-xs tabular-nums text-slate-400">
                  <p className="font-semibold text-white">{run.score.toLocaleString()} pts</p>
                  <p>{formatClock(run.duration_seconds)} · chain {run.max_combo}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ledger-activity" className="panel p-5">
        <h2 id="ledger-activity" className="heading-display text-lg text-white">Coin ledger</h2>
        {data.ledger.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No coin movements recorded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {data.ledger.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-white">{entry.username}</p>
                  <p className="truncate text-xs text-slate-500">{entry.reason}</p>
                </div>
                <span className={`font-semibold tabular-nums ${entry.amount >= 0 ? 'text-neon-mint' : 'text-neon-rose'}`}>
                  {entry.amount >= 0 ? '+' : ''}
                  {entry.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const PERIOD_OPTIONS: LeaderboardPeriod[] = ['all', 'weekly', 'daily'];

export function AdminLeaderboard() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [entries, setEntries] = useState<AdminLeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setEntries(null);
    setError(null);
    adminCall<{ entries: AdminLeaderboardEntry[] }>('leaderboard', { period })
      .then((result) => {
        if (active) setEntries(result.entries);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [period, attempt]);

  return (
    <section aria-labelledby="admin-board" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="admin-board" className="heading-display text-lg text-white">Leaderboard view</h2>
        <select
          aria-label="Leaderboard period"
          className="field w-auto py-2"
          value={period}
          onChange={(event) => setPeriod(event.target.value as LeaderboardPeriod)}
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === 'all' ? 'All time' : option === 'weekly' ? 'This week' : 'Today'}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <StateMessage
          tone="error"
          title="Leaderboard unavailable"
          description={error}
          action={
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="btn-secondary px-4 py-2 text-sm">
              Try again
            </button>
          }
        />
      )}
      {!error && !entries && <StateMessage tone="loading" title="Loading leaderboard" />}
      {entries && entries.length === 0 && <p className="text-sm text-slate-400">No verified runs in this period.</p>}
      {entries && entries.length > 0 && (
        <div className="panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-void-800/80 text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Rank</th>
                <th scope="col" className="px-5 py-3 font-semibold">Pilot</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Best</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Runs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {entries.map((entry) => (
                <tr key={entry.user_id} className="text-slate-200">
                  <td className="px-5 py-3 font-display tabular-nums">#{entry.rank}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar avatarKey={entry.avatar_key} size={28} />
                      {entry.username}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{entry.best_score.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-400">{entry.games_played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
