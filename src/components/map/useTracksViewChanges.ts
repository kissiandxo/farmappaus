import { useEffect, useState } from 'react';

/**
 * `tracksViewChanges` value for a marker: true while its look is new (so the map redraws it), then
 * false shortly after, which is cheaper. Pass a string that changes whenever the pin's look does.
 */
export function useTracksViewChanges(lookKey: string): boolean {
  const [settledKey, setSettledKey] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSettledKey(lookKey), 300);
    return () => clearTimeout(timer);
  }, [lookKey]);
  return settledKey !== lookKey;
}
