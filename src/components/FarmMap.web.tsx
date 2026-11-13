import { StyleSheet, View } from 'react-native';

import type { FarmResult } from '../domain/filters';
import type { UserLocation } from '../state/SearchContext';
import { colors, space } from '../theme';
import { EmptyState } from './ui';

interface FarmMapProps {
  results: FarmResult[];
  location: UserLocation;
}

/** The map is native-only. This stand-in keeps the browser preview working. */
export default function FarmMap({ results, location }: FarmMapProps) {
  return (
    <View style={styles.box}>
      <EmptyState
        icon="map"
        title="Map preview is available in the iPhone app"
        message={`${results.length} places near ${location.label} would be pinned here.`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.groupedBackground, padding: space.lg },
});
