import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { DataBanner } from '../../components/DataBanner';
import { FarmCard } from '../../components/FarmCard';
import { FiltersModal } from '../../components/FiltersModal';
import { LocationBar } from '../../components/LocationBar';
import { LocationModal } from '../../components/LocationModal';
import { DEFAULT_FILTERS } from '../../domain/filters';
import { useSearch } from '../../state/SearchContext';
import { colors, font, radius, space } from '../../theme';
import { Pressable } from 'react-native';

export default function FarmListScreen() {
  const { results, setFilters, refresh, refreshing, dataStatus } = useSearch();
  const [locationOpen, setLocationOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <FlatList
        data={results}
        keyExtractor={(r) => r.farm.id}
        renderItem={({ item }) => (
          <FarmCard result={item} onPress={() => router.push(`/farm/${item.farm.id}`)} />
        )}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <LocationBar
              onChangeLocation={() => setLocationOpen(true)}
              onOpenFilters={() => setFiltersOpen(true)}
            />
            <DataBanner />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing matches yet</Text>
            <Text style={styles.emptyText}>Try a bigger distance or fewer filters.</Text>
            <Pressable onPress={() => setFilters(DEFAULT_FILTERS)} accessibilityRole="button" style={styles.clear}>
              <Text style={styles.clearText}>Clear all filters</Text>
            </Pressable>
          </View>
        }
        refreshing={refreshing}
        onRefresh={dataStatus.kind === 'sample' ? undefined : refresh}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        keyboardShouldPersistTaps="handled"
      />
      <LocationModal visible={locationOpen} onClose={() => setLocationOpen(false)} />
      <FiltersModal visible={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingBottom: space.xl * 2, paddingHorizontal: space.lg },
  headerWrap: { marginHorizontal: -space.lg, marginBottom: space.md, gap: space.md },
  banner: {
    marginHorizontal: space.lg,
    backgroundColor: colors.sampleBackground,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.xs,
  },
  bannerTitle: { fontSize: font.large, fontWeight: '700', color: colors.sampleText },
  bannerText: { fontSize: font.body, color: colors.sampleText },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
  emptyTitle: { fontSize: font.title, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: font.body, color: colors.textMuted, textAlign: 'center' },
  clear: { minHeight: 52, justifyContent: 'center', paddingHorizontal: space.xl, borderRadius: radius.chip, backgroundColor: colors.accent },
  clearText: { fontSize: font.large, fontWeight: '700', color: colors.onPrimary },
});
