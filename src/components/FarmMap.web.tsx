import { StyleSheet, Text, View } from 'react-native';

import type { FarmResult } from '../domain/filters';
import type { UserLocation } from '../state/SearchContext';
import { colors, font, space } from '../theme';

interface FarmMapProps {
  results: FarmResult[];
  location: UserLocation;
}

/** The map is native-only. This stand-in keeps the browser preview working. */
export default function FarmMap({ results, location }: FarmMapProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Map preview is available in the iPhone app</Text>
      <Text style={styles.text}>
        {results.length} places near {location.label} would be pinned here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm, backgroundColor: colors.chip },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text, textAlign: 'center' },
  text: { fontSize: font.body, color: colors.textMuted, textAlign: 'center' },
});
