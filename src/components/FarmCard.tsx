import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { licenceBadge } from '../domain/compliance';
import type { FarmResult } from '../domain/filters';
import { isStale } from '../domain/format';
import { formatDistance } from '../domain/geo';
import { PRODUCT_LABELS, TAG_LABELS, VENUE_LABELS } from '../domain/types';
import { useFavourites } from '../state/FavouritesContext';
import { colors, radius, space, type } from '../theme';
import { Badge, Icon } from './ui';

/** Produce badges shown before the rest collapse into "+N". */
const MAX_PRODUCE_BADGES = 5;

/** White grouped card for a farm in a list. Name, distance, meta, status, produce and licence. Memoised for long lists. */
export const FarmCard = memo(FarmCardView);

function FarmCardView({ result, onPress }: { result: FarmResult; onPress?: () => void }) {
  const { farm, distanceKm, status } = result;
  const { isFavourite } = useFavourites();
  const saved = isFavourite(farm.id);
  const inStock = [...new Set(farm.products.filter((p) => p.inStock).map((p) => p.category))];
  const shownProduce = inStock.slice(0, MAX_PRODUCE_BADGES);
  const moreProduce = inStock.length - shownProduce.length;
  const badge = licenceBadge(farm);
  const distance = formatDistance(distanceKm);
  const statusColor = status.isOpen ? colors.green : colors.secondaryLabel;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Opens details"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityLabel={`${farm.name}. ${VENUE_LABELS[farm.type]} in ${farm.locality}, ${farm.state}. ${distance} away. ${status.label}.${saved ? ' Saved.' : ''}${farm.isSample ? ' Sample listing.' : ''}`}
    >
      {farm.isSample && <Badge label="Sample" tone="orange" />}

      <View style={styles.titleRow}>
        <Text style={styles.name} numberOfLines={2}>
          {farm.name}
        </Text>
        <View style={styles.trail}>
          {saved && <Icon name="heart.fill" size={16} color={colors.red} />}
          <Text style={styles.distance}>{distance}</Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {VENUE_LABELS[farm.type]} · {farm.locality}, {farm.state}
      </Text>

      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text style={[styles.status, { color: statusColor }]}>{status.label}</Text>
      </View>

      {(shownProduce.length > 0 || farm.tags.length > 0) && (
        <View style={styles.badges}>
          {shownProduce.map((c) => (
            <Badge key={c} label={PRODUCT_LABELS[c]} />
          ))}
          {moreProduce > 0 && <Badge label={`+${moreProduce}`} />}
          {farm.tags.map((t) => (
            <Badge key={t} label={TAG_LABELS[t]} tone="tint" />
          ))}
        </View>
      )}

      {badge === 'checked' && (
        <View style={styles.inline}>
          <Icon name="checkmark.seal.fill" size={14} color={colors.tint} />
          <Text style={styles.footnote}>Licence checked</Text>
        </View>
      )}
      {badge === 'declared' && <Text style={styles.footnote}>Licence declared by farmer</Text>}

      {!farm.isSample && isStale(farm.updatedOn, new Date()) && (
        <View style={styles.inline}>
          <Icon name="exclamationmark.triangle" size={14} color={colors.orange} />
          <Text style={styles.stale}>Not updated for a while. Call ahead to check.</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cell,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: space.lg,
    gap: space.sm,
  },
  pressed: { opacity: 0.8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  name: { ...type.headline, flex: 1, color: colors.label },
  trail: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  distance: { ...type.subheadline, color: colors.secondaryLabel },
  meta: { ...type.subheadline, color: colors.secondaryLabel },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { ...type.subheadline, fontWeight: '600' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  footnote: { ...type.footnote, color: colors.secondaryLabel, flexShrink: 1 },
  stale: { ...type.footnote, color: colors.orange, flexShrink: 1 },
});
