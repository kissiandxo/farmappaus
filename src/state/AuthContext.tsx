import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { isBackendConfigured, supabase } from '../lib/supabase';

export type Role = 'user' | 'farmer' | 'admin';

export interface AuthResult {
  ok: boolean;
  /** Plain-English message to show the person. */
  message: string;
}

interface AuthState {
  /** False when no backend is connected (sample mode): accounts are hidden. */
  available: boolean;
  /** True once the saved session (if any) has been checked. */
  ready: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  role: Role | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  becomeFarmer: () => Promise<AuthResult>;
  deleteAccount: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Turns technical errors into something a non-technical person can act on. */
export function friendlyAuthError(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login')) return 'That email or password isn’t right. Please try again.';
  if (m.includes('not confirmed')) return 'Please confirm your email first. Check your inbox for our message.';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'There is already an account with that email. Try signing in instead.';
  }
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many tries. Please wait a few minutes and try again.';
  if (m.includes('network') || m.includes('fetch') || m.includes('timeout')) {
    return 'No connection right now. Please try again when you have reception.';
  }
  if (m.includes('password')) return 'That password isn’t strong enough. Try a longer one.';
  return 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(!isBackendConfigured);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {})
      .finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const loadRole = useCallback(async () => {
    if (!supabase || !userId) {
      setRole(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    setRole((data?.role as Role | undefined) ?? 'user');
  }, [userId]);

  useEffect(() => {
    loadRole().catch(() => {});
  }, [loadRole]);

  const signIn = useCallback<AuthState['signIn']>(async (email, password) => {
    if (!supabase) return { ok: false, message: 'Accounts are not available in this version.' };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, message: friendlyAuthError(error.message) } : { ok: true, message: 'Signed in.' };
  }, []);

  const signUp = useCallback<AuthState['signUp']>(async (email, password) => {
    if (!supabase) return { ok: false, message: 'Accounts are not available in this version.' };
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { ok: false, message: friendlyAuthError(error.message) };
    return data.session
      ? { ok: true, message: 'Your account is ready.' }
      : { ok: true, message: 'Check your email and tap the link to confirm your account, then sign in.' };
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const becomeFarmer = useCallback<AuthState['becomeFarmer']>(async () => {
    if (!supabase) return { ok: false, message: 'Accounts are not available in this version.' };
    const { error } = await supabase.rpc('become_farmer');
    if (error) return { ok: false, message: friendlyAuthError(error.message) };
    await loadRole();
    return { ok: true, message: 'You can now create a listing.' };
  }, [loadRole]);

  const deleteAccount = useCallback<AuthState['deleteAccount']>(async () => {
    if (!supabase) return { ok: false, message: 'Accounts are not available in this version.' };
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return { ok: false, message: friendlyAuthError(error.message) };
    await supabase.auth.signOut();
    return { ok: true, message: 'Your account has been deleted.' };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      available: isBackendConfigured,
      ready,
      session,
      userId,
      email: session?.user.email ?? null,
      role,
      signIn,
      signUp,
      signOut,
      becomeFarmer,
      deleteAccount,
    }),
    [ready, session, userId, role, signIn, signUp, signOut, becomeFarmer, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
