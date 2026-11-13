import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { licenceBadge } from '../../domain/compliance';
import { formatDistance, haversineKm } from '../../domain/geo';
import { hoursLines, localDayAndMinutes, openStatus, timezoneForState } from '../../domain/hours';
import { formatDateAu, formatPrice } from '../../domain/format';
import { directionsUrl, telUrl, websiteUrl } from '../../domain/links';
import {
  FULFILMENT_LABELS,
  LICENCE_LABELS,
  PAYMENT_LABELS,
  PRODUCT_LABELS,
  STATE_NAMES,
  TAG_LABELS,
  VENUE_LABELS,
} from '../../domain/types';
import { ReviewPanel } from '../../components/ReviewPanel';
import { statusAdvice, STATUS_LABELS } from '../../domain/listing';
import { isBackendConfigured } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';
import { useFavourites } from '../../state/FavouritesContext';
import { useSearch } from '../../state/SearchContext';
import { useFarm } from '../../state/useFarm';
import { colors, font, MIN_TAP, radius, space } from '../../theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function ActionButton({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, primary ? styles.actionPrimary : styles.actionSecondary, pressed && { opacity: 0.8 }]}
    >
      <Text style={[styles.actionText, primary && { color: colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export default function FarmProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { location } = useSearch();
  const { isFavourite, toggleFavourite } = useFavourites();
  const { userId, role } = useAuth();
  const { farm, loading, reload } = useFarm(id);

  if (!farm) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: loading ? 'Loading…' : 'Not found' }} />
        <Text style={styles.sectionTitle}>{loading ? 'Loading…' : 'We couldn’t find that place'}</Text>
        {!loading && <Text style={styles.body}>It may have been removed. Go back and try another.</Text>}
      </View>
    );
  }

  const isOwner = !!userId && farm.ownerId === userId;
  const canClaim = isBackendConfigured && !farm.isSample && farm.status === 'live' && !farm.ownerId && !!userId;
  const showReview = role === 'admin' && farm.status === 'pending';

  const tz = timezoneForState(farm.state);
  const now = new Date();
  const status = openStatus(farm.hours, tz, now);
  const today = localDayAndMinutes(now, tz).day;
  const distance = formatDistance(haversineKm(location, farm));
  const saved = isFavourite(farm.id);
  const tel = farm.phone ? telUrl(farm.phone) : null;
  const web = farm.website ? websiteUrl(farm.website) : null;
  const badge = licenceBadge(farm);
  const todayIso = now.toISOString().slice(0, 10);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: farm.name }} />

      {farm.photos && farm.photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {farm.photos.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={styles.photo}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={`Photo of ${farm.name}`}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.noPhoto} accessible accessibilityLabel="No photos yet">
          <Text style={styles.noPhotoText}>No photos yet</Text>
        </View>
      )}

      {farm.status && farm.status !== 'live' && (
        <View style={styles.sample} accessibilityRole="alert">
          <Text style={styles.sampleText}>
            {STATUS_LABELS[farm.status]}: {statusAdvice(farm.status, farm.reviewNote)} Only you{role === 'admin' ? ' and reviewers' : ''} can see this.
          </Text>
        </View>
      )}

      {showReview && <ReviewPanel farm={farm} onChanged={reload} />}

      {isOwner && (
        <View style={styles.actions}>
          <ActionButton label="Edit my listing" onPress={() => router.push(`/farmer/${farm.id}`)} />
          {farm.products.length > 0 && <ActionButton label="Update stock and prices" onPress={() => router.push(`/farmer/stock/${farm.id}`)} />}
        </View>
      )}

      {farm.isSample && (
        <View style={styles.sample}>
          <Text style={styles.sampleText}>SAMPLE – not a real farm. Details are made up for testing.</Text>
        </View>
      )}

      <Text style={styles.name}>{farm.name}</Text>
      <Text style={styles.meta}>
        {VENUE_LABELS[farm.type]} · {farm.locality}, {STATE_NAMES[farm.state]} {farm.postcode}
      </Text>
      <Text style={styles.distance}>{distance} from {location.label}</Text>
      <Text style={[styles.status, { color: status.isOpen ? colors.open : colors.closed }]}>
        {status.isOpen ? '● ' : '○ '}
        {status.label}
      </Text>
      {farm.tags.length > 0 && <Text style={styles.tags}>{farm.tags.map((t) => TAG_LABELS[t]).join(' · ')}</Text>}

      <View style={styles.actions}>
        <ActionButton label="Get directions" primary onPress={() => Linking.openURL(directionsUrl(farm))} />
        {tel && <ActionButton label={`Call ${farm.phone}`} onPress={() => Linking.openURL(tel)} />}
        {web && <ActionButton label="Visit website" onPress={() => Linking.openURL(web)} />}
        <ActionButton
          label={saved ? '♥ Saved – tap to remove' : '♡ Save this place'}
          onPress={() => toggleFavourite(farm.id)}
        />
      </View>

      <Section title="About">
        <Text style={styles.body}>{farm.story}</Text>
      </Section>

      <Section title="What’s available">
        {farm.products.map((p) => (
          <View key={`${p.category}-${p.name}`} style={styles.productRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.productName, !p.inStock && styles.muted]}>{p.name}</Text>
              <Text style={styles.small}>{PRODUCT_LABELS[p.category]}{p.pasteurised ? ' · pasteurised' : ''}</Text>
            </View>
            <View style={styles.priceBox}>
              <Text style={[styles.price, !p.inStock && styles.muted]}>
                {p.priceCents !== undefined ? formatPrice(p.priceCents, p.unit) : 'Ask for price'}
              </Text>
              <Text style={[styles.small, { color: p.inStock ? colors.open : colors.closed, fontWeight: '700' }]}>
                {p.inStock ? 'In stock' : 'Out of stock'}
              </Text>
            </View>
          </View>
        ))}
      </Section>

      <Section title="Opening hours">
        {hoursLines(farm.hours).map((line) => (
          <View key={line.label} style={[styles.hoursRow, line.day === today && styles.hoursToday]}>
            <Text style={[styles.hoursDay, line.day === today && styles.bold]}>{line.label}</Text>
            <Text style={[styles.hoursText, line.day === today && styles.bold]}>{line.text}</Text>
          </View>
        ))}
        {farm.hours.note ? <Text style={styles.small}>{farm.hours.note}</Text> : null}
        <Text style={styles.small}>Times are local to {farm.locality}.</Text>
      </Section>

      <Section title="Pick-up and delivery">
        <Text style={styles.body}>{farm.fulfilment.map((f) => FULFILMENT_LABELS[f]).join(' · ')}</Text>
      </Section>

      <Section title="How to pay">
        <Text style={styles.body}>{farm.paymentTypes.map((p) => PAYMENT_LABELS[p]).join(' · ')}</Text>
        <Text style={styles.small}>You pay the farmer directly. Payments are not made in this app.</Text>
      </Section>

      {farm.licences.length > 0 && (
        <Section title="Licences and accreditation">
          {farm.licences.map((l) => {
            const expired = l.expiresOn !== undefined && l.expiresOn < todayIso;
            return (
              <View key={`${l.category}-${l.licenceNumber}`} style={styles.licence}>
                <Text style={styles.productName}>{LICENCE_LABELS[l.category]}</Text>
                <Text style={styles.body}>
                  {l.regulator} · {l.licenceNumber}
                </Text>
                <Text style={[styles.small, expired && { color: colors.closed, fontWeight: '700' }]}>
                  {expired ? 'Expired' : l.expiresOn ? `Valid to ${formatDateAu(l.expiresOn)}` : 'No expiry given'} ·{' '}
                  {l.status === 'admin_checked' ? 'Checked by Farm Direct' : 'Declared by the farmer'}
                </Text>
              </View>
            );
          })}
          <Text style={styles.small}>
            {badge === 'checked' ? '' : 'Licence details are provided by the farmer. '}
            If you are unsure, check with your state food regulator.
          </Text>
        </Section>
      )}

      <Text style={styles.updated}>Listing last updated {formatDateAu(farm.updatedOn)}</Text>

      {canClaim && (
        <ActionButton label="Is this your farm? Claim it" onPress={() => router.push(`/claim/${farm.id}`)} />
      )}
      {isBackendConfigured && !farm.isSample && farm.status === 'live' && !!userId && (
        <ActionButton label="Report a problem with this listing" onPress={() => router.push(`/report/${farm.id}`)} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl * 2, gap: space.sm },
  missing: { flex: 1, padding: space.xl, gap: space.md },
  photos: { gap: space.sm },
  photo: { width: 280, height: 190, borderRadius: radius.card, backgroundColor: colors.chip },
  noPhoto: { height: 120, borderRadius: radius.card, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  noPhotoText: { fontSize: font.body, color: colors.textMuted },
  sample: { backgroundColor: colors.sampleBackground, borderRadius: 8, padding: space.md },
  sampleText: { fontSize: font.small, fontWeight: '700', color: colors.sampleText },
  name: { fontSize: font.heading, fontWeight: '700', color: colors.text, marginTop: space.sm },
  meta: { fontSize: font.body, color: colors.textMuted },
  distance: { fontSize: font.body, color: colors.primary, fontWeight: '700' },
  status: { fontSize: font.large, fontWeight: '700' },
  tags: { fontSize: font.body, color: colors.accent, fontWeight: '600' },
  actions: { gap: space.sm, marginVertical: space.md },
  action: { minHeight: MIN_TAP + 4, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, borderWidth: 2 },
  actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionSecondary: { backgroundColor: colors.surface, borderColor: colors.border },
  actionText: { fontSize: font.large, fontWeight: '700', color: colors.text },
  section: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm, marginTop: space.sm },
  sectionTitle: { fontSize: font.title, fontWeight: '700', color: colors.text },
  body: { fontSize: font.body, color: colors.text, lineHeight: 26 },
  small: { fontSize: font.small, color: colors.textMuted },
  muted: { color: colors.textMuted },
  bold: { fontWeight: '700' },
  productRow: { flexDirection: 'row', gap: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  productName: { fontSize: font.body, fontWeight: '700', color: colors.text },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: font.body, fontWeight: '700', color: colors.text },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: 6, paddingHorizontal: space.sm, borderRadius: 8 },
  hoursToday: { backgroundColor: colors.chip },
  hoursDay: { fontSize: font.body, color: colors.text },
  hoursText: { fontSize: font.body, color: colors.text, textAlign: 'right', flexShrink: 1 },
  licence: { gap: 2, paddingVertical: space.xs },
  updated: { fontSize: font.small, color: colors.textMuted, textAlign: 'center', marginTop: space.lg },
});
