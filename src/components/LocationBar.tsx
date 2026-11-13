import { Pressable, StyleSheet, Text, View } from 'react-native';

import { activeFilterCount } from '../domain/filters';
import { useSearch } from '../state/SearchContext';
import { colors, MIN_TAP, radius, space, type } from '../theme';
import { Icon } from './ui';

interface LocationBarProps {
  onChangeLocation: () => void;
  onOpenFilters: () => void;
}

/**
 * Compact row above the Explore list: pin + suburb (tint, opens the location sheet) on the left,
 * a small Filters capsule with the active count on the right, then the result count underneath.
 */
export function LocationBar({ onChangeLocation, onOpenFilters }: LocationBarProps) {
  const { location, filters, results } = useSearch();
  const filterCount = activeFilterCount(filters);
  const count = results.length === 1 ? '1 place' : `${results.length} places`;
  const isDefault = location.source === 'default';

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        <Pressable
          onPress={onChangeLocation}
          accessibilityRole="button"
          accessibilityLabel="Change location"
          hitSlop={6}
          style={({ pressed }) => [styles.where, pressed && styles.pressed]}
        >
          <Icon name="location.fill" size={15} color={colors.tint} />
          <Text style={styles.whereText} numberOfLines={1}>
            {location.label}
          </Text>
          <Icon name="chevron.down" size={12} weight="semibold" color={colors.tint} />
        </Pressable>

        <Pressable
          onPress={onOpenFilters}
          accessibilityRole="button"
          accessibilityLabel={`Filters, ${filterCount} on`}
          hitSlop={6}
          style={({ pressed }) => [styles.filters, pressed && styles.pressed]}
        >
          <Icon name="line.3.horizontal.decrease" size={15} weight="medium" color={colors.tint} />
          <Text style={styles.filtersText}>Filters</Text>
          {filterCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <Text style={styles.count} accessibilityLiveRegion="polite">
        {count}
      </Text>
      {isDefault && <Text style={styles.hint}>Set your location to see how far each place is.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: MIN_TAP },
  where: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minHeight: MIN_TAP },
  whereText: { ...type.headline, color: colors.tint, flexShrink: 1 },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
    backgroundColor: colors.fill,
  },
  filtersText: { ...type.subheadline, fontWeight: '600', color: colors.label },
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
  pressed: { opacity: 0.6 },
  count: { ...type.footnote, color: colors.secondaryLabel },
  hint: { ...type.footnote, color: colors.secondaryLabel },
});
