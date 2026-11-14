import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { locateMe } from '../lib/locate';
import { useSearch } from '../state/SearchContext';
import { colors, MIN_TAP, radius, space, type } from '../theme';
import { Button, Icon, success } from './ui';

/** Remembers that the person closed the prompt. Versioned so the copy can be shown again after a big change. */
export const LOCATION_PROMPT_DISMISSED_KEY = 'farmdirect.locationPrompt.dismissed.v1';

interface LocationPromptProps {
  /** Opens the suburb search (the location sheet). */
  onChooseSuburb: () => void;
}

type Problem = { text: string; canOpenSettings: boolean } | null;

/**
 * Inset card under the location row while no location has been chosen: explains that distances are from Sydney
 * and offers "Use my location" or "Choose a suburb". Closing it is remembered on this phone; the location row
 * keeps explaining the Sydney default either way. Works without storage (the prompt just shows again next launch).
 */
export function LocationPrompt({ onChooseSuburb }: LocationPromptProps) {
  const { isDefaultLocation, setLocation } = useSearch();
  // null = not read from storage yet; render nothing until then so a dismissed prompt doesn't flash.
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      try {
        const value = await AsyncStorage.getItem(LOCATION_PROMPT_DISMISSED_KEY);
        if (!cancelled) setDismissed(value === '1');
      } catch {
        if (!cancelled) setDismissed(false);
      }
    };
    read();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      AsyncStorage.setItem(LOCATION_PROMPT_DISMISSED_KEY, '1').catch(() => {});
    } catch {
      // Storage unavailable: the prompt stays closed for this session only.
    }
  };

  const useMyLocation = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const result = await locateMe();
    setBusy(false);
    if (!result.ok) {
      setProblem({ text: result.message, canOpenSettings: result.canOpenSettings });
      return;
    }
    success();
    setLocation(result.location);
  };

  if (!isDefaultLocation || dismissed !== false) return null;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Icon name="location.circle" size={28} color={colors.tint} />
        <View style={styles.text}>
          <Text style={styles.title} accessibilityRole="header">
            See what’s near you
          </Text>
          <Text style={styles.body}>
            Places are sorted from Sydney until you set your location.
          </Text>
        </View>
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Close"
          accessibilityHint="Hides this suggestion"
          hitSlop={8}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Icon name="xmark" size={13} weight="semibold" color={colors.secondaryLabel} />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Button
          label="Use my location"
          icon="location.fill"
          variant="tinted"
          size="small"
          loading={busy}
          onPress={useMyLocation}
          accessibilityHint="Asks for your location to measure distances"
        />
        <Button label="Choose a suburb" variant="plain" size="small" onPress={onChooseSuburb} />
      </View>

      {problem && (
        <View style={styles.problem} accessibilityRole="alert">
          <Text style={styles.problemText}>{problem.text}</Text>
          {problem.canOpenSettings && (
            <Button label="Open Settings" variant="plain" size="small" onPress={() => Linking.openSettings()} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cell,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: space.lg,
    gap: space.md,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  text: { flex: 1, gap: 2 },
  title: { ...type.headline, color: colors.label },
  body: { ...type.subheadline, color: colors.secondaryLabel },
  close: {
    width: MIN_TAP,
    height: MIN_TAP,
    marginTop: -space.md,
    marginRight: -space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  problem: {
    padding: space.md,
    gap: space.xs,
    borderRadius: radius.group,
    borderCurve: 'continuous',
    backgroundColor: colors.orangeFill,
  },
  problemText: { ...type.footnote, color: colors.label },
});
