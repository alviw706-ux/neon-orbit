import { useEffect, useState } from 'react';
import { Activity, BarChart3, Gauge, Medal, Shield, Trophy, Users, type LucideIcon } from 'lucide-react';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminContent } from '@/components/admin/AdminContent';
import { AdminActivity, AdminLeaderboard } from '@/components/admin/AdminActivity';
import { StateMessage } from '@/components/ui/StateMessage';
import { useAuth } from '@/contexts/AuthContext';
import { errorMessage } from '@/lib/edgeFunctions';
import { navigate } from '@/lib/router';
import { adminCall, type AdminStats } from '@/lib/adminApi';

type Tab = 'overview' | 'users' | 'content' | 'activity' | 'leaderboard';

const TABS: { value: Tab; label: string; icon: LucideIcon }[] = [
  { value: 'overview', label: 'Overview', icon: Gauge },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'content', label: 'Missions & rewards', icon: Medal },
  { value: 'activity', label: 'Activity', icon: Activity },
  { value: 'leaderboard', label: 'Leaderboard', icon: Trophy },
];

export function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  if (loading) return <StateMessage tone="loading" title="Checking access" />;

  if (!user || !isAdmin) {
    return (
      <StateMessage
        tone="error"
        icon={Shield}
        title="Admin access required"
        description="This area is only available to NEON ORBIT administrators."
        action={
          <button type="button" onClick={() => navigate('play')} className="btn-secondary px-4 py-2 text-sm">
            Back to the game
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label-eyebrow">Control room</p>
          <h1 className="heading-display mt-2 text-3xl text-white sm:text-4xl">Admin dashboard</h1>
        </div>
        <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-void-900/80 p-1">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                  active ? 'bg-neon-cyan/15 text-neon-cyan' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {tab === 'overview' && <AdminOverview />}
      {tab === 'users' && <AdminUsers />}
      {tab === 'content' && <AdminContent />}
      {tab === 'activity' && <AdminActivity />}
      {tab === 'leaderboard' && <AdminLeaderboard />}
    </div>
  );
}

function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    adminCall<AdminStats>('stats', {})
      .then((result) => {
        if (active) setStats(result);
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
        title="Stats unavailable"
        description={error}
        action={
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="btn-secondary px-4 py-2 text-sm">
            Try again
          </button>
        }
      />
    );
  }
  if (!stats) return <StateMessage tone="loading" title="Loading stats" />;

  const cards: { label: string; value: string; icon: LucideIcon }[] = [
    { label: 'Pilots', value: stats.players.toLocaleString(), icon: Users },
    { label: 'Runs total', value: stats.runs.toLocaleString(), icon: BarChart3 },
    { label: 'Runs in 24h', value: stats.runsToday.toLocaleString(), icon: Activity },
    { label: 'Active missions', value: stats.activeChallenges.toLocaleString(), icon: Medal },
    { label: 'Suspended pilots', value: stats.bannedPlayers.toLocaleString(), icon: Shield },
    { label: 'Highest score', value: stats.highestScore.toLocaleString(), icon: Trophy },
    { label: 'Coins in circulation', value: stats.coinsInCirculation.toLocaleString(), icon: Gauge },
  ];

  return (
    <section aria-label="Platform statistics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="panel p-5">
            <Icon className="mb-4 h-5 w-5 text-neon-cyan" aria-hidden="true" />
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
            <p className="font-display mt-1 text-xl tabular-nums text-white">{card.value}</p>
          </div>
        );
      })}
    </section>
  );
}
