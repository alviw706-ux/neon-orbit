import { useCallback, useEffect, useRef, useState } from 'react';
import { GameStage, type GameStageHandle } from '@/components/game/GameStage';
import { GameHud, formatClock } from '@/components/game/GameHud';
import { GameOverOverlay, PausedOverlay, ReadyOverlay, type SubmissionState } from '@/components/game/GameOverlays';
import { useAuth } from '@/contexts/AuthContext';
import type { GamePhase, HudSnapshot, RunSummary } from '@/game/types';
import { appendOfflineRun, useGameSettings, useOfflineRuns } from '@/lib/localSettings';
import { callFunction, errorMessage } from '@/lib/edgeFunctions';
import { navigate } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { SubmitScoreResult } from '@/types/api';
import { Gem, Coins, Trophy, UserRound } from 'lucide-react';

const EMPTY_SNAPSHOT: HudSnapshot = {
  phase: 'ready',
  score: 0,
  elapsed: 0,
  coins: 0,
  gems: 0,
  chain: 0,
  multiplier: 1,
  chainRatio: 0,
  effects: { shield: 0, slow: 0, magnet: 0, double: 0, protection: 0 },
  shield: false,
  difficulty: 0,
};

type FinishedRun = { summary: RunSummary; previousBest: number };

