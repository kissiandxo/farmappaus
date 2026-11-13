import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  mergeAppleProfile,
  parseLocalProfile,
  PROFILE_KEY,
  WELCOME_KEY,
  type LocalProfile,
} from '../domain/onboarding';
import { isBackendConfigured, supabase } from '../lib/supabase';

export type Role = 'user' | 'farmer' | 'admin';

export interface AuthResult {
  ok: boolean;
  /** Plain-English message to show the person. */
  message: string;
}

interface AuthState {
  /** False when the app runs without a backend: there are no accounts and no sign-in. */
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
  /** Apple profile saved on this phone by an earlier version, or not yet linked to an account. Shown and removable; never created without a backend. */
  localProfile: LocalProfile | null;
  /** True when Sign in with Apple can run on this device (iOS, not web or Jest). */
  appleAvailable: boolean;
  /** Runs the Apple flow. A cancelled sheet returns `{ ok: false, message: '' }`: show nothing. */
  signInWithApple: () => Promise<AuthResult>;
  removeLocalProfile: () => Promise<void>;
  /** null until the saved flag has been read. */
  welcomeSeen: boolean | null;
  markWelcomeSeen: () => void;
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

const APPLE_CANCELLED = 'ERR_REQUEST_CANCELED';
const UNAVAILABLE = 'Accounts aren’t available right now.';

/** Random hex string used as the Apple nonce. */
function randomNonce(): string {
  return Array.from(Crypto.getRandomBytes(16), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(!isBackendConfigured);
  const userId = session?.user.id ?? null;
  const [localProfile, setLocalProfile] = useState<LocalProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
    // Read both together so the welcome gate never decides before it knows about a saved profile.
    Promise.all([AsyncStorage.getItem(WELCOME_KEY), AsyncStorage.getItem(PROFILE_KEY)])
      .then(([flag, raw]) => {
        setLocalProfile(parseLocalProfile(raw));
        setWelcomeSeen(flag === '1');
      })
      .catch(() => setWelcomeSeen(false))
      .finally(() => setProfileLoaded(true));
  }, []);

  const removeLocalProfile = useCallback(async () => {
    setLocalProfile(null);
    await AsyncStorage.removeItem(PROFILE_KEY).catch(() => {});
  }, []);

  // On launch, and whenever Apple reports a revoked sign-in, drop a profile Apple no longer vouches for.
  const appleUserId = localProfile?.appleUserId ?? null;
  useEffect(() => {
    if (!profileLoaded || !appleAvailable || !appleUserId) return;
    let cancelled = false;
    AppleAuthentication.getCredentialStateAsync(appleUserId)
      .then((state) => {
        if (cancelled) return;
        if (
          state === AppleAuthentication.AppleAuthenticationCredentialState.REVOKED ||
          state === AppleAuthentication.AppleAuthenticationCredentialState.NOT_FOUND
        ) {
          removeLocalProfile().catch(() => {});
        }
      })
      .catch(() => {});
    const subscription = AppleAuthentication.addRevokeListener(() => {
      removeLocalProfile().catch(() => {});
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [profileLoaded, appleAvailable, appleUserId, removeLocalProfile]);

  const markWelcomeSeen = useCallback(() => {
    setWelcomeSeen(true);
    AsyncStorage.setItem(WELCOME_KEY, '1').catch(() => {});
  }, []);

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
    if (!supabase) return { ok: false, message: UNAVAILABLE };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, message: friendlyAuthError(error.message) } : { ok: true, message: 'Signed in.' };
  }, []);

  const signUp = useCallback<AuthState['signUp']>(async (email, password) => {
    if (!supabase) return { ok: false, message: UNAVAILABLE };
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { ok: false, message: friendlyAuthError(error.message) };
    return data.session
      ? { ok: true, message: 'Your account is ready.' }
      : { ok: true, message: 'Check your email and tap the link to confirm your account, then sign in.' };
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const signInWithApple = useCallback<AuthState['signInWithApple']>(async () => {
    const failed = { ok: false, message: 'Apple sign-in didn’t work. Please try again.' };
    // Without a backend there is nothing to sign in to, and no profile is ever created on the phone.
    if (!supabase) return { ok: false, message: UNAVAILABLE };
    try {
      // The nonce only matters when Supabase checks the token. Apple gets the hash, Supabase the raw value.
      const rawNonce = randomNonce();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      const merged = mergeAppleProfile(localProfile, {
        appleUserId: credential.user,
        givenName: credential.fullName?.givenName,
        familyName: credential.fullName?.familyName,
        email: credential.email,
      });

      if (!credential.identityToken) return failed;
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (error) return { ok: false, message: friendlyAuthError(error.message) };
      if (merged.givenName || merged.familyName) {
        const fullName = [merged.givenName, merged.familyName].filter(Boolean).join(' ');
        await supabase.auth
          .updateUser({ data: { full_name: fullName, given_name: merged.givenName, family_name: merged.familyName } })
          .catch(() => {});
      }
      // The account now holds the name, so the copy on this phone is no longer needed.
      await removeLocalProfile();
      return { ok: true, message: 'You’re signed in.' };
    } catch (e) {
      if ((e as { code?: string } | null)?.code === APPLE_CANCELLED) return { ok: false, message: '' };
      return failed;
    }
  }, [localProfile, removeLocalProfile]);

  const becomeFarmer = useCallback<AuthState['becomeFarmer']>(async () => {
    if (!supabase) return { ok: false, message: UNAVAILABLE };
    const { error } = await supabase.rpc('become_farmer');
    if (error) return { ok: false, message: friendlyAuthError(error.message) };
    await loadRole();
    return { ok: true, message: 'You can now create a listing.' };
  }, [loadRole]);

  const deleteAccount = useCallback<AuthState['deleteAccount']>(async () => {
    if (!supabase) return { ok: false, message: UNAVAILABLE };
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
      localProfile,
      appleAvailable,
      signInWithApple,
      removeLocalProfile,
      welcomeSeen,
      markWelcomeSeen,
      becomeFarmer,
      deleteAccount,
    }),
    [
      ready,
      session,
      userId,
      role,
      signIn,
      signUp,
      signOut,
      localProfile,
      appleAvailable,
      signInWithApple,
      removeLocalProfile,
      welcomeSeen,
      markWelcomeSeen,
      becomeFarmer,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
