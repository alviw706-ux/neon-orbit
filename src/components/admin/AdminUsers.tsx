import { useEffect, useState, type FormEvent } from 'react';
import { Ban, Coins, Search, ShieldCheck, ShieldOff, UserCheck } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { StateMessage } from '@/components/ui/StateMessage';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { adminCall, type AdminUser } from '@/lib/adminApi';
import { errorMessage } from '@/lib/edgeFunctions';

const SEARCH_PATTERN = /^[A-Za-z0-9_]{0,16}$/;

export function AdminUsers() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [coinTarget, setCoinTarget] = useState<AdminUser | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    adminCall<{ users: AdminUser[] }>('list_users', { search: query })
      .then((result) => {
        if (active) setUsers(result.users);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [query, refresh]);

  const runAction = async (target: AdminUser, action: string, body: Record<string, unknown>, success: string) => {
    setBusyId(target.id);
    try {
      await adminCall(action, { userId: target.id, ...body });
      showToast(success);
      setRefresh((value) => value + 1);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = search.trim();
    if (!SEARCH_PATTERN.test(trimmed)) {
      showToast('Search can only use letters, numbers and underscores.', 'error');
      return;
    }
    setQuery(trimmed);
  };

  return (
    <section aria-label="Users" className="space-y-5">
      <form onSubmit={handleSearch} className="flex max-w-md gap-2">
        <label htmlFor="user-search" className="sr-only">
          Search pilots by name
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            id="user-search"
            className="field pl-10"
            value={search}
            maxLength={16}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by pilot name"
          />
        </div>
        <button type="submit" className="btn-secondary px-4 py-3 text-sm">
          Search
        </button>
      </form>

      {error && <StateMessage tone="error" title="Pilots could not be loaded" description={error} />}
      {!error && !users && <StateMessage tone="loading" title="Loading pilots" />}
      {users && users.length === 0 && <StateMessage tone="empty" title="No pilots found" description="Try a different name." />}

      {users && users.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-void-800/80 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Pilot</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Role</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">XP</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Coins</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {users.map((row) => {
                  const isSelf = row.id === user?.id;
                  const busy = busyId === row.id;
                  return (
                    <tr key={row.id} className="text-slate-200">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-3">
                          <Avatar avatarKey={row.avatar_key} size={32} />
                          <span className="font-semibold text-white">
                            {row.username}
                            {isSelf && <span className="ml-2 text-xs text-neon-cyan">(you)</span>}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3 capitalize">{row.role}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{row.xp.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{row.coins.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-semibold ${
                            row.is_banned ? 'bg-neon-rose/15 text-neon-rose' : 'bg-neon-mint/10 text-neon-mint'
                          }`}
                        >
                          {row.is_banned ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={isSelf || busy}
                            onClick={() => void runAction(row, 'set_banned', { banned: !row.is_banned }, row.is_banned ? 'Pilot reinstated.' : 'Pilot suspended.')}
                            className="btn-ghost px-2.5 py-1.5 text-xs"
                          >
                            {row.is_banned ? <UserCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                            {row.is_banned ? 'Reinstate' : 'Suspend'}
                          </button>
                          <button
                            type="button"
                            disabled={isSelf || busy}
                            onClick={() =>
                              void runAction(
                                row,
                                'set_role',
                                { role: row.role === 'admin' ? 'player' : 'admin' },
                                row.role === 'admin' ? 'Admin access removed.' : 'Admin access granted.',
                              )
                            }
                            className="btn-ghost px-2.5 py-1.5 text-xs"
                          >
                            {row.role === 'admin' ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            {row.role === 'admin' ? 'Remove admin' : 'Make admin'}
                          </button>
                          <button type="button" disabled={busy} onClick={() => setCoinTarget(row)} className="btn-ghost px-2.5 py-1.5 text-xs">
                            <Coins className="h-3.5 w-3.5" /> Adjust coins
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CoinAdjustModal
        target={coinTarget}
        onClose={() => setCoinTarget(null)}
        onDone={() => {
          setCoinTarget(null);
          setRefresh((value) => value + 1);
        }}
      />
    </section>
  );
}

function CoinAdjustModal({ target, onClose, onDone }: { target: AdminUser | null; onClose: () => void; onDone: () => void }) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState('100');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setAmount('100');
      setReason('');
      setError(null);
    }
  }, [target]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target) return;
    const value = Number(amount);
    if (!Number.isInteger(value) || value === 0) {
      setError('Enter a whole number other than zero. Use a minus sign to deduct.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminCall('adjust_coins', { userId: target.id, amount: value, reason: reason.trim() });
      showToast(`Wallet updated for ${target.username}.`);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={target !== null} title={`Adjust coins${target ? `: ${target.username}` : ''}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="coin-amount" className="label-eyebrow mb-2 block">Amount</label>
          <input id="coin-amount" className="field" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <div>
          <label htmlFor="coin-reason" className="label-eyebrow mb-2 block">Reason</label>
          <input id="coin-reason" className="field" value={reason} maxLength={120} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Beta tester reward" />
        </div>
        {error && <p role="alert" className="text-sm text-neon-rose">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2.5 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm">
            {saving ? 'Saving...' : 'Apply adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
