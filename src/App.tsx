import { useEffect, type ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StateMessage } from '@/components/ui/StateMessage';
import { useAuth } from '@/contexts/AuthContext';
import { navigate, useRoute } from '@/lib/router';
import { AdminPage } from '@/pages/AdminPage';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { HomePage } from '@/pages/HomePage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { PlayPage } from '@/pages/PlayPage';
import { ProfilePage } from '@/pages/ProfilePage';

function Guarded({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  const { loading } = useAuth();
  const blocked = !loading && !allowed;

  useEffect(() => {
    if (blocked) navigate('auth');
  }, [blocked]);

  if (loading) {
    return <StateMessage tone="loading" title="Loading your pilot profile" />;
  }
  if (blocked) return null;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="label-eyebrow">Off the map</p>
      <h1 className="heading-display mt-3 text-3xl text-white">This orbit does not exist</h1>
      <button type="button" onClick={() => navigate('home')} className="btn-primary mt-8 px-6 py-3">
        Back to home
      </button>
    </div>
  );
}

function App() {
  const route = useRoute();
  const { user, isAdmin } = useAuth();

  let page: ReactNode;
  switch (route.path) {
    case 'home':
      page = <HomePage />;
      break;
    case 'auth':
      page = <AuthPage />;
      break;
    case 'play':
      page = <PlayPage />;
      break;
    case 'leaderboard':
      page = <LeaderboardPage />;
      break;
    case 'dashboard':
      page = (
        <Guarded allowed={Boolean(user)}>
          <DashboardPage />
        </Guarded>
      );
      break;
    case 'profile':
      page = (
        <Guarded allowed={Boolean(user)}>
          <ProfilePage />
        </Guarded>
      );
      break;
    case 'admin':
      page = (
        <Guarded allowed={isAdmin}>
          <AdminPage />
        </Guarded>
      );
      break;
    default:
      page = <NotFound />;
  }

  return <AppShell>{page}</AppShell>;
}

export default App;
