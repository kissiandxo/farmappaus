import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FarmMap from '../../../components/FarmMap';
import { FiltersModal } from '../../../components/FiltersModal';
import { LocationModal } from '../../../components/LocationModal';
import { Icon } from '../../../components/ui';
import { activeFilterCount } from '../../../domain/filters';
import { useSearch } from '../../../state/SearchContext';
import { colors, MIN_TAP, radius, space, type } from '../../../theme';

export default function MapScreen() {
  const { results, location, filters } = useSearch();
  const insets = useSafeAreaInsets();
  const [locationOpen, setLocationOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterCount = activeFilterCount(filters);

  return (
    <View style={styles.screen}>
      <View style={styles.map}>
        <FarmMap results={results} location={location} />
      </View>

      {/* Floating capsules over the full-bleed map, below the status bar. Taps outside them reach the map. */}
      <View style={[styles.controls, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <Pressable
          onPress={() => setLocationOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Change location"
          style={({ pressed }) => [styles.capsule, styles.location, pressed && styles.pressed]}
        >
          <Icon name="location.fill" size={15} color={colors.tint} />
          <Text style={styles.capsuleText} numberOfLines={1}>
            {location.label}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFiltersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Filters, ${filterCount} on`}
          style={({ pressed }) => [styles.capsule, pressed && styles.pressed]}
        >
          <Icon name="line.3.horizontal.decrease" size={15} weight="medium" color={colors.tint} />
          <Text style={styles.capsuleText}>Filters</Text>
          {filterCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <LocationModal visible={locationOpen} onClose={() => setLocationOpen(false)} />
      <FiltersModal visible={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { flex: 1 },
  controls: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  capsule: {
    minHeight: MIN_TAP - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
    backgroundColor: colors.cell,
    shadowColor: colors.label,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  location: { flexShrink: 1 },
  capsuleText: { ...type.subheadline, fontWeight: '600', color: colors.label, flexShrink: 1 },
  pressed: { opacity: 0.6 },
  countBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint,
  },
  countBadgeText: { ...type.caption, fontWeight: '600', color: colors.onTint },
});
