import { Link, router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import {
  AccessibilityInfo,
  FlatList,
  Platform,
  Share,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type ListRenderItem,
} from 'react-native';

import { EmptyState, tapLight } from '../../../components/ui';
import { FarmCard, farmCardLabel } from '../../../components/FarmCard';
import { DEFAULT_FILTERS, searchFarms, type FarmResult } from '../../../domain/filters';
import { directionsUrl } from '../../../domain/links';
import { shareText } from '../../../domain/share';
import { openLink } from '../../../lib/openLink';
import { useFavourites } from '../../../state/FavouritesContext';
import { useSearch } from '../../../state/SearchContext';
import { colors, radius, space, type } from '../../../theme';

const ACCESSIBILITY_ACTIONS = [
  { name: 'activate' as const },
  { name: 'remove', label: 'Remove from Saved' },
];

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
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'remove') onRemove(result);
    else if (e.nativeEvent.actionName === 'activate') onOpen(farm.id);
  };

  const card = (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={farmCardLabel(result, { saved: true, distanceFromDefault })}
      accessibilityHint="Opens details"
      accessibilityActions={ACCESSIBILITY_ACTIONS}
      onAccessibilityAction={onAccessibilityAction}
    >
      <FarmCard
        result={result}
        saved
        onPress={onOpen}
        distanceFromDefault={distanceFromDefault}
        showUnclaimedBadge={showUnclaimedBadge}
      />
    </View>
  );

  // Context menus are iOS only. The outer View takes the Link's props (and ignores its press); the card's own
  // Pressable opens the place, so a tap is handled exactly once.
  if (Platform.OS !== 'ios') return card;
  return (
    <Link href={`/farm/${farm.id}`} asChild>
      <Link.Trigger>
        <View style={styles.trigger}>{card}</View>
      </Link.Trigger>
      <Link.Menu>
        <Link.MenuAction icon="heart.slash" destructive onPress={() => onRemove(result)}>
          Remove from Saved
        </Link.MenuAction>
        <Link.MenuAction icon="arrow.triangle.turn.up.right.diamond" onPress={() => openLink(directionsUrl(farm))}>
          Directions
        </Link.MenuAction>
        <Link.MenuAction
          icon="square.and.arrow.up"
          onPress={() => {
            Share.share({ message: shareText(farm) }).catch(() => {});
          }}
        >
          Share
        </Link.MenuAction>
      </Link.Menu>
    </Link>
  );
});

export default function SavedScreen() {
  const { farms, location, isDefaultLocation, dataStatus, now } = useSearch();
  const { ids, toggleFavourite, hydrated } = useFavourites();

  const saved = useMemo(() => {
    const list = searchFarms(farms, DEFAULT_FILTERS, location, now).filter((r) => ids.includes(r.farm.id));
    // Distances from the default point mean nothing to the person, so sort by name until they choose a location.
    return isDefaultLocation ? [...list].sort((a, b) => a.farm.name.localeCompare(b.farm.name)) : list;
  }, [farms, location, ids, now, isDefaultLocation]);

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
      ListHeaderComponent={saved.length > 0 ? <Text style={styles.count}>{savedCountLabel(saved.length, isDefaultLocation)}</Text> : undefined}
      ListEmptyComponent={
        // Until the saved list has been read from the phone, show nothing rather than a misleading empty state.
        hydrated ? (
          <EmptyState
            icon="heart"
            title="No saved places yet"
            message="Open any farm, stall or market and tap “Save” to keep it here for next time."
            action={{ label: 'Explore farms', onPress: () => router.navigate('/(tabs)/(explore)') }}
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
  count: { ...type.subheadline, color: colors.secondaryLabel, paddingBottom: space.md, paddingHorizontal: space.xs },
  empty: { flex: 1, paddingVertical: space.xxl },
  trigger: { borderRadius: radius.card, borderCurve: 'continuous' },
});

/** Module-level so FlatList keeps the same component between renders (no remounts). */
const ItemSeparator = () => <View style={styles.gap} />;
