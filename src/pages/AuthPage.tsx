import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { Avatar, AVATAR_CHOICES } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { errorMessage } from '@/lib/edgeFunctions';
import { navigate, useRoute } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import type { AvatarKey } from '@/types/database';

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

export function AuthPage() {
  const route = useRoute();
  const { signIn, signUp, user } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>(route.params.get('mode') === 'signup' ? 'signup' : 'signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarKey, setAvatarKey] = useState<AvatarKey>('nova');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate('play');
  }, [user]);

  const isSignUp = mode === 'signup';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Your password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        const trimmedName = username.trim();
        if (!USERNAME_PATTERN.test(trimmedName)) {
          setError('Choose a username with 3 to 16 letters, numbers or underscores.');
          return;
        }
        const { data, error: rpcError } = await supabase.rpc('is_username_available', { p_username: trimmedName });
        if (rpcError) throw new Error('We could not check that username. Please try again.');
        if (data !== true) {
          setError('That username is already taken. Try another one.');
          return;
        }
        await signUp(trimmedName, trimmedEmail, password, avatarKey);
        showToast('Welcome to NEON ORBIT, pilot.');
      } else {
        await signIn(trimmedEmail, password);
        showToast('Signed in. Good luck out there.');
      }
      navigate('play');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[1fr_1.1fr]">
      <div className="hidden md:block">
        <Logo />
        <h1 className="heading-display mt-8 text-4xl leading-tight text-white">Enter the orbit.</h1>
        <p className="mt-4 text-slate-400">
          Create a pilot profile to save runs, earn XP and coins, unlock achievements and climb the global leaderboard.
        </p>
      </div>

      <div className="panel p-6 sm:p-8">
        <div role="tablist" aria-label="Authentication mode" className="mb-6 grid grid-cols-2 rounded-xl border border-white/10 bg-void-900/80 p-1">
          {(['signin', 'signup'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => {
                setMode(value);
                setError(null);
              }}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === value ? 'bg-neon-cyan/15 text-neon-cyan' : 'text-slate-400 hover:text-white'
              }`}
            >
              {value === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {isSignUp && (
            <>
              <div>
                <label htmlFor="username" className="label-eyebrow mb-2 block">
                  Pilot name
                </label>
                <input
                  id="username"
                  className="field"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="e.g. nova_pilot"
                  autoComplete="username"
                  maxLength={16}
                />
                <p className="mt-1.5 text-xs text-slate-500">3 to 16 letters, numbers or underscores.</p>
              </div>
              <fieldset>
                <legend className="label-eyebrow mb-2">Choose an avatar</legend>
                <div className="grid grid-cols-4 gap-3">
                  {AVATAR_CHOICES.map((choice) => {
                    const selected = avatarKey === choice.key;
                    return (
                      <button
                        key={choice.key}
                        type="button"
                        onClick={() => setAvatarKey(choice.key)}
                        aria-pressed={selected}
                        aria-label={choice.label}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
                          selected ? 'border-neon-cyan/60 bg-neon-cyan/10' : 'border-white/10 hover:border-white/25'
                        }`}
                      >
                        <Avatar avatarKey={choice.key} size={40} />
                        <span className="text-[11px] text-slate-300">{choice.label}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </>
          )}

          <div>
            <label htmlFor="email" className="label-eyebrow mb-2 block">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="pilot@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="label-eyebrow mb-2 block">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-neon-rose/30 bg-neon-rose/10 px-4 py-3 text-sm text-neon-rose">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : isSignUp ? (
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            ) : (
              <LogIn className="h-4 w-4" aria-hidden="true" />
            )}
            {isSignUp ? 'Create my pilot profile' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
