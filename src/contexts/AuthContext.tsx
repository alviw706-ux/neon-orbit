import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AvatarKey, Profile } from '@/types/database';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string, avatarKey: AvatarKey) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<{ profile: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_key, role, xp, coins, is_banned, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) return { profile: null, error: 'We could not load your player profile. Please try again.' };
  return { profile: (data as Profile | null) ?? null, error: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    const result = await fetchProfile(nextSession.user.id);
    setProfile(result.profile);
    setProfileError(result.error);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      (async () => {
        await applySession(data.session);
        if (active) setLoading(false);
      })();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      (async () => {
        await applySession(nextSession);
      })();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [applySession]);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    const result = await fetchProfile(session.user.id);
    setProfile(result.profile);
    setProfileError(result.error);
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendlyAuthError(error.message));
  }, []);

  const signUp = useCallback(async (username: string, email: string, password: string, avatarKey: AvatarKey) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw new Error(friendlyAuthError(error.message));
    if (!data.session || !data.user) return;
    const { error: avatarError } = await supabase
      .from('profiles')
      .update({ avatar_key: avatarKey })
      .eq('id', data.user.id);
    if (avatarError) throw new Error('Your account was created, but we could not save your avatar. You can change it in your profile.');
    const result = await fetchProfile(data.user.id);
    setProfile(result.profile);
    setProfileError(result.error);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('Sign out failed. Please try again.');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileError,
      isAdmin: profile?.role === 'admin',
      refreshProfile,
      signIn,
      signUp,
      signOut,
    }),
    [session, profile, loading, profileError, refreshProfile, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login')) return 'Email or password is incorrect.';
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('password should be at least')) return 'Your password must be at least 6 characters.';
  if (lower.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.';
  if (lower.includes('fetch') || lower.includes('network')) return 'Network error. Check your connection and try again.';
  if (lower.includes('valid username')) return 'Choose a username with 3 to 16 letters, numbers or underscores.';
  if (lower.includes('database error')) return 'We could not create your account. The username may already be taken.';
  return message;
}
