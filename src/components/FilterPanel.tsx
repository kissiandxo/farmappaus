import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import {
  activeFilterCount,
  DEFAULT_FILTERS,
  DISTANCE_OPTIONS_KM,
  toggle,
  type FarmFilters,
} from '../domain/filters';
import {
  FARM_TAGS,
  PRODUCT_CATEGORIES,
  PRODUCT_LABELS,
  TAG_LABELS,
} from '../domain/types';
import { colors, font, MIN_TAP, radius, space } from '../theme';
import { Chip } from './Chip';

interface FilterPanelProps {
  filters: FarmFilters;
  onChange: (filters: FarmFilters) => void;
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const set = (patch: Partial<FarmFilters>) => onChange({ ...filters, ...patch });

  return (
    <View style={styles.panel}>
      <Text style={styles.heading} accessibilityRole="header">
        What are you after?
      </Text>
      <View style={styles.row}>
        {PRODUCT_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={PRODUCT_LABELS[category]}
            selected={filters.products.includes(category)}
            onPress={() => set({ products: toggle(filters.products, category) })}
          />
        ))}
      </View>

      <Text style={styles.heading} accessibilityRole="header">
        How far will you travel?
      </Text>
      <View style={styles.row}>
        <Chip label="Any distance" selected={filters.maxKm === null} onPress={() => set({ maxKm: null })} />
        {DISTANCE_OPTIONS_KM.map((km) => (
          <Chip
            key={km}
            label={`${km} km`}
            selected={filters.maxKm === km}
            onPress={() => set({ maxKm: km })}
          />
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Open now</Text>
        <Switch
          value={filters.openNow}
          onValueChange={(openNow) => set({ openNow })}
          trackColor={{ true: colors.primary, false: colors.border }}
          accessibilityLabel="Show only places open now"
        />
      </View>

      <Text style={styles.heading} accessibilityRole="header">
        Good to know
      </Text>
      <View style={styles.row}>
        {FARM_TAGS.map((tag) => (
          <Chip
            key={tag}
            label={TAG_LABELS[tag]}
            selected={filters.tags.includes(tag)}
            onPress={() => set({ tags: toggle(filters.tags, tag) })}
          />
        ))}
      </View>

      {activeFilterCount(filters) > 0 && (
        <Pressable
          onPress={() => onChange(DEFAULT_FILTERS)}
          accessibilityRole="button"
          style={styles.clear}
        >
          <Text style={styles.clearLabel}>Clear all filters</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  heading: { fontSize: font.large, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  switchRow: {
    minHeight: MIN_TAP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { fontSize: font.large, fontWeight: '700', color: colors.text },
  clear: { minHeight: MIN_TAP, justifyContent: 'center', alignSelf: 'flex-start' },
  clearLabel: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.accent,
    textDecorationLine: 'underline',
  },
});
