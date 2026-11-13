import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { DataBanner } from '../../../components/DataBanner';
import { FarmCard } from '../../../components/FarmCard';
import { FiltersModal } from '../../../components/FiltersModal';
import { LocationBar } from '../../../components/LocationBar';
import { LocationModal } from '../../../components/LocationModal';
import { EmptyState } from '../../../components/ui';
import { DEFAULT_FILTERS } from '../../../domain/filters';
import { useSearch } from '../../../state/SearchContext';
import { colors, space } from '../../../theme';

export default function FarmListScreen() {
  const { results, setFilters, refresh, refreshing, dataStatus } = useSearch();
  const [locationOpen, setLocationOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <FlatList
        style={styles.screen}
        data={results}
        keyExtractor={(r) => r.farm.id}
        renderItem={({ item }) => (
          <FarmCard result={item} onPress={() => router.push(`/farm/${item.farm.id}`)} />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <LocationBar
              onChangeLocation={() => setLocationOpen(true)}
              onOpenFilters={() => setFiltersOpen(true)}
            />
            <DataBanner />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="magnifyingglass"
            title="Nothing matches yet"
            message="Try a bigger distance or fewer filters."
            action={{ label: 'Clear all filters', onPress: () => setFilters(DEFAULT_FILTERS) }}
            style={styles.empty}
          />
        }
        refreshing={refreshing}
        onRefresh={dataStatus.kind === 'public' ? undefined : refresh}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={ItemSeparator}
        keyboardShouldPersistTaps="handled"
      />
      <LocationModal visible={locationOpen} onClose={() => setLocationOpen(false)} />
      <FiltersModal visible={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.groupedBackground },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl * 2 },
  header: { gap: space.md, paddingTop: space.xs, paddingBottom: space.md },
  gap: { height: space.md },
  empty: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingVertical: space.xxl },
});

/** Module-level so FlatList keeps the same component between renders (no remounts). */
const ItemSeparator = () => <View style={styles.gap} />;
