import { Award, CircleAlert, Coins, Gem, Loader2, Play, RotateCcw, Trophy, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import type { RunSummary } from '@/game/types';
import type { SubmitScoreResult } from '@/types/api';
import { formatClock } from '@/components/game/GameHud';
import { navigate } from '@/lib/router';

export type SubmissionState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; result: SubmitScoreResult }
  | { status: 'local' }
  | { status: 'error'; message: string };

export function ReadyOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <div className="panel w-full max-w-sm px-6 py-7 text-center animate-fade-up">
        <p className="label-eyebrow text-neon-cyan">Ready</p>
        <h2 className="heading-display mt-2 text-2xl text-white">Launch your orb</h2>
        <p className="mt-3 text-sm text-slate-300">
          Switch between the inner and outer orbit to dodge lasers and barriers. Collect coins, gems and power-ups.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 text-sm font-semibold text-neon-cyan animate-pulse">
          <Play className="h-4 w-4" aria-hidden="true" />
          Tap or press space to start
        </div>
      </div>
    </div>
  );
}

type PausedOverlayProps = {
  onResume: () => void;
  onRestart: () => void;
};

export function PausedOverlay({ onResume, onRestart }: PausedOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-void-950/60 p-6 backdrop-blur-sm">
      <div className="panel w-full max-w-sm px-6 py-7 text-center animate-fade-up">
        <p className="label-eyebrow text-neon-amber">Paused</p>
        <h2 className="heading-display mt-2 text-2xl text-white">Orbit on hold</h2>
        <p className="mt-2 text-sm text-slate-400">Press P or Escape to resume at any time.</p>
        <div className="mt-6 flex flex-col gap-3">
          <button type="button" onClick={onResume} className="btn-primary w-full">
            <Play className="h-4 w-4" /> Resume
          </button>
          <button type="button" onClick={onRestart} className="btn-secondary w-full">
            <RotateCcw className="h-4 w-4" /> Restart run
          </button>
        </div>
      </div>
    </div>
  );
}

type GameOverOverlayProps = {
  summary: RunSummary;
  personalBest: number;
  submission: SubmissionState;
  signedIn: boolean;
  onRestart: () => void;
  onRetrySubmit: () => void;
};

export function GameOverOverlay({
  summary,
  personalBest,
  submission,
  signedIn,
  onRestart,
  onRetrySubmit,
}: GameOverOverlayProps) {
  const isNewBest = summary.score > 0 && summary.score > personalBest;

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-void-950/75 p-4 backdrop-blur-sm sm:p-6">
      <div className="panel my-auto w-full max-w-md px-5 py-6 text-center animate-fade-up sm:px-7 sm:py-8">
        <p className="label-eyebrow text-neon-rose">Signal lost</p>
        <h2 className="heading-display mt-2 text-2xl text-white">Run complete</h2>

        <p className="font-display mt-5 text-5xl tabular-nums text-white">{Math.floor(summary.score).toLocaleString()}</p>
        <p className="mt-2 flex h-6 items-center justify-center gap-2 text-sm font-semibold text-neon-amber">
          {isNewBest && (
            <>
              <Trophy className="h-4 w-4" aria-hidden="true" /> Personal best
            </>
          )}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
          <Stat label="Time" value={formatClock(summary.durationSeconds)} />
          <Stat label="Coins" value={String(summary.coins)} icon={<Coins className="h-3.5 w-3.5 text-neon-amber" />} />
          <Stat label="Gems" value={String(summary.gems)} icon={<Gem className="h-3.5 w-3.5 text-neon-mint" />} />
          <Stat label="Best chain" value={String(summary.maxCombo)} />
        </dl>

        <div className="mt-6 min-h-[5.5rem] rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left">
          <SubmissionPanel
            submission={submission}
            signedIn={signedIn}
            onRetrySubmit={onRetrySubmit}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" onClick={onRestart} className="btn-primary w-full">
            <RotateCcw className="h-4 w-4" /> Play again
          </button>
          <button type="button" onClick={() => navigate(signedIn ? 'leaderboard' : 'auth')} className="btn-secondary w-full">
            {signedIn ? (
              <>
                <Award className="h-4 w-4" /> Leaderboard
              </>
            ) : (
              'Sign in to save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-void-900/60 px-3 py-2.5">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 text-base font-semibold tabular-nums text-white">
        {icon}
        {value}
      </dd>
    </div>
  );
}

function SubmissionPanel({
  submission,
  signedIn,
  onRetrySubmit,
}: {
  submission: SubmissionState;
  signedIn: boolean;
  onRetrySubmit: () => void;
}) {
  if (submission.status === 'saving') {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-300" role="status">
        <Loader2 className="h-5 w-5 animate-spin text-neon-cyan" aria-hidden="true" />
        Verifying and saving your run...
      </div>
    );
  }

  if (submission.status === 'error') {
    return (
      <div className="flex flex-col gap-3" role="alert">
        <div className="flex items-start gap-3 text-sm text-slate-200">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-neon-rose" aria-hidden="true" />
          <span>Your run was not saved. {submission.message}</span>
        </div>
        <button type="button" onClick={onRetrySubmit} className="btn-secondary self-start px-4 py-2 text-sm">
          Try saving again
        </button>
      </div>
    );
  }

  if (submission.status === 'saved') {
    const { result } = submission;
    const leveledUp = result.levelAfter > result.levelBefore;
    return (
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Chip tone="cyan">+{result.xpEarned} XP</Chip>
          <Chip tone="amber">+{result.coinsEarned} coins</Chip>
          {leveledUp && <Chip tone="mint">Level {result.levelAfter}</Chip>}
        </div>
        {result.newAchievements.length > 0 && (
          <ul className="space-y-2">
            {result.newAchievements.map((achievement) => (
              <li key={achievement.key} className="flex items-start gap-3 rounded-lg bg-neon-amber/10 p-2.5">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-neon-amber" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-white">{achievement.title}</span>
                  <span className="block text-slate-400">{achievement.description}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {result.newAchievements.length === 0 && <p className="text-slate-300">Run saved to your profile.</p>}
      </div>
    );
  }

  if (submission.status === 'local' || !signedIn) {
    return (
      <p className="text-sm text-slate-300">
        Saved on this device only. Sign in to submit runs to your profile and the global leaderboard.
      </p>
    );
  }

  return <p className="text-sm text-slate-400">Preparing your results...</p>;
}

function Chip({ tone, children }: { tone: 'cyan' | 'amber' | 'mint'; children: ReactNode }) {
  const tones = {
    cyan: 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan',
    amber: 'border-neon-amber/40 bg-neon-amber/10 text-neon-amber',
    mint: 'border-neon-mint/40 bg-neon-mint/10 text-neon-mint',
  } as const;
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
