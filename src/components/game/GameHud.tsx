import { Gem, Coins, Hourglass, Magnet, Pause, Shield, Zap } from 'lucide-react';
import type { HudSnapshot, PowerupKind } from '@/game/types';

type GameHudProps = {
  snapshot: HudSnapshot;
  onPause: () => void;
};

const EFFECT_META: Record<PowerupKind, { label: string; icon: typeof Shield; className: string }> = {
  shield: { label: 'Shield', icon: Shield, className: 'text-neon-cyan border-neon-cyan/40 bg-neon-cyan/10' },
  slow: { label: 'Slow', icon: Hourglass, className: 'text-neon-violet border-neon-violet/40 bg-neon-violet/10' },
  magnet: { label: 'Magnet', icon: Magnet, className: 'text-neon-amber border-neon-amber/40 bg-neon-amber/10' },
  double: { label: 'Double', icon: Zap, className: 'text-neon-mint border-neon-mint/40 bg-neon-mint/10' },
};

const EFFECT_ORDER: PowerupKind[] = ['shield', 'slow', 'magnet', 'double'];

export function formatClock(seconds: number): string {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  return `${String(minutes).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

export function GameHud({ snapshot, onPause }: GameHudProps) {
  const active = EFFECT_ORDER.filter((kind) => snapshot.effects[kind] > 0);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-eyebrow text-slate-400">Score</p>
          <p className="font-display text-2xl tabular-nums text-white sm:text-3xl" aria-live="off">
            {Math.floor(snapshot.score).toLocaleString()}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-md border border-neon-amber/40 bg-neon-amber/10 px-2 py-0.5 font-display text-xs text-neon-amber">
              x{snapshot.multiplier}
            </span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10 sm:w-32" aria-hidden="true">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-amber transition-[width] duration-100"
                style={{ width: `${Math.round(snapshot.chainRatio * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-void-950/70 px-3 py-2 backdrop-blur-md">
              <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-neon-amber">
                <Coins className="h-4 w-4" aria-hidden="true" />
                {snapshot.coins}
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-neon-mint">
                <Gem className="h-4 w-4" aria-hidden="true" />
                {snapshot.gems}
              </span>
            </div>
            <button
              type="button"
              onClick={onPause}
              aria-label="Pause game"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-void-950/70 text-white backdrop-blur-md transition hover:border-neon-cyan/50 hover:text-neon-cyan"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>
          <p className="font-display text-sm tabular-nums text-slate-200">{formatClock(snapshot.elapsed)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex min-h-[2rem] flex-wrap gap-2">
          {active.map((kind) => (
            <EffectChip key={kind} kind={kind} remaining={snapshot.effects[kind]} />
          ))}
        </div>
        <p className="hidden text-xs text-slate-500 sm:block">Tap or press space to switch orbit</p>
      </div>
    </div>
  );
}

function EffectChip({ kind, remaining }: { kind: PowerupKind; remaining: number }) {
  const meta = EFFECT_META[kind];
  const Icon = meta.icon;
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold backdrop-blur-md ${meta.className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{meta.label}</span>
      <span className="w-8 text-right tabular-nums">{remaining.toFixed(1)}s</span>
    </div>
  );
}
