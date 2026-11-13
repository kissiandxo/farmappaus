import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { formatDistance } from '../../domain/geo';
import { directionsUrl } from '../../domain/links';
import { pinStyle } from '../../domain/mapPins';
import type { FarmResult } from '../../domain/filters';
import { useFavourites } from '../../state/FavouritesContext';
import { colors, MIN_TAP, radius, space, type } from '../../theme';
import { Button, Icon, tapLight } from '../ui';

interface MapPlaceCardProps {
  result: FarmResult;
  onClose: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/** Compact place card over the map, in the style of Apple Maps. */
export function MapPlaceCard({ result, onClose, onLayout }: MapPlaceCardProps) {
  const { farm, distanceKm, status } = result;
  const { isFavourite, toggleFavourite } = useFavourites();
  const saved = isFavourite(farm.id);
  const kind = pinStyle(farm.type).label;

  const openDirections = () => {
    Linking.openURL(directionsUrl({ lat: farm.lat, lng: farm.lng, name: farm.name })).catch(() => {});
  };

  return (
    <View style={styles.card} onLayout={onLayout}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.name} numberOfLines={2} accessibilityRole="header">
            {farm.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {kind} · {farm.locality}
            {farm.isSample ? ' · Sample' : ''}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: status.isOpen ? colors.green : colors.secondaryLabel }]} />
            <Text style={[styles.status, status.isOpen && { color: colors.green }]} numberOfLines={1}>
              {status.label}
            </Text>
            <Text style={styles.distance}>· {formatDistance(distanceKm)}</Text>
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
            <Icon name={saved ? 'heart.fill' : 'heart'} size={22} color={saved ? colors.red : colors.tint} />
          </Pressable>
          <Pressable
            onPress={onClose}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Close place card"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Icon name="xmark.circle.fill" size={26} color={colors.tertiaryLabel} />
          </Pressable>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label="Directions"
          icon="arrow.triangle.turn.up.right.circle.fill"
          onPress={openDirections}
          style={styles.action}
          accessibilityHint="Opens Apple Maps"
        />
        <Button
          label="View"
          variant="tinted"
          icon="info.circle"
          onPress={() => router.push(`/farm/${farm.id}`)}
          style={styles.action}
          accessibilityLabel={`View ${farm.name}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.lg,
    gap: space.md,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: colors.cell,
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  titles: { flex: 1, gap: space.xs },
  name: { ...type.title3, fontWeight: '600', color: colors.label },
  meta: { ...type.subheadline, color: colors.secondaryLabel },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { ...type.subheadline, color: colors.secondaryLabel, flexShrink: 1 },
  distance: { ...type.subheadline, color: colors.secondaryLabel },
  headerActions: { flexDirection: 'row', alignItems: 'center', marginTop: -space.sm, marginRight: -space.sm },
  iconButton: { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  actions: { flexDirection: 'row', gap: space.sm },
  action: { flex: 1, alignSelf: 'auto' },
});
