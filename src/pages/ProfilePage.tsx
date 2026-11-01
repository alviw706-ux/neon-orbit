import { useEffect, useState, type FormEvent } from 'react';
import { Coins, Crown, Flame, Gem, Lock, Medal, Pencil, Rocket, Shield, Star, Target, Timer, Zap, Orbit, type LucideIcon } from 'lucide-react';
import { Avatar, AVATAR_CHOICES } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { StateMessage } from '@/components/ui/StateMessage';
import { useToast } from '@/components/ui/Toast';
import { formatClock } from '@/components/game/GameHud';
import { useAuth } from '@/contexts/AuthContext';
import { errorMessage } from '@/lib/edgeFunctions';
import { loadAchievements, loadLedger, loadPlayerRuns } from '@/lib/playerData';
import { levelProgress } from '@/lib/progression';
import { navigate } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { Achievement, AvatarKey, CoinLedgerEntry, GameRun } from '@/types/database';

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  medal: Medal,
  rocket: Rocket,
  orbit: Orbit,
  shield: Shield,
  star: Star,
  target: Target,
  crown: Crown,
  coins: Coins,
  gem: Gem,
  flame: Flame,
  timer: Timer,
  zap: Zap,
};

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

type ProfileData = {
  runs: GameRun[];
  ledger: CoinLedgerEntry[];
  achievements: { catalogue: Achievement[]; unlockedKeys: Set<string> };
};

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setError(null);
    Promise.all([loadPlayerRuns(userId), loadLedger(userId), loadAchievements(userId)])
      .then(([runs, ledger, achievements]) => {
        if (active) setData({ runs, ledger, achievements });
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  if (!user || !profile) {
    return (
      <StateMessage
        tone="empty"
        title="Sign in to view your profile"
        description="Your avatar, achievements and coin history live on your pilot profile."
        action={
          <button type="button" onClick={() => navigate('auth')} className="btn-primary px-5 py-2.5 text-sm">
            Sign in
          </button>
        }
      />
    );
  }

  if (error) {
    return (
      <StateMessage
        tone="error"
        title="Profile unavailable"
        description={error}
        action={
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="btn-secondary px-4 py-2 text-sm">
            Try again
          </button>
        }
      />
    );
  }

  if (!data) return <StateMessage tone="loading" title="Loading your profile" />;

  const level = levelProgress(profile.xp);
  const personalBest = data.runs.reduce((best, run) => Math.max(best, run.score), 0);
  const unlocked = data.achievements.unlockedKeys.size;

  return (
    <div className="space-y-8">
      <section className="panel flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        <Avatar avatarKey={profile.avatar_key} size={88} ring />
        <div className="min-w-0 flex-1">
          <p className="label-eyebrow">Pilot profile</p>
          <h1 className="heading-display mt-2 truncate text-3xl text-white">{profile.username}</h1>
          <p className="mt-2 text-sm text-slate-400">
            Level {level.level} · {profile.xp.toLocaleString()} XP · {profile.coins.toLocaleString()} coins
          </p>
          <div className="mt-4 h-2 max-w-md overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-blue" style={{ width: `${Math.round(level.ratio * 100)}%` }} />
          </div>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="btn-secondary self-start px-4 py-2 text-sm">
          <Pencil className="h-4 w-4" aria-hidden="true" /> Edit profile
        </button>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Summary">
        <Stat label="Personal best" value={personalBest.toLocaleString()} />
        <Stat label="Games played" value={data.runs.length.toLocaleString()} />
        <Stat label="Achievements" value={`${unlocked} / ${data.achievements.catalogue.length}`} />
        <Stat label="Time in orbit" value={formatClock(data.runs.reduce((sum, run) => sum + run.duration_seconds, 0))} />
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="achievements-title" className="space-y-4">
          <h2 id="achievements-title" className="heading-display text-lg text-white">
            Achievements
          </h2>
          {data.achievements.catalogue.length === 0 ? (
            <p className="panel p-5 text-sm text-slate-400">No achievements have been published yet.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.achievements.catalogue.map((achievement) => {
                const isUnlocked = data.achievements.unlockedKeys.has(achievement.key);
                const Icon = ACHIEVEMENT_ICONS[achievement.icon] ?? Star;
                return (
                  <li
                    key={achievement.key}
                    className={`panel flex items-start gap-3 p-4 ${isUnlocked ? '' : 'opacity-60'}`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                        isUnlocked ? 'border-neon-amber/40 bg-neon-amber/10 text-neon-amber' : 'border-white/10 text-slate-500'
                      }`}
                    >
                      {isUnlocked ? <Icon className="h-5 w-5" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{achievement.title}</p>
                      <p className="text-xs text-slate-400">{achievement.description}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
                        {isUnlocked ? 'Unlocked' : 'Locked'} · +{achievement.xp_reward} XP
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-8">
          <section aria-labelledby="ledger-title" className="panel p-5">
            <h2 id="ledger-title" className="heading-display text-lg text-white">
              Coin history
            </h2>
            {data.ledger.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No coin activity yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06]">
                {data.ledger.slice(0, 12).map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-slate-200">{entry.reason}</p>
                      <p className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleDateString()}</p>
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

          <section aria-labelledby="history-title" className="panel p-5">
            <h2 id="history-title" className="heading-display text-lg text-white">
              Run history
            </h2>
            {data.runs.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">Your finished runs will appear here.</p>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06]">
                {data.runs.slice(0, 10).map((run) => (
                  <li key={run.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="font-semibold tabular-nums text-white">{run.score.toLocaleString()}</span>
                    <span className="text-xs tabular-nums text-slate-400">
                      {formatClock(run.duration_seconds)} · chain {run.max_combo}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <EditProfileModal
        open={editing}
        userId={user.id}
        currentUsername={profile.username}
        currentAvatar={profile.avatar_key}
        onClose={() => setEditing(false)}
        onSaved={() => void refreshProfile()}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="font-display mt-2 text-xl tabular-nums text-white">{value}</p>
    </div>
  );
}

type EditProfileModalProps = {
  open: boolean;
  userId: string;
  currentUsername: string;
  currentAvatar: AvatarKey;
  onClose: () => void;
  onSaved: () => void;
};

function EditProfileModal({ open, userId, currentUsername, currentAvatar, onClose, onSaved }: EditProfileModalProps) {
  const { showToast } = useToast();
  const [username, setUsername] = useState(currentUsername);
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(currentAvatar);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUsername(currentUsername);
    setAvatarKey(currentAvatar);
    setError(null);
  }, [open, currentUsername, currentAvatar]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = username.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      setError('Use 3 to 16 letters, numbers or underscores.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (trimmed !== currentUsername) {
        const { data, error: rpcError } = await supabase.rpc('is_username_available', { p_username: trimmed });
        if (rpcError) throw new Error('We could not check that username. Please try again.');
        if (data !== true) throw new Error('That username is already taken.');
      }
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: trimmed, avatar_key: avatarKey })
        .eq('id', userId);
      if (updateError) throw new Error('Your profile could not be saved. That username may be taken.');
      onSaved();
      showToast('Profile updated.');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Edit profile" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div>
          <label htmlFor="edit-username" className="label-eyebrow mb-2 block">
            Pilot name
          </label>
          <input
            id="edit-username"
            className="field"
            value={username}
            maxLength={16}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <fieldset>
          <legend className="label-eyebrow mb-2">Avatar</legend>
          <div className="grid grid-cols-4 gap-3">
            {AVATAR_CHOICES.map((choice) => (
              <button
                key={choice.key}
                type="button"
                aria-pressed={avatarKey === choice.key}
                aria-label={choice.label}
                onClick={() => setAvatarKey(choice.key)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
                  avatarKey === choice.key ? 'border-neon-cyan/60 bg-neon-cyan/10' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <Avatar avatarKey={choice.key} size={40} />
                <span className="text-[11px] text-slate-300">{choice.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="rounded-xl border border-neon-rose/30 bg-neon-rose/10 px-4 py-3 text-sm text-neon-rose">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2.5 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
