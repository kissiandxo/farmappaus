import { router } from 'expo-router';
import { useEffect, useRef, type ComponentRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import type { FarmResult } from '../../domain/filters';
import { formatDistance } from '../../domain/geo';
import { directionsUrl } from '../../domain/links';
import { pinStyle } from '../../domain/mapPins';
import { shareText } from '../../domain/share';
import { useFavourites } from '../../state/FavouritesContext';
import { colors, MIN_TAP, radius, space, type } from '../../theme';
import { Badge, Button, Icon, tapLight } from '../ui';

interface MapPlaceCardProps {
  result: FarmResult;
  onClose: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  /** False while the location is the unset default (Sydney): a distance from there would mislead. */
  showDistance: boolean;
  /** Show the "Unclaimed" badge. The map passes `dataStatus.kind !== 'public'` (with no backend every place is unclaimed). */
  showUnclaimedBadge?: boolean;
}

/** Actions stack in a column at large text sizes so their labels are never cut off. */
const STACK_ACTIONS_ABOVE_FONT_SCALE = 1.3;
/** The card never covers more than this share of the screen; past it, its content scrolls. */
const MAX_HEIGHT_SHARE = 0.6;
const CLOSE_CIRCLE = 30;

/** Compact place card over the map, in the style of Apple Maps. Takes VoiceOver focus when it opens. */
export function MapPlaceCard({ result, onClose, onLayout, showDistance, showUnclaimedBadge = false }: MapPlaceCardProps) {
  const { farm, distanceKm, status } = result;
  const { isFavourite, toggleFavourite } = useFavourites();
  const { height, fontScale } = useWindowDimensions();
  const nameRef = useRef<ComponentRef<typeof Text>>(null);
  const saved = isFavourite(farm.id);
  const kind = pinStyle(farm.type).label;
  const approx = !!farm.locationApprox;
  const stacked = fontScale > STACK_ACTIONS_ABOVE_FONT_SCALE;

  // Move VoiceOver to the place's name when the card opens (the card is keyed by place, so on each new place).
  useEffect(() => {
    const timer = setTimeout(() => {
      const tag = nameRef.current ? findNodeHandle(nameRef.current) : null;
      if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const openDirections = () => {
    Linking.openURL(directionsUrl(farm)).catch(() => {});
  };

  const share = () => {
    Share.share({ message: shareText(farm) }).catch(() => {});
  };

  const statusColor = status.isOpen ? colors.green : status.opensToday ? colors.orange : colors.secondaryLabel;
  const meta = [kind, farm.locality, farm.isSample ? 'Sample' : null, approx ? 'Approximate location' : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.card} onLayout={onLayout}>
      <ScrollView
        style={{ maxHeight: height * MAX_HEIGHT_SHARE }}
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titles}>
            {showUnclaimedBadge && farm.unclaimed && <Badge label="Unclaimed" />}
            <Text ref={nameRef} style={styles.name} numberOfLines={2} accessibilityRole="header">
              {farm.name}
            </Text>
            <Text style={styles.meta} numberOfLines={2}>
              {meta}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: statusColor }]} />
              <Text style={[styles.status, { color: statusColor }]}>
                {status.label}
                {showDistance && (
                  <Text style={styles.distance}> · {formatDistance(distanceKm, approx)}</Text>
                )}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                tapLight();
                toggleFavourite(farm.id);
              }}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={saved ? `Remove ${farm.name} from saved` : `Save ${farm.name}`}
              accessibilityState={{ selected: saved }}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <View style={styles.circle}>
                <Icon name={saved ? 'heart.fill' : 'heart'} size={16} weight="semibold" color={saved ? colors.red : colors.tint} />
              </View>
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable
                onPress={share}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`Share ${farm.name}`}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <View style={styles.circle}>
                  <Icon name="square.and.arrow.up" size={15} weight="semibold" color={colors.tint} />
                </View>
              </Pressable>
            )}
            <Pressable
              onPress={onClose}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Close place card"
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <View style={styles.circle}>
                <Icon name="xmark" size={13} weight="bold" color={colors.secondaryLabel} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={[styles.actions, stacked && styles.actionsStacked]}>
          <Button
            label="Directions"
            icon="arrow.triangle.turn.up.right.circle.fill"
            onPress={openDirections}
            style={stacked ? undefined : styles.action}
            accessibilityHint={approx && !farm.address?.trim() ? 'Opens Apple Maps to the town; check the exact address first' : 'Opens Apple Maps'}
          />
          <Button
            label="View"
            variant="tinted"
            icon="info.circle"
            onPress={() => router.push(`/farm/${farm.id}`)}
            style={stacked ? undefined : styles.action}
            accessibilityLabel={`View ${farm.name}`}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: colors.cell,
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  content: { padding: space.lg, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  titles: { flex: 1, gap: space.xs },
  name: { ...type.title3, fontWeight: '600', color: colors.label },
  meta: { ...type.subheadline, color: colors.secondaryLabel },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  status: { ...type.subheadline, flexShrink: 1 },
  distance: { ...type.subheadline, color: colors.secondaryLabel },
  headerActions: { flexDirection: 'row', alignItems: 'center', marginTop: -space.sm, marginRight: -space.sm },
  iconButton: { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: CLOSE_CIRCLE,
    height: CLOSE_CIRCLE,
    borderRadius: CLOSE_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  pressed: { opacity: 0.6 },
  actions: { flexDirection: 'row', gap: space.sm },
  actionsStacked: { flexDirection: 'column' },
  action: { flex: 1, alignSelf: 'auto' },
});
