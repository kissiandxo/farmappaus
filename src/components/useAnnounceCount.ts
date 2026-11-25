import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** What VoiceOver says when the number of places changes: "1 place", "12 places". */
export function countAnnouncement(count: number): string {
  return count === 1 ? '1 place' : `${count} places`;
}

/** Wait this long after the last change before speaking, so typing or tapping several chips speaks once. */
export const ANNOUNCE_DELAY_MS = 400;

/**
 * Speaks the new count of places on iOS when it changes (VoiceOver ignores `accessibilityLiveRegion`, which is
 * Android-only; keep that prop on the visible text for Android). Debounced 400 ms. Says nothing on the first
 * render, nothing while `enabled` is false, and nothing when only `enabled` changes, so opening a sheet does
 * not repeat a count the person has already heard.
 */
export function useAnnounceCount(count: number, enabled = true): void {
  const last = useRef(count);

  useEffect(() => {
    const changed = last.current !== count;
    last.current = count;
    if (!changed || !enabled || Platform.OS !== 'ios') return;
    const timer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(countAnnouncement(count));
    }, ANNOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [count, enabled]);
}
