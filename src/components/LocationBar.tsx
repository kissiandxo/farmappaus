import { Pressable, StyleSheet, Text, View } from 'react-native';

import { activeFilterCount } from '../domain/filters';
import { useSearch } from '../state/SearchContext';
import { colors, MIN_TAP, radius, space, type } from '../theme';
import { Icon } from './ui';
import { countAnnouncement, useAnnounceCount } from './useAnnounceCount';

interface LocationBarProps {
  onChangeLocation: () => void;
  onOpenFilters: () => void;
  /** Speak count changes on iOS. Explore turns this off while the Filters sheet (which announces itself) is open. */
  announce?: boolean;
}

/** Second line while the location has not been chosen: explains the sort order and why no distances show. */
export const DEFAULT_LOCATION_LINE = 'Nearest to Sydney first · set your location for distances';

/**
 * The count line under the location row. With a search query: `3 places match “honey” · any distance` (search
 * ignores the distance filter). Otherwise `12 places · nearest first`, or just `12 places` while the location is
 * the default (the line below explains the Sydney default instead).
 */
export function countLine(count: number, query: string, isDefaultLocation: boolean): string {
  const places = countAnnouncement(count);
  const q = query.trim();
  if (q !== '') return `${places} ${count === 1 ? 'matches' : 'match'} “${q}” · any distance`;
  return isDefaultLocation ? places : `${places} · nearest first`;
}

/** VoiceOver label for the Filters capsule: "Filters", or "Filters, 2 on". */
export function filtersLabel(count: number): string {
  return count > 0 ? `Filters, ${count} on` : 'Filters';
}

/**
 * Compact row above the Explore list: pin + suburb (tint, opens the location sheet) on the left,
 * a small Filters capsule with the active count on the right, then the result count underneath.
 */
export function LocationBar({ onChangeLocation, onOpenFilters, announce = true }: LocationBarProps) {
  const { location, filters, results, query, isDefaultLocation } = useSearch();
  const filterCount = activeFilterCount(filters);
  useAnnounceCount(results.length, announce);

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        <Pressable
          onPress={onChangeLocation}
          accessibilityRole="button"
          accessibilityLabel={isDefaultLocation ? 'Location not set, showing Sydney' : `Location, ${location.label}`}
          accessibilityHint="Changes where distances are measured from"
          hitSlop={6}
          style={({ pressed }) => [styles.where, pressed && styles.pressed]}
        >
          <Icon name={isDefaultLocation ? 'location' : 'location.fill'} size={15} color={colors.tint} />
          <Text style={styles.whereText} numberOfLines={1}>
            {isDefaultLocation ? 'Set your location' : location.label}
          </Text>
          <Icon name="chevron.down" size={12} weight="semibold" color={colors.tint} />
        </Pressable>

        <Pressable
          onPress={onOpenFilters}
          accessibilityRole="button"
          accessibilityLabel={filtersLabel(filterCount)}
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
        {countLine(results.length, query, isDefaultLocation)}
      </Text>
      {isDefaultLocation && <Text style={styles.hint}>{DEFAULT_LOCATION_LINE}</Text>}
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
    minHeight: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint,
  },
  countBadgeText: { ...type.caption, fontWeight: '600', color: colors.onTint },
  pressed: { opacity: 0.6 },
  count: { ...type.footnote, color: colors.secondaryLabel },
  hint: { ...type.footnote, color: colors.secondaryLabel },
});
