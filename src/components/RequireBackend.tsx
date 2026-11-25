import { Redirect } from 'expo-router';
import type { ComponentType } from 'react';

import { useAuth } from '../state/AuthContext';

/**
 * Wraps a screen that only works with accounts (suggest, report, claim, farmer tools, admin, email sign-in).
 * Without a backend nothing links here, but a deep link could still arrive, so send the person to the tabs
 * instead of showing a dead end.
 */
export function requireBackend<P extends object>(Screen: ComponentType<P>): ComponentType<P> {
  function Guarded(props: P) {
    const { available } = useAuth();
    if (!available) return <Redirect href="/(tabs)/(explore)" />;
    return <Screen {...props} />;
  }
  Guarded.displayName = `requireBackend(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return Guarded;
}
