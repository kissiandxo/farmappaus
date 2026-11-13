import { Pressable, StyleSheet, Text, View } from 'react-native';

import { activeFilterCount } from '../domain/filters';
import { useSearch } from '../state/SearchContext';
import { colors, font, MIN_TAP, radius, space } from '../theme';

interface LocationBarProps {
  onChangeLocation: () => void;
  onOpenFilters: () => void;
}

/** Compact bar shown above the list and the map: where we are searching from, and filters. */
export function LocationBar({ onChangeLocation, onOpenFilters }: LocationBarProps) {
  const { location, filters, results } = useSearch();
  const filterCount = activeFilterCount(filters);
  const count = results.length === 1 ? '1 place' : `${results.length} places`;

  return (
    <View style={styles.bar}>
      <Text style={styles.where} accessibilityRole="header">
        {location.source === 'default' ? 'Showing distances from ' : 'Near '}
        <Text style={styles.whereName}>{location.label}</Text>
      </Text>
      {location.source === 'default' && (
        <Text style={styles.hint}>Set your location to see real distances.</Text>
      )}

      <View style={styles.buttons}>
        <Pressable
          onPress={onChangeLocation}
          accessibilityRole="button"
          accessibilityLabel="Change location"
          style={[styles.button, location.source === 'default' ? styles.primary : styles.secondary]}
        >
          <Text style={[styles.buttonText, location.source === 'default' && styles.primaryText]}>
            {location.source === 'default' ? 'Set my location' : 'Change location'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onOpenFilters}
          accessibilityRole="button"
          accessibilityLabel={`Filters, ${filterCount} on`}
          style={[styles.button, styles.secondary]}
        >
          <Text style={styles.buttonText}>{filterCount > 0 ? `Filters (${filterCount})` : 'Filters'}</Text>
        </Pressable>
      </View>

      <Text style={styles.count} accessibilityLiveRegion="polite">
        {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    padding: space.lg,
    gap: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  where: { fontSize: font.body, color: colors.textMuted },
  whereName: { fontWeight: '700', color: colors.text, fontSize: font.large },
  hint: { fontSize: font.small, color: colors.accent, fontWeight: '600' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  button: {
    minHeight: MIN_TAP,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.chip,
    borderWidth: 2,
  },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  secondary: { backgroundColor: colors.chip, borderColor: colors.border },
  buttonText: { fontSize: font.body, fontWeight: '700', color: colors.text },
  primaryText: { color: colors.onPrimary },
  count: { fontSize: font.large, fontWeight: '700', color: colors.primary },
});
