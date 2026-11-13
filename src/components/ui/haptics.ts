/**
 * Tiny, safe haptics wrappers. They no-op off iOS and never throw or reject.
 * Use for toggles (save a farm) and selection changes; not for plain navigation.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function run(fn: () => Promise<void>): void {
  if (Platform.OS !== 'ios') return;
  try {
    fn().catch(() => {});
  } catch {
    // Haptics are a nicety; ignore failures.
  }
}

/** Light impact: a button-like tap such as saving a farm. */
export function tapLight(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Selection tick: changing a chip, segment or picker value. */
export function selection(): void {
  run(() => Haptics.selectionAsync());
}

/** Success notification: a completed save or submit. */
export function success(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
