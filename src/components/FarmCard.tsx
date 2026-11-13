import { StyleSheet, Text, View } from 'react-native';

import { licenceBadge } from '../domain/compliance';
import type { FarmResult } from '../domain/filters';
import { formatDistance } from '../domain/geo';
import { PRODUCT_LABELS, TAG_LABELS, VENUE_LABELS } from '../domain/types';
import { colors, font, radius, space } from '../theme';

export function FarmCard({ result }: { result: FarmResult }) {
  const { farm, distanceKm, status } = result;
  const inStock = [...new Set(farm.products.filter((p) => p.inStock).map((p) => p.category))];
  const badge = licenceBadge(farm);
  const distance = formatDistance(distanceKm);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${farm.name}. ${VENUE_LABELS[farm.type]} in ${farm.locality}, ${farm.state}. ${distance} away. ${status.label}.${farm.isSample ? ' Sample listing.' : ''}`}
    >
      {farm.isSample && (
        <View style={styles.sample}>
          <Text style={styles.sampleText}>SAMPLE – not a real farm</Text>
        </View>
      )}

      <View style={styles.titleRow}>
        <Text style={styles.name}>{farm.name}</Text>
        <Text style={styles.distance}>{distance}</Text>
      </View>
      <Text style={styles.meta}>
        {VENUE_LABELS[farm.type]} · {farm.locality}, {farm.state}
      </Text>

      <Text style={[styles.status, { color: status.isOpen ? colors.open : colors.closed }]}>
        {status.isOpen ? '● ' : '○ '}
        {status.label}
      </Text>

      <Text style={styles.products}>{inStock.map((c) => PRODUCT_LABELS[c]).join(' · ')}</Text>

      {farm.tags.length > 0 && (
        <Text style={styles.tags}>{farm.tags.map((t) => TAG_LABELS[t]).join(' · ')}</Text>
      )}

      {badge !== 'none' && (
        <Text style={styles.licence}>
          {badge === 'checked' ? '✓ Licence checked' : 'Licence declared by farmer'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.xs,
  },
  sample: {
    alignSelf: 'flex-start',
    backgroundColor: colors.sampleBackground,
    borderRadius: 8,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    marginBottom: space.xs,
  },
  sampleText: { fontSize: font.small, fontWeight: '700', color: colors.sampleText },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  name: { flex: 1, fontSize: font.title, fontWeight: '700', color: colors.text },
  distance: { fontSize: font.large, fontWeight: '700', color: colors.primary },
  meta: { fontSize: font.body, color: colors.textMuted },
  status: { fontSize: font.body, fontWeight: '700', marginTop: space.xs },
  products: { fontSize: font.body, color: colors.text, marginTop: space.xs },
  tags: { fontSize: font.small, color: colors.accent, fontWeight: '600' },
  licence: { fontSize: font.small, color: colors.textMuted, marginTop: space.xs },
});
