import { useState, type ReactNode } from 'react';
import { Gauge, LogIn, LogOut, Orbit, Settings, Shield, Trophy, User } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/components/ui/Toast';
import { SettingsModal } from '@/components/SettingsModal';
import { useAuth } from '@/contexts/AuthContext';
import { errorMessage } from '@/lib/edgeFunctions';
import { navigate, useRoute } from '@/lib/router';

type NavItem = {
  path: string;
  label: string;
  icon: typeof Orbit;
  requiresAuth?: boolean;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { path: 'play', label: 'Play', icon: Orbit },
  { path: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: 'dashboard', label: 'Dashboard', icon: Gauge, requiresAuth: true },
  { path: 'profile', label: 'Profile', icon: User, requiresAuth: true },
  { path: 'admin', label: 'Admin', icon: Shield, requiresAuth: true, adminOnly: true },
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const route = useRoute();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { showToast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.requiresAuth) return Boolean(user);
    return true;
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast('You have signed out.');
      navigate('/');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-void-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo compact={false} />

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {visibleItems.map((item) => {
              const active = route.path === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? 'text-neon-cyan' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-neon-cyan shadow-glow-cyan" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSettingsOpen(true)} className="btn-ghost p-2" aria-label="Open settings">
              <Settings className="h-5 w-5" />
            </button>
            {user && profile ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('profile')}
                  className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 transition hover:border-neon-cyan/40 sm:flex"
                >
                  <Avatar avatarKey={profile.avatar_key} size={32} />
                  <span className="max-w-[9rem] truncate text-sm font-semibold text-white">{profile.username}</span>
                </button>
                <button type="button" onClick={handleSignOut} className="btn-ghost p-2" aria-label="Sign out">
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <button type="button" onClick={() => navigate('auth')} className="btn-primary px-4 py-2 text-sm">
                <LogIn className="h-4 w-4" /> Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 sm:px-6 md:pb-8 md:pt-8">{children}</main>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/10 bg-void-900/90 p-2 backdrop-blur-xl md:hidden"
      >
        {visibleItems.slice(0, 5).map((item) => {
          const active = route.path === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
                active ? 'text-neon-cyan' : 'text-slate-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
