import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** Only Android needs `tracksViewChanges`; Apple Maps on iOS redraws custom marker views by itself. */
const NEEDS_TRACKING = Platform.OS === 'android';

/**
 * `tracksViewChanges` value for a marker. On Android: true while its look is new (so the map redraws it),
 * then false shortly after, which is cheaper. Pass a string that changes whenever the pin's look does.
 * On iOS and web: always false, with no timer.
 */
export function useTracksViewChanges(lookKey: string): boolean {
  const [settledKey, setSettledKey] = useState<string | null>(null);
  useEffect(() => {
    if (!NEEDS_TRACKING) return;
    const timer = setTimeout(() => setSettledKey(lookKey), 300);
    return () => clearTimeout(timer);
  }, [lookKey]);
  return NEEDS_TRACKING && settledKey !== lookKey;
}
