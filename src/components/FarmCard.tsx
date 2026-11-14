import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { licenceBadge } from '../domain/compliance';
import type { FarmResult } from '../domain/filters';
import { isStale } from '../domain/format';
import { formatDistance } from '../domain/geo';
import { PRODUCT_LABELS, TAG_LABELS, VENUE_LABELS, type Farm, type ProductCategory } from '../domain/types';
import { colors, radius, space, type } from '../theme';
import { Badge, Icon } from './ui';

/** Produce badges shown before the rest collapse into "+N". */
const MAX_PRODUCE_BADGES = 5;

/** Diameter of the open/closed dot. */
const DOT = 8;

const STALE_TEXT = 'Not updated for a while. Call ahead to check.';

export interface FarmCardProps {
  result: FarmResult;
  /** Called with the place's id. Pass a stable callback (useCallback) so cards are not re-rendered needlessly. */
  onPress: (id: string) => void;
  saved: boolean;
  /** Show the "Unclaimed" capsule. Explore passes `dataStatus.kind !== 'public'` (with no backend every place is unclaimed). */
  showUnclaimedBadge?: boolean;
  /** True while distances are measured from the default (Sydney) location: the distance is then hidden. */
  distanceFromDefault?: boolean;
}

function inStockProduce(farm: Farm): ProductCategory[] {
  return [...new Set(farm.products.filter((p) => p.inStock).map((p) => p.category))];
}

/** The 90-day "not updated" warning applies only to real, owner-managed listings. */
export function showsStaleWarning(farm: Farm, now: Date): boolean {
  return !farm.isSample && !farm.unclaimed && isStale(farm.updatedOn, now);
}

function licenceText(farm: Farm): string | null {
  const badge = licenceBadge(farm);
  if (badge === 'checked') return 'Licence checked';
  if (badge === 'declared') return 'Licence declared by farmer';
  return null;
}

/** Status colour: green when open, orange when it opens later today, otherwise quiet secondary text. */
function statusColor(status: FarmResult['status']) {
  if (status.isOpen) return colors.green;
  if (status.opensToday) return colors.orange;
  return colors.secondaryLabel;
}

/**
 * Everything the card shows, as one VoiceOver label: parts joined with ". ". The distance is left out while it
 * is measured from the default location.
 */
export function farmCardLabel(
  result: FarmResult,
  { saved, distanceFromDefault = false, now = new Date() }: { saved: boolean; distanceFromDefault?: boolean; now?: Date },
): string {
  const { farm, distanceKm, status, weekend } = result;
  const produce = inStockProduce(farm);
  const shown = produce.slice(0, MAX_PRODUCE_BADGES).map((c) => PRODUCT_LABELS[c]);
  const more = produce.length - shown.length;

  const parts: (string | null | false | undefined)[] = [
    farm.name,
    VENUE_LABELS[farm.type],
    `${farm.locality}, ${farm.state}`,
    !distanceFromDefault && `${formatDistance(distanceKm, farm.locationApprox)} away`,
    status.label,
    weekend && `This weekend: ${weekend}`,
    shown.length > 0 && `Sells ${shown.join(', ')}${more > 0 ? ` and ${more} more` : ''}`,
    farm.tags.length > 0 && farm.tags.map((t) => TAG_LABELS[t]).join(', '),
    status.kind === 'irregular' && farm.hours.note,
    licenceText(farm),
    saved && 'Saved',
    farm.isSample && 'Sample listing',
    farm.unclaimed && 'Unclaimed listing from public sources',
    showsStaleWarning(farm, now) && STALE_TEXT,
  ];
  return parts
    .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    .map((p) => p.trim().replace(/\.+$/, ''))
    .join('. ');
}

/** memo comparator: re-render only when something the card shows (or its press handler) changes. */
export function farmCardPropsEqual(prev: FarmCardProps, next: FarmCardProps): boolean {
  const a = prev.result;
  const b = next.result;
  return (
    a.farm.id === b.farm.id &&
    a.farm.updatedOn === b.farm.updatedOn &&
    a.distanceKm === b.distanceKm &&
    a.status.label === b.status.label &&
    a.status.opensToday === b.status.opensToday &&
    a.weekend === b.weekend &&
    prev.saved === next.saved &&
    (prev.showUnclaimedBadge ?? false) === (next.showUnclaimedBadge ?? false) &&
    (prev.distanceFromDefault ?? false) === (next.distanceFromDefault ?? false) &&
    prev.onPress === next.onPress
  );
}

/** White grouped card for a place in a list: name, distance, meta, status, produce and licence. Memoised for long lists. */
export const FarmCard = memo(FarmCardView, farmCardPropsEqual);

function FarmCardView({ result, onPress, saved, showUnclaimedBadge = false, distanceFromDefault = false }: FarmCardProps) {
  const { farm, distanceKm, status, weekend } = result;
  const now = new Date();
  const produce = inStockProduce(farm);
  const shownProduce = produce.slice(0, MAX_PRODUCE_BADGES);
  const moreProduce = produce.length - shownProduce.length;
  const badge = licenceBadge(farm);
  const distance = distanceFromDefault ? null : formatDistance(distanceKm, farm.locationApprox);
  const tone = statusColor(status);
  const stale = showsStaleWarning(farm, now);
  const unclaimedBadge = showUnclaimedBadge && !!farm.unclaimed;

  return (
    <Pressable
      onPress={() => onPress(farm.id)}
      accessibilityRole="button"
      accessibilityHint="Opens details"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityLabel={farmCardLabel(result, { saved, distanceFromDefault, now })}
    >
      <View style={styles.titleRow}>
        <Text style={styles.name} numberOfLines={2}>
          {farm.name}
        </Text>
        {(saved || distance) && (
          <View style={styles.trail}>
            {saved && <Icon name="heart.fill" size={16} color={colors.red} />}
            {distance && <Text style={styles.distance}>{distance}</Text>}
          </View>
        )}
      </View>

      <Text style={styles.meta} numberOfLines={2}>
        {VENUE_LABELS[farm.type]} · {farm.locality}, {farm.state}
      </Text>

      {(farm.isSample || unclaimedBadge) && (
        <View style={styles.badges}>
          {farm.isSample && <Badge label="Sample" tone="orange" />}
          {unclaimedBadge && <Badge label="Unclaimed" />}
        </View>
      )}

      <View>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: tone }]} />
          <Text style={[styles.status, { color: tone }]}>{status.label}</Text>
        </View>
        {!!weekend && <Text style={[styles.footnote, styles.weekend]}>This weekend: {weekend}</Text>}
      </View>

      {status.kind === 'irregular' && !!farm.hours.note && (
        <Text style={styles.footnote} numberOfLines={3}>
          {farm.hours.note}
        </Text>
      )}

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

      {stale && (
        <View style={styles.inline}>
          <Icon name="exclamationmark.triangle" size={14} color={colors.orange} />
          <Text style={styles.stale}>{STALE_TEXT}</Text>
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
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  status: { ...type.subheadline, fontWeight: '600', flexShrink: 1 },
  weekend: { marginLeft: DOT + space.sm, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  footnote: { ...type.footnote, color: colors.secondaryLabel, flexShrink: 1 },
  stale: { ...type.footnote, color: colors.orange, flexShrink: 1 },
});
