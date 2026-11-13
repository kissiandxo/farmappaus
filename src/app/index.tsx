import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FarmCard } from '../components/FarmCard';
import { FilterPanel } from '../components/FilterPanel';
import { Chip } from '../components/Chip';
import { CAPITAL_ORIGINS } from '../data/origins';
import { SAMPLE_FARMS } from '../data/sampleFarms';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  searchFarms,
  type FarmFilters,
} from '../domain/filters';
import { colors, font, MIN_TAP, radius, space } from '../theme';

export default function FarmListScreen() {
  const [filters, setFilters] = useState<FarmFilters>(DEFAULT_FILTERS);
  const [originIndex, setOriginIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const origin = CAPITAL_ORIGINS[originIndex];
  const results = useMemo(
    () => searchFarms(SAMPLE_FARMS, filters, origin, new Date()),
    [filters, origin],
  );
  const filterCount = activeFilterCount(filters);

  const header = (
    <View style={styles.header}>
      <View style={styles.banner} accessible accessibilityRole="alert">
        <Text style={styles.bannerTitle}>Sample data</Text>
        <Text style={styles.bannerText}>
          These listings are made up so we can test the app. No real farms are shown yet.
        </Text>
      </View>

      <Text style={styles.label}>Distances measured from</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.originRow}>
        {CAPITAL_ORIGINS.map((o, i) => (
          <Chip key={o.name} label={o.name} selected={i === originIndex} onPress={() => setOriginIndex(i)} />
        ))}
      </ScrollView>

      <Pressable
        onPress={() => setShowFilters((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showFilters }}
        style={styles.filterButton}
      >
        <Text style={styles.filterButtonText}>
          {showFilters ? 'Hide filters' : 'Filters'}
          {filterCount > 0 ? ` (${filterCount} on)` : ''}
        </Text>
      </Pressable>

      {showFilters && <FilterPanel filters={filters} onChange={setFilters} />}

      <Text style={styles.count} accessibilityLiveRegion="polite">
        {results.length === 1 ? '1 place' : `${results.length} places`} near {origin.name}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={results}
      keyExtractor={(r) => r.farm.id}
      renderItem={({ item }) => <FarmCard result={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing matches yet</Text>
          <Text style={styles.emptyText}>Try a bigger distance or fewer filters.</Text>
          <Pressable
            onPress={() => setFilters(DEFAULT_FILTERS)}
            accessibilityRole="button"
            style={styles.filterButton}
          >
            <Text style={styles.filterButtonText}>Clear all filters</Text>
          </Pressable>
        </View>
      }
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      contentInsetAdjustmentBehavior="automatic"
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: space.xl * 2 },
  header: { gap: space.md, marginBottom: space.md },
  banner: {
    backgroundColor: colors.sampleBackground,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.xs,
  },
  bannerTitle: { fontSize: font.large, fontWeight: '700', color: colors.sampleText },
  bannerText: { fontSize: font.body, color: colors.sampleText },
  label: { fontSize: font.body, fontWeight: '700', color: colors.text },
  originRow: { gap: space.sm, paddingRight: space.lg },
  filterButton: {
    minHeight: MIN_TAP,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.chip,
    paddingHorizontal: space.xl,
  },
  filterButtonText: { fontSize: font.large, fontWeight: '700', color: colors.onPrimary },
  count: { fontSize: font.title, fontWeight: '700', color: colors.text },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
  emptyTitle: { fontSize: font.title, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: font.body, color: colors.textMuted, textAlign: 'center' },
});
