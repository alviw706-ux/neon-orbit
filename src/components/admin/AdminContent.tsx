import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StateMessage } from '@/components/ui/StateMessage';
import { useToast } from '@/components/ui/Toast';
import { adminCall, type AdminAchievement, type AdminChallenge } from '@/lib/adminApi';
import { errorMessage } from '@/lib/edgeFunctions';
import { useAsyncList } from '@/lib/useAsyncList';

const CHALLENGE_METRICS = ['games', 'coins', 'score', 'survival', 'combo'] as const;
const ACHIEVEMENT_METRICS = ['total_games', 'best_score', 'lifetime_coins', 'best_combo', 'best_survival'] as const;
const ACHIEVEMENT_ICONS = ['medal', 'rocket', 'orbit', 'shield', 'star', 'target', 'crown', 'coins', 'gem', 'flame', 'timer', 'zap'] as const;

export function AdminContent() {
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <ChallengeManager />
      <AchievementManager />
    </div>
  );
}

function ChallengeManager() {
  const { items, error, loading, reload } = useAsyncList<AdminChallenge>(
    () => adminCall<{ challenges: AdminChallenge[] }>('list_challenges', {}).then((r) => r.challenges),
  );
  const [editing, setEditing] = useState<AdminChallenge | 'new' | null>(null);

  return (
    <section aria-labelledby="challenges-admin" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="challenges-admin" className="heading-display text-lg text-white">Missions</h2>
        <button type="button" onClick={() => setEditing('new')} className="btn-primary px-4 py-2 text-sm">
          <Plus className="h-4 w-4" /> New mission
        </button>
      </div>
      <ListState loading={loading} error={error} onRetry={reload} empty={items.length === 0} emptyText="No missions yet." />
      <ul className="space-y-3">
        {items.map((challenge) => (
          <li key={challenge.id} className="panel flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{challenge.title}</p>
              <p className="text-xs text-slate-400">
                {challenge.period} · {challenge.metric} ≥ {challenge.target.toLocaleString()} · +{challenge.xp_reward} XP · +{challenge.coin_reward} coins
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill active={challenge.is_active} />
              <button type="button" onClick={() => setEditing(challenge)} className="btn-ghost px-2.5 py-1.5 text-xs" aria-label={`Edit ${challenge.title}`}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          </li>
        ))}
      </ul>
      <ChallengeForm
        value={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    </section>
  );
}

function ChallengeForm({ value, onClose, onSaved }: { value: AdminChallenge | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const existing = value && value !== 'new' ? value : null;
  const [form, setForm] = useState(() => challengeDraft(existing));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      setForm(challengeDraft(value === 'new' ? null : value));
      setError(null);
    }
  }, [value]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminCall('save_challenge', {
        ...(existing ? { id: existing.id } : {}),
        title: form.title,
        description: form.description,
        metric: form.metric,
        period: form.period,
        target: Number(form.target),
        xpReward: Number(form.xpReward),
        coinReward: Number(form.coinReward),
        isActive: form.isActive,
      });
      showToast('Mission saved.');
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={value !== null} title={existing ? 'Edit mission' : 'New mission'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <TextField label="Title" value={form.title} max={60} onChange={(v) => setForm({ ...form, title: v })} className="sm:col-span-2" />
        <TextField label="Description" value={form.description} max={160} onChange={(v) => setForm({ ...form, description: v })} className="sm:col-span-2" />
        <SelectField label="Metric" value={form.metric} options={CHALLENGE_METRICS} onChange={(v) => setForm({ ...form, metric: v })} />
        <SelectField label="Period" value={form.period} options={['daily', 'weekly'] as const} onChange={(v) => setForm({ ...form, period: v })} />
        <TextField label="Target" value={form.target} numeric onChange={(v) => setForm({ ...form, target: v })} />
        <TextField label="XP reward" value={form.xpReward} numeric onChange={(v) => setForm({ ...form, xpReward: v })} />
        <TextField label="Coin reward" value={form.coinReward} numeric onChange={(v) => setForm({ ...form, coinReward: v })} />
        <label className="flex items-center gap-3 text-sm text-slate-200 sm:pt-6">
          <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="h-4 w-4 accent-cyan-300" />
          Active
        </label>
        {error && <p role="alert" className="text-sm text-neon-rose sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2.5 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm">{saving ? 'Saving...' : 'Save mission'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AchievementManager() {
  const { items, error, loading, reload } = useAsyncList<AdminAchievement>(
    () => adminCall<{ achievements: AdminAchievement[] }>('list_achievements', {}).then((r) => r.achievements),
  );
  const [editing, setEditing] = useState<AdminAchievement | 'new' | null>(null);

  return (
    <section aria-labelledby="achievements-admin" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="achievements-admin" className="heading-display text-lg text-white">Achievements</h2>
        <button type="button" onClick={() => setEditing('new')} className="btn-primary px-4 py-2 text-sm">
          <Plus className="h-4 w-4" /> New achievement
        </button>
      </div>
      <ListState loading={loading} error={error} onRetry={reload} empty={items.length === 0} emptyText="No achievements yet." />
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.key} className="panel flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{item.title}</p>
              <p className="text-xs text-slate-400">
                {item.metric} ≥ {item.threshold.toLocaleString()} · +{item.xp_reward} XP · +{item.coin_reward} coins
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill active={item.is_active} />
              <button type="button" onClick={() => setEditing(item)} className="btn-ghost px-2.5 py-1.5 text-xs" aria-label={`Edit ${item.title}`}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          </li>
        ))}
      </ul>
      <AchievementForm
        value={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    </section>
  );
}

function AchievementForm({ value, onClose, onSaved }: { value: AdminAchievement | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const existing = value && value !== 'new' ? value : null;
  const [form, setForm] = useState(() => achievementDraft(existing));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      setForm(achievementDraft(value === 'new' ? null : value));
      setError(null);
    }
  }, [value]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminCall('save_achievement', {
        key: form.key,
        title: form.title,
        description: form.description,
        icon: form.icon,
        metric: form.metric,
        threshold: Number(form.threshold),
        xpReward: Number(form.xpReward),
        coinReward: Number(form.coinReward),
        isActive: form.isActive,
      });
      showToast('Achievement saved.');
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={value !== null} title={existing ? 'Edit achievement' : 'New achievement'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <TextField label="Key (lowercase)" value={form.key} max={40} disabled={existing !== null} onChange={(v) => setForm({ ...form, key: v })} />
        <TextField label="Title" value={form.title} max={60} onChange={(v) => setForm({ ...form, title: v })} />
        <TextField label="Description" value={form.description} max={160} onChange={(v) => setForm({ ...form, description: v })} className="sm:col-span-2" />
        <SelectField label="Metric" value={form.metric} options={ACHIEVEMENT_METRICS} onChange={(v) => setForm({ ...form, metric: v })} />
        <SelectField label="Icon" value={form.icon} options={ACHIEVEMENT_ICONS} onChange={(v) => setForm({ ...form, icon: v })} />
        <TextField label="Threshold" value={form.threshold} numeric onChange={(v) => setForm({ ...form, threshold: v })} />
        <TextField label="XP reward" value={form.xpReward} numeric onChange={(v) => setForm({ ...form, xpReward: v })} />
        <TextField label="Coin reward" value={form.coinReward} numeric onChange={(v) => setForm({ ...form, coinReward: v })} />
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="h-4 w-4 accent-cyan-300" />
          Active
        </label>
        {error && <p role="alert" className="text-sm text-neon-rose sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2.5 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm">{saving ? 'Saving...' : 'Save achievement'}</button>
        </div>
      </form>
    </Modal>
  );
}

function challengeDraft(item: AdminChallenge | null) {
  return {
    title: item?.title ?? '',
    description: item?.description ?? '',
    metric: item?.metric ?? CHALLENGE_METRICS[0],
    period: item?.period ?? ('daily' as const),
    target: String(item?.target ?? 1),
    xpReward: String(item?.xp_reward ?? 50),
    coinReward: String(item?.coin_reward ?? 25),
    isActive: item?.is_active ?? true,
  };
}

function achievementDraft(item: AdminAchievement | null) {
  return {
    key: item?.key ?? '',
    title: item?.title ?? '',
    description: item?.description ?? '',
    metric: item?.metric ?? ACHIEVEMENT_METRICS[0],
    icon: item?.icon ?? ACHIEVEMENT_ICONS[0],
    threshold: String(item?.threshold ?? 1),
    xpReward: String(item?.xp_reward ?? 50),
    coinReward: String(item?.coin_reward ?? 25),
    isActive: item?.is_active ?? true,
  };
}

function TextField({
  label,
  value,
  onChange,
  max,
  numeric,
  disabled,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  numeric?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const id = `field-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label-eyebrow mb-2 block">{label}</label>
      <input
        id={id}
        className="field"
        value={value}
        maxLength={max}
        disabled={disabled}
        inputMode={numeric ? 'numeric' : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  const id = `select-${label.toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="label-eyebrow mb-2 block">{label}</label>
      <select id={id} className="field" value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${active ? 'bg-neon-mint/10 text-neon-mint' : 'bg-white/5 text-slate-400'}`}>
      {active ? 'Live' : 'Hidden'}
    </span>
  );
}

function ListState({ loading, error, onRetry, empty, emptyText }: { loading: boolean; error: string | null; onRetry: () => void; empty: boolean; emptyText: string }) {
  if (loading) return <StateMessage tone="loading" title="Loading" />;
  if (error) return <StateMessage tone="error" title="Could not load" description={error} action={<button type="button" onClick={onRetry} className="btn-secondary px-4 py-2 text-sm">Try again</button>} />;
  if (empty) return <p className="text-sm text-slate-400">{emptyText}</p>;
  return null;
}
