import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDateAu } from '../domain/format';
import { useSearch } from '../state/SearchContext';
import { colors, font, MIN_TAP, radius, space } from '../theme';

/** Tells people what they are looking at: sample data, saved (offline) listings, or a problem. */
export function DataBanner() {
  const { dataStatus, refresh } = useSearch();

  if (dataStatus.kind === 'live') return null;

  if (dataStatus.kind === 'sample') {
    return (
      <View style={[styles.box, styles.sample]} accessible accessibilityRole="alert">
        <Text style={[styles.title, { color: colors.sampleText }]}>Sample data</Text>
        <Text style={[styles.text, { color: colors.sampleText }]}>
          These listings are made up so we can test the app. No real farms are shown yet.
        </Text>
      </View>
    );
  }

  if (dataStatus.kind === 'loading') {
    return (
      <View style={[styles.box, styles.info]} accessible>
        <Text style={styles.text}>Loading listings…</Text>
      </View>
    );
  }

  if (dataStatus.kind === 'cached') {
    return (
      <View style={[styles.box, styles.info]} accessible accessibilityRole="alert">
        <Text style={styles.title}>Saved listings</Text>
        <Text style={styles.text}>
          Showing listings saved on {formatDateAu(dataStatus.at)}.
          {dataStatus.failed ? ' We couldn’t update them just now.' : ''} Pull down to refresh when you have
          reception.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.box, styles.error]} accessible accessibilityRole="alert">
      <Text style={styles.title}>We couldn’t load listings</Text>
      <Text style={styles.text}>Check your connection and try again.</Text>
      <Pressable onPress={refresh} accessibilityRole="button" style={styles.retry}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginHorizontal: space.lg, borderRadius: radius.card, padding: space.lg, gap: space.xs },
  sample: { backgroundColor: colors.sampleBackground },
  info: { backgroundColor: colors.chip },
  error: { backgroundColor: '#F6D9CF' },
  title: { fontSize: font.large, fontWeight: '700', color: colors.text },
  text: { fontSize: font.body, color: colors.text },
  retry: {
    minHeight: MIN_TAP,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: space.xl,
    borderRadius: radius.chip,
    backgroundColor: colors.accent,
    marginTop: space.sm,
  },
  retryText: { fontSize: font.body, fontWeight: '700', color: colors.onPrimary },
});
