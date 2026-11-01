import { useCallback, useEffect, useState } from 'react';
import { Crown, Medal, Trophy } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StateMessage } from '@/components/ui/StateMessage';
import { useAuth } from '@/contexts/AuthContext';
import { useRoute, navigate } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { LeaderboardEntry, LeaderboardPeriod } from '@/types/database';

const PERIODS: { value: LeaderboardPeriod; label: string; description: string }[] = [
  { value: 'daily', label: 'Today', description: 'Best runs since midnight UTC.' },
  { value: 'weekly', label: 'This week', description: 'Best runs since Monday, UTC.' },
  { value: 'all', label: 'All time', description: 'The highest verified scores ever recorded.' },
];

type MyRank = { rank: number | null; best_score: number; games_played: number };

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: LeaderboardEntry[]; myRank: MyRank | null };

const TOP_STYLES = [
  { ring: 'border-neon-amber/60 bg-neon-amber/10', text: 'text-neon-amber', Icon: Crown, label: '1st' },
  { ring: 'border-slate-300/50 bg-slate-300/10', text: 'text-slate-200', Icon: Medal, label: '2nd' },
  { ring: 'border-orange-400/50 bg-orange-400/10', text: 'text-orange-300', Icon: Medal, label: '3rd' },
];

export function LeaderboardPage() {
  const route = useRoute();
  const { user } = useAuth();
  const requested = route.params.get('period');
  const period: LeaderboardPeriod = requested === 'daily' || requested === 'weekly' ? requested : 'all';
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const { data, error } = await supabase.rpc('get_leaderboard', { p_period: period, p_limit: 50 });
    if (error || !Array.isArray(data)) {
      setState({ status: 'error', message: 'The leaderboard could not be loaded. Check your connection and try again.' });
      return;
    }
    let myRank: MyRank | null = null;
    if (user) {
      const { data: rankData, error: rankError } = await supabase.rpc('get_my_rank', { p_period: period });
      if (!rankError && Array.isArray(rankData) && rankData[0]) myRank = rankData[0] as MyRank;
    }
    setState({ status: 'ready', entries: data as LeaderboardEntry[], myRank });
  }, [period, user, attempt]);

  useEffect(() => {
    void load();
  }, [load]);

  const activePeriod = PERIODS.find((item) => item.value === period) ?? PERIODS[2];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-eyebrow">Global rankings</p>
          <h1 className="heading-display mt-2 text-3xl text-white sm:text-4xl">Leaderboard</h1>
          <p className="mt-2 text-sm text-slate-400">{activePeriod.description}</p>
        </div>
        <div role="tablist" aria-label="Leaderboard period" className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-void-900/80 p-1">
          {PERIODS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={item.value === period}
              onClick={() => navigate(`leaderboard?period=${item.value}`)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                item.value === period ? 'bg-neon-cyan/15 text-neon-cyan' : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {user && state.status === 'ready' && state.myRank && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 px-5 py-4 text-sm">
          <span className="text-slate-300">
            Your rank:{' '}
            <strong className="font-display text-lg text-white">{state.myRank.rank ? `#${state.myRank.rank}` : 'Unranked'}</strong>
          </span>
          <span className="text-slate-300">
            Best score: <strong className="tabular-nums text-white">{state.myRank.best_score.toLocaleString()}</strong>
          </span>
          <span className="text-slate-300">
            Runs: <strong className="tabular-nums text-white">{state.myRank.games_played}</strong>
          </span>
        </div>
      )}

      {state.status === 'loading' && <StateMessage tone="loading" title="Loading rankings" />}

      {state.status === 'error' && (
        <StateMessage
          tone="error"
          title="Could not load rankings"
          description={state.message}
          action={
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="btn-secondary px-4 py-2 text-sm">
              Try again
            </button>
          }
        />
      )}

      {state.status === 'ready' && state.entries.length === 0 && (
        <StateMessage
          tone="empty"
          icon={Trophy}
          title="No runs yet"
          description="Nobody has set a verified score in this period. Be the first pilot on the board."
          action={
            <button type="button" onClick={() => navigate('play')} className="btn-primary px-5 py-2.5 text-sm">
              Play now
            </button>
          }
        />
      )}

      {state.status === 'ready' && state.entries.length > 0 && (
        <>
          <ol className="grid gap-4 md:grid-cols-3">
            {state.entries.slice(0, 3).map((entry, index) => {
              const style = TOP_STYLES[index];
              const isMe = user?.id === entry.user_id;
              return (
                <li
                  key={entry.user_id}
                  className={`panel relative flex flex-col items-center gap-3 border p-6 text-center ${style.ring} ${
                    index === 0 ? 'md:-mt-3' : ''
                  } ${isMe ? 'ring-2 ring-neon-cyan/60' : ''}`}
                >
                  <style.Icon className={`h-6 w-6 ${style.text}`} aria-hidden="true" />
                  <span className={`font-display text-xs uppercase tracking-[0.2em] ${style.text}`}>{style.label}</span>
                  <Avatar avatarKey={entry.avatar_key} size={56} ring />
                  <p className="max-w-full truncate font-semibold text-white">
                    {entry.username}
                    {isMe && <span className="ml-2 text-xs text-neon-cyan">(you)</span>}
                  </p>
                  <p className="font-display text-2xl tabular-nums text-white">{entry.best_score.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">{entry.games_played} runs</p>
                </li>
              );
            })}
          </ol>

          <div className="panel overflow-hidden">
            <div className="max-h-[62vh] overflow-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <caption className="sr-only">Leaderboard for {activePeriod.label}</caption>
                <thead className="sticky top-0 z-10 bg-void-800/95 text-[11px] uppercase tracking-[0.18em] text-slate-400 backdrop-blur">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Rank</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Pilot</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Best score</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Runs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {state.entries.map((entry) => {
                    const isMe = user?.id === entry.user_id;
                    return (
                      <tr
                        key={entry.user_id}
                        className={`transition hover:bg-white/[0.03] ${isMe ? 'bg-neon-cyan/10 text-white' : 'text-slate-200'}`}
                        aria-current={isMe ? 'true' : undefined}
                      >
                        <td className="px-5 py-3 font-display tabular-nums">#{entry.rank}</td>
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-3">
                            <Avatar avatarKey={entry.avatar_key} size={28} />
                            <span className="font-semibold">{entry.username}</span>
                            {isMe && <span className="rounded-md bg-neon-cyan/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neon-cyan">You</span>}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums">{entry.best_score.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-400">{entry.games_played}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
