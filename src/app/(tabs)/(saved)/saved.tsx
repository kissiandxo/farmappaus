import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';

import { Button, EmptyState, selection, tapLight } from '../../../components/ui';
import { FarmCard } from '../../../components/FarmCard';
import { DEFAULT_FILTERS, searchFarms, type FarmResult } from '../../../domain/filters';
import { directionsUrl } from '../../../domain/links';
import { shareStops, shareText } from '../../../domain/share';
import { openLink } from '../../../lib/openLink';
import { useFavourites } from '../../../state/FavouritesContext';
import { useSearch } from '../../../state/SearchContext';
import { colors, MIN_TAP, radius, space, type } from '../../../theme';

/** "3 saved places · nearest first". Before a location is chosen the list is A to Z, so "nearest first" is left off. */
function savedCountLabel(n: number, isDefaultLocation: boolean): string {
  const base = `${n} saved ${n === 1 ? 'place' : 'places'}`;
  return isDefaultLocation ? base : `${base} · nearest first`;
}

interface SavedItemProps {
  result: FarmResult;
  onOpen: (id: string) => void;
  onRemove: (result: FarmResult) => void;
  showUnclaimedBadge: boolean;
  distanceFromDefault: boolean;
}

/**
 * One saved place. VoiceOver reads the whole card and offers "Remove from Saved" as an action; on iPhone a long
 * press opens a menu with Remove from Saved, Directions and Share, so a place can be removed without opening it.
 */
const SavedItem = memo(function SavedItem({ result, onOpen, onRemove, showUnclaimedBadge, distanceFromDefault }: SavedItemProps) {
  const { farm } = result;
  const remove = () => onRemove(result);
  const showOptions = () => {
    tapLight();
    ActionSheetIOS.showActionSheetWithOptions({
      title: farm.name,
      options: ['Directions', 'Share', 'Remove from Saved', 'Cancel'],
      destructiveButtonIndex: 2,
      cancelButtonIndex: 3,
    }, index => {
      if (index === 0) openLink(directionsUrl(farm));
      if (index === 1) Share.share({ message: shareText(farm) }).catch(() => {});
      if (index === 2) remove();
    });
  };

  return (
    <FarmCard result={result} saved onPress={onOpen} onRemove={remove}
      onLongPress={Platform.OS === 'ios' ? showOptions : undefined}
      distanceFromDefault={distanceFromDefault} showUnclaimedBadge={showUnclaimedBadge} />
  );
});

export default function SavedScreen() {
  const { farms, location, isDefaultLocation, dataStatus, now } = useSearch();
  const { ids, toggleFavourite, hydrated } = useFavourites();

  const [weekend, setWeekend] = useState(false);
  const savedFarms = useMemo(() => farms.filter(farm => ids.includes(farm.id)), [farms, ids]);
  const saved = useMemo(() => {
    const list = searchFarms(savedFarms, weekend ? { ...DEFAULT_FILTERS, when: 'weekend' } : DEFAULT_FILTERS, location, now);
    // Distances from the default point mean nothing to the person, so sort by name until they choose a location.
    return isDefaultLocation ? [...list].sort((a, b) => a.farm.name.localeCompare(b.farm.name)) : list;
  }, [savedFarms, location, now, isDefaultLocation, weekend]);

  const open = useCallback((id: string) => router.push(`/farm/${id}`), []);
  const remove = useCallback(
    (result: FarmResult) => {
      tapLight();
      toggleFavourite(result.farm.id);
      AccessibilityInfo.announceForAccessibility(`Removed ${result.farm.name} from Saved`);
    },
    [toggleFavourite],
  );
  const showUnclaimedBadge = dataStatus.kind !== 'public';

  const renderItem = useCallback<ListRenderItem<FarmResult>>(
    ({ item }) => (
      <SavedItem
        result={item}
        onOpen={open}
        onRemove={remove}
        showUnclaimedBadge={showUnclaimedBadge}
        distanceFromDefault={isDefaultLocation}
      />
    ),
    [open, remove, showUnclaimedBadge, isDefaultLocation],
  );

  return (
    <FlatList
      style={styles.screen}
      data={saved}
      keyExtractor={(r) => r.farm.id}
      renderItem={renderItem}
      ItemSeparatorComponent={ItemSeparator}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      ListHeaderComponent={savedFarms.length > 0 ? (
        <View style={styles.header}>
          <View style={styles.segments}>
            {(['All saved', 'This weekend'] as const).map((label, index) => {
              const isWeekend = index === 1;
              const selected = weekend === isWeekend;
              return (
                <Pressable key={label} accessibilityRole="button" accessibilityLabel={label}
                  accessibilityState={{ selected }} onPress={() => { selection(); setWeekend(isWeekend); }}
                  style={({ pressed }) => [styles.segment, selected && styles.active, pressed && styles.pressed]}>
                  <Text style={[styles.segmentText, selected && styles.activeText]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.summary}>
            <Text style={styles.count}>{savedCountLabel(saved.length, isDefaultLocation)}</Text>
            {saved.length > 0 && <Button label="Share stops" icon="square.and.arrow.up" variant="plain" size="small"
              onPress={() => Share.share({ message: shareStops(saved.map(result => result.farm), weekend) })
                .catch(() => Alert.alert('Couldn’t open sharing', 'Try sharing these stops again.'))} />}
          </View>
        </View>
      ) : undefined}
      ListEmptyComponent={
        // Until the saved list has been read from the phone, show nothing rather than a misleading empty state.
        hydrated && weekend && savedFarms.length > 0 ? (
          <EmptyState icon="calendar" title="No weekend hours listed"
            message="Your saved places are still in All saved. Call ahead to check a place’s hours."
            action={{ label: 'Show all saved', onPress: () => setWeekend(false) }} style={styles.empty} />
        ) : hydrated ? (
          <EmptyState
            icon="heart"
            title="No saved places yet"
            message="Tap a heart in Explore to keep a market, farm shop or butcher here."
            action={{ label: 'Explore places', onPress: () => router.navigate('/(tabs)/(explore)') }}
            style={styles.empty}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.groupedBackground },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl * 2, paddingTop: space.xs, flexGrow: 1 },
  gap: { height: space.md },
  header: { gap: space.sm, paddingBottom: space.sm },
  segments: { flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.group, padding: 3, backgroundColor: colors.fill },
  segment: { flex: 1, minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center', padding: space.xs, borderRadius: radius.control },
  active: { backgroundColor: colors.cell },
  pressed: { opacity: 0.7 },
  segmentText: { ...type.subheadline, color: colors.secondaryLabel, textAlign: 'center' },
  activeText: { fontWeight: '600', color: colors.label },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: space.sm },
  count: { ...type.subheadline, color: colors.secondaryLabel, paddingHorizontal: space.xs },
  empty: { flex: 1, paddingVertical: space.xxl },
});

/** Module-level so FlatList keeps the same component between renders (no remounts). */
const ItemSeparator = () => <View style={styles.gap} />;
