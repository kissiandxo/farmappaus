// Welcome-screen and local Apple profile rules. Pure functions: storage and Apple calls live in AuthContext.

/** AsyncStorage key: has the welcome screen been shown (or skipped) already? */
export const WELCOME_KEY = 'farmdirect.welcome.v1';
/** AsyncStorage key: the Apple profile kept on this phone when no backend is connected. */
export const PROFILE_KEY = 'farmdirect.appleProfile.v1';

/** What we keep on the phone after Sign in with Apple when there is no backend. Never the identity token. */
export interface LocalProfile {
  appleUserId: string;
  givenName: string | null;
  familyName: string | null;
  email: string | null;
}

/** What Apple handed back on one sign-in. Name and email are only sent the first time. */
export interface AppleDetails {
  appleUserId: string;
  givenName?: string | null;
  familyName?: string | null;
  email?: string | null;
}

export interface WelcomeState {
  /** The saved flag has been read from storage. */
  loaded: boolean;
  /** The flag says the welcome screen was already shown. */
  seen: boolean;
  /** Already signed in with an account or an Apple profile. */
  signedIn: boolean;
}

/** Show the welcome screen once, on first launch, after storage has been read. */
export function shouldShowWelcome({ loaded, seen, signedIn }: WelcomeState): boolean {
  return loaded && !seen && !signedIn;
}

const clean = (value: string | null | undefined): string | null => {
  const text = value?.trim();
  return text ? text : null;
};

/**
 * Combines what we already hold with a new Apple sign-in. A missing or blank value never overwrites
 * a saved one (Apple only sends name and email the first time). A different Apple user starts fresh.
 */
export function mergeAppleProfile(existing: LocalProfile | null, incoming: AppleDetails): LocalProfile {
  const base = existing && existing.appleUserId === incoming.appleUserId ? existing : null;
  return {
    appleUserId: incoming.appleUserId,
    givenName: clean(incoming.givenName) ?? base?.givenName ?? null,
    familyName: clean(incoming.familyName) ?? base?.familyName ?? null,
    email: clean(incoming.email) ?? base?.email ?? null,
  };
}

/** Reads the stored JSON back. Returns null for anything that is not a usable profile. */
export function parseLocalProfile(raw: string | null | undefined): LocalProfile | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (typeof o.appleUserId !== 'string' || !o.appleUserId.trim()) return null;
  const str = (v: unknown) => (typeof v === 'string' ? clean(v) : null);
  return {
    appleUserId: o.appleUserId,
    givenName: str(o.givenName),
    familyName: str(o.familyName),
    email: str(o.email),
  };
}

/** Name to show for a profile: full name, else email, else a plain fallback. */
export function displayName(profile: Pick<LocalProfile, 'givenName' | 'familyName' | 'email'> | null | undefined): string {
  if (!profile) return 'Apple account';
  const name = [profile.givenName, profile.familyName].map(clean).filter(Boolean).join(' ');
  return name || clean(profile.email) || 'Apple account';
}
