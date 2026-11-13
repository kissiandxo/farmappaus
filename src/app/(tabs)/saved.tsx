import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { FarmCard } from '../../components/FarmCard';
import { DEFAULT_FILTERS, searchFarms } from '../../domain/filters';
import { useFavourites } from '../../state/FavouritesContext';
import { useSearch } from '../../state/SearchContext';
import { colors, font, space } from '../../theme';

export default function SavedScreen() {
  const { farms, location } = useSearch();
  const { ids } = useFavourites();

  const saved = useMemo(
    () => searchFarms(farms, DEFAULT_FILTERS, location, new Date()).filter((r) => ids.includes(r.farm.id)),
    [farms, location, ids],
  );

  return (
    <FlatList
      data={saved}
      keyExtractor={(r) => r.farm.id}
      renderItem={({ item }) => (
        <FarmCard result={item} onPress={() => router.push(`/farm/${item.farm.id}`)} />
      )}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        saved.length > 0 ? (
          <Text style={styles.count}>{saved.length === 1 ? '1 saved place' : `${saved.length} saved places`}</Text>
        ) : undefined
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No saved places yet</Text>
          <Text style={styles.emptyText}>
            Open any farm, stall or market and tap “Save this place” to keep it here for next time.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: space.xl * 2, flexGrow: 1 },
  count: { fontSize: font.title, fontWeight: '700', color: colors.text, marginBottom: space.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  emptyTitle: { fontSize: font.title, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: font.body, color: colors.textMuted, textAlign: 'center' },
});