export function PlayPage() {
  const { user, refreshProfile } = useAuth();
  const userId = user?.id ?? null;
  const settings = useGameSettings();
  const offlineRuns = useOfflineRuns();

  const [phase, setPhase] = useState<GamePhase>('ready');
  const [snapshot, setSnapshot] = useState<HudSnapshot>(EMPTY_SNAPSHOT);
  const [runKey, setRunKey] = useState(1);
  const [finished, setFinished] = useState<FinishedRun | null>(null);
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' });
  const [serverBest, setServerBest] = useState(0);
  const [bestError, setBestError] = useState(false);

  const stageRef = useRef<GameStageHandle>(null);
  const runToken = useRef(0);

  const localBest = offlineRuns.reduce((best, run) => Math.max(best, run.score), 0);
  const personalBest = userId ? serverBest : localBest;

  useEffect(() => {
    if (!userId) {
      setServerBest(0);
      return;
    }
    let active = true;
    supabase
      .from('game_runs')
      .select('score')
      .eq('user_id', userId)
      .order('score', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setBestError(Boolean(error));
        setServerBest(error ? 0 : ((data as { score: number } | null)?.score ?? 0));
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const submitRun = useCallback(
    async (summary: RunSummary) => {
      const token = runToken.current;
      setSubmission({ status: 'saving' });
      try {
        const result = await callFunction<SubmitScoreResult>('submit-score', summary);
        if (token !== runToken.current) return;
        setSubmission({ status: 'saved', result });
        setServerBest((best) => Math.max(best, summary.score));
        void refreshProfile();
      } catch (err) {
        if (token !== runToken.current) return;
        setSubmission({ status: 'error', message: errorMessage(err) });
      }
    },
    [refreshProfile],
  );

  const handleFinish = (summary: RunSummary) => {
    setFinished({ summary, previousBest: personalBest });
    if (userId) {
      void submitRun(summary);
      return;
    }
    appendOfflineRun({ ...summary, playedAt: new Date().toISOString() });
    setSubmission({ status: 'local' });
  };

  const restart = () => {
    runToken.current += 1;
    setFinished(null);
    setSubmission({ status: 'idle' });
    setSnapshot(EMPTY_SNAPSHOT);
    setPhase('ready');
    setRunKey((key) => key + 1);
  };

  const retrySubmit = () => {
    if (finished) void submitRun(finished.summary);
  };

  return (
    <div className="flex h-[calc(100dvh-11.25rem)] flex-col gap-3 overflow-hidden md:h-[calc(100dvh-8.25rem)] md:gap-4">
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="label-eyebrow">Arcade run</p>
          <h1 className="heading-display mt-1 text-xl text-white sm:text-2xl">Play NEON ORBIT</h1>
          <p className="mt-2 hidden max-w-xl text-sm text-slate-400 xl:block">
            Survive as long as you can. Every second earns points, and chaining pickups multiplies them.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 sm:px-4 sm:py-3">
          <Trophy className="h-5 w-5 text-neon-amber" aria-hidden="true" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Personal best</p>
            <p className="font-display text-lg tabular-nums text-white">{personalBest.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3 lg:grid-cols-[minmax(0,1fr)_280px] lg:grid-rows-[minmax(0,1fr)] lg:gap-4">
        <div className="relative min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-void-950 shadow-glow-blue sm:rounded-3xl">
          <GameStage
            key={runKey}
            ref={stageRef}
            settings={settings}
            onSnapshot={setSnapshot}
            onStatusChange={setPhase}
            onFinish={handleFinish}
          />

          {phase === 'playing' && <GameHud snapshot={snapshot} onPause={() => stageRef.current?.pause()} />}
          {phase === 'ready' && <ReadyOverlay />}
          {phase === 'paused' && (
            <PausedOverlay onResume={() => stageRef.current?.resume()} onRestart={restart} />
          )}
          {phase === 'over' && finished && (
            <GameOverOverlay
              summary={finished.summary}
              personalBest={finished.previousBest}
              submission={submission}
              signedIn={Boolean(userId)}
              onRestart={restart}
              onRetrySubmit={retrySubmit}
            />
          )}
        </div>

        <aside className="grid grid-cols-2 gap-2 lg:block lg:space-y-4 lg:overflow-y-auto">
          <div className="panel p-3 sm:p-4 lg:p-5">
            {userId ? (
              <>
                <p className="label-eyebrow">Ranked play</p>
                <p className="mt-2 text-sm text-slate-300">
                  Finished runs are verified and saved to your profile and the global leaderboard.
                </p>
                {bestError && (
                  <p role="alert" className="mt-3 text-xs text-neon-rose">
                    We could not load your best score. It will update after your next run.
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => navigate('dashboard')} className="btn-secondary flex-1 px-3 py-2 text-sm">
                    Dashboard
                  </button>
                  <button type="button" onClick={() => navigate('leaderboard')} className="btn-secondary flex-1 px-3 py-2 text-sm">
                    Ranks
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="label-eyebrow">Practice mode</p>
                <p className="mt-2 text-sm text-slate-300">
                  You are playing as a guest. Runs are kept on this device only.
                </p>
                <button type="button" onClick={() => navigate('auth')} className="btn-primary mt-4 w-full px-4 py-2.5 text-sm">
                  <UserRound className="h-4 w-4" aria-hidden="true" /> Sign in for ranked play
                </button>
              </>
            )}
          </div>

          <div className="panel p-3 sm:p-4 lg:p-5">
            <p className="label-eyebrow">Controls</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-300 lg:mt-3 lg:space-y-2 lg:text-sm">
              <li>Tap the game field or press Space to switch orbit.</li>
              <li>Press P or Escape to pause.</li>
              <li>Coins are worth 5 points. Gems are worth 25 points.</li>
            </ul>
          </div>

          {!userId && offlineRuns.length > 0 && (
            <div className="col-span-2 panel p-3 sm:p-4 lg:col-span-1 lg:p-5">
              <p className="label-eyebrow">Recent practice runs</p>
              <ul className="mt-2 divide-y divide-white/[0.06] lg:mt-3">
                {offlineRuns.slice(0, 3).map((run) => (
                  <li key={run.playedAt} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-semibold tabular-nums text-white">{run.score.toLocaleString()}</span>
                    <span className="flex items-center gap-2 text-xs tabular-nums text-slate-400">
                      {formatClock(run.durationSeconds)}
                      <Coins className="h-3.5 w-3.5 text-neon-amber" aria-hidden="true" />
                      {run.coins}
                      <Gem className="h-3.5 w-3.5 text-neon-mint" aria-hidden="true" />
                      {run.gems}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
