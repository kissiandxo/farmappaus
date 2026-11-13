import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../../../components/ui';
import { FarmCard } from '../../../components/FarmCard';
import { DEFAULT_FILTERS, searchFarms } from '../../../domain/filters';
import { useFavourites } from '../../../state/FavouritesContext';
import { useSearch } from '../../../state/SearchContext';
import { colors, space, type } from '../../../theme';

export default function SavedScreen() {
  const { farms, location } = useSearch();
  const { ids } = useFavourites();

  const saved = useMemo(
    () => searchFarms(farms, DEFAULT_FILTERS, location, new Date()).filter((r) => ids.includes(r.farm.id)),
    [farms, location, ids],
  );

  return (
    <FlatList
      style={styles.screen}
      data={saved}
      keyExtractor={(r) => r.farm.id}
      renderItem={({ item }) => (
        <FarmCard result={item} onPress={() => router.push(`/farm/${item.farm.id}`)} />
      )}
      ItemSeparatorComponent={ItemSeparator}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        saved.length > 0 ? (
          <Text style={styles.count}>{saved.length === 1 ? '1 saved place' : `${saved.length} saved places`}</Text>
        ) : undefined
      }
      ListEmptyComponent={
        <EmptyState
          icon="heart"
          title="No saved places yet"
          message="Open any farm, stall or market and tap “Save” to keep it here for next time."
          action={{ label: 'Explore farms', onPress: () => router.navigate('/(tabs)/(explore)') }}
          style={styles.empty}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.groupedBackground },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl * 2, paddingTop: space.xs, flexGrow: 1 },
  gap: { height: space.md },
  count: { ...type.subheadline, color: colors.secondaryLabel, paddingBottom: space.md, paddingHorizontal: space.xs },
  empty: { flex: 1, paddingVertical: space.xxl },
});

/** Module-level so FlatList keeps the same component between renders (no remounts). */
const ItemSeparator = () => <View style={styles.gap} />;
