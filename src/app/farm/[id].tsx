import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ColorValue } from 'react-native';

import { ReviewPanel } from '../../components/ReviewPanel';
import { Notice } from '../../components/FormBits';
import { Badge, EmptyState, Icon, Row, Section, tapLight, type SFSymbol } from '../../components/ui';
import { ROW_PADDING } from '../../components/ui/Row';
import { licenceBadge } from '../../domain/compliance';
import { formatDistance, haversineKm } from '../../domain/geo';
import { hoursLines, localDayAndMinutes, openStatus, timezoneForState } from '../../domain/hours';
import { describeAge, formatDateAu, formatPrice, isStale } from '../../domain/format';
import { directionsUrl, hostLabel, telUrl, websiteUrl } from '../../domain/links';
import {
  FULFILMENT_LABELS,
  LICENCE_LABELS,
  PAYMENT_LABELS,
  PRODUCT_LABELS,
  STATE_NAMES,
  TAG_LABELS,
  VENUE_LABELS,
} from '../../domain/types';
import { statusAdvice, STATUS_LABELS } from '../../domain/listing';
import { isBackendConfigured } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';
import { useFavourites } from '../../state/FavouritesContext';
import { useSearch } from '../../state/SearchContext';
import { useFarm } from '../../state/useFarm';
import { colors, MIN_TAP, radius, space, type } from '../../theme';

/** Hero photo height (pt). Edge to edge, under the navigation bar. */
const HERO_HEIGHT = 240;

/** Opens an external link; shows an alert instead of an unhandled rejection if no app can open it. */
async function openLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Couldn’t open that', 'Check that the app for this link is installed, then try again.');
  }
}

/**
 * Equal-width action tile, like the Apple Maps place card: symbol above a footnote label.
 * `filled` is the one primary action (Directions); `tinted` is the quiet default.
 */
function ActionTile({
  icon,
  label,
  onPress,
  accessibilityLabel,
  variant = 'tinted',
  color,
  fill,
  selected,
}: {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  variant?: 'filled' | 'tinted';
  /** Tinted only: symbol and label colour. Default tint. */
  color?: ColorValue;
  /** Tinted only: background colour. Default tintFill. */
  fill?: ColorValue;
  selected?: boolean;
}) {
  const filled = variant === 'filled';
  const fg = filled ? colors.onTint : (color ?? colors.tint);
  const bg = filled ? colors.tint : (fill ?? colors.tintFill);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={selected !== undefined ? { selected } : undefined}
      style={({ pressed }) => [styles.tile, { backgroundColor: bg }, pressed && styles.tilePressed]}
    >
      <Icon name={icon} size={24} color={fg} />
      <Text style={[type.footnote, styles.tileLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * One opening-hours line. Same metrics as `Row`, but today's line is semibold, which `Row` cannot do.
 */
function HoursRow({ day, text, today }: { day: string; text: string; today: boolean }) {
  return (
    <View style={styles.hoursRow}>
      <Text style={[type.body, { color: colors.label, fontWeight: today ? '600' : '400' }]}>{day}</Text>
      <Text style={[type.body, styles.hoursValue, { fontWeight: today ? '600' : '400' }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export default function FarmProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { location } = useSearch();
  const { isFavourite, toggleFavourite } = useFavourites();
  const { userId, role } = useAuth();
  const { farm, loading, reload } = useFarm(id);
  const { width } = useWindowDimensions();

  if (!farm) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: loading ? 'Loading…' : 'Not found' }} />
        {loading ? (
          <EmptyState icon="leaf" title="Loading…" />
        ) : (
          <EmptyState icon="mappin.slash" title="We couldn’t find that place" message="It may have been removed. Go back and try another." />
        )}
      </View>
    );
  }

  const isOwner = !!userId && farm.ownerId === userId;
  const canClaim = farm.unclaimed
    ? true
    : isBackendConfigured && !farm.isSample && farm.status === 'live' && !farm.ownerId && !!userId;
  const canReport = isBackendConfigured && !farm.unclaimed && !farm.isSample && farm.status === 'live' && !!userId;
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
  const photos = farm.photos ?? [];
  const meta = `${VENUE_LABELS[farm.type]} · ${farm.locality}, ${STATE_NAMES[farm.state]} ${farm.postcode}`;

  const hasPhotos = photos.length > 0;
  const sources = (farm.sources ?? []).flatMap((url) => {
    const link = websiteUrl(url);
    const host = hostLabel(url);
    return link && host ? [{ url: link, host }] : [];
  });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior={hasPhotos ? 'never' : 'automatic'}
      contentContainerStyle={styles.content}
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
    >
      {/* With photos: like an Apple Maps place card, the photo runs to the top edge under a clear bar.
          Without photos: a normal opaque system bar and no hero; the content starts with the name. */}
      <Stack.Screen options={{ title: '', headerTransparent: hasPhotos, headerBackButtonDisplayMode: 'minimal' }} />

      {hasPhotos ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ height: HERO_HEIGHT }}>
          {photos.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={{ width, height: HERO_HEIGHT, backgroundColor: colors.fill }}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={`Photo of ${farm.name}`}
            />
          ))}
        </ScrollView>
      ) : null}

      {farm.status && farm.status !== 'live' && (
        <View style={styles.pad}>
          <Notice kind="warn">
            {`${STATUS_LABELS[farm.status]}: ${statusAdvice(farm.status, farm.reviewNote)} Only you${role === 'admin' ? ' and reviewers' : ''} can see this.`}
          </Notice>
        </View>
      )}

      {showReview && (
        <View style={styles.pad}>
          <ReviewPanel farm={farm} onChanged={reload} />
        </View>
      )}

      {(isOwner || role === 'admin') && !farm.isSample && !!farm.id && (
        <Section>
          <Row
            title={isOwner ? 'Edit my listing' : 'Edit this listing (reviewer)'}
            accessory="chevron"
            onPress={() => router.push(`/farmer/${farm.id}`)}
          />
          {farm.products.length > 0 && (
            <Row title="Update stock and prices" accessory="chevron" onPress={() => router.push(`/farmer/stock/${farm.id}`)} />
          )}
        </Section>
      )}

      {farm.isSample && (
        <View style={styles.pad}>
          <Notice kind="warn">SAMPLE – not a real farm. Details are made up for testing.</Notice>
        </View>
      )}

      {farm.unclaimed && (
        <View style={styles.pad}>
          <Notice kind="info">From public sources. Not yet confirmed by the owner.</Notice>
        </View>
      )}

      <View style={styles.header}>
        <Text style={[type.title1, styles.name, { color: colors.label }]} accessibilityRole="header">
          {farm.name}
        </Text>
        <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>{`${meta} · ${distance} from ${location.label}`}</Text>
        <View style={styles.statusLine}>
          <View style={[styles.dot, { backgroundColor: status.isOpen ? colors.green : colors.secondaryLabel }]} />
          <Text style={[type.subheadline, styles.statusText, { color: status.isOpen ? colors.green : colors.secondaryLabel }]}>
            {status.label}
          </Text>
        </View>
        {farm.isSample || farm.unclaimed || farm.tags.length > 0 ? (
          <View style={styles.badges}>
            {farm.isSample && <Badge label="SAMPLE" tone="orange" />}
            {farm.unclaimed && <Badge label="Unclaimed" />}
            {farm.tags.map((t) => (
              <Badge key={t} label={TAG_LABELS[t]} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <ActionTile
          variant="filled"
          icon="arrow.triangle.turn.up.right.circle.fill"
          label="Directions"
          onPress={() => openLink(directionsUrl(farm))}
        />
        {tel && (
          <ActionTile icon="phone.fill" label="Call" accessibilityLabel={`Call ${farm.phone}`} onPress={() => openLink(tel)} />
        )}
        {web && <ActionTile icon="safari" label="Website" accessibilityLabel="Visit website" onPress={() => openLink(web)} />}
        <ActionTile
          icon={saved ? 'heart.fill' : 'heart'}
          label={saved ? 'Saved' : 'Save'}
          accessibilityLabel={saved ? 'Saved – tap to remove' : 'Save this place'}
          color={saved ? colors.red : undefined}
          fill={saved ? colors.redFill : undefined}
          selected={saved}
          onPress={() => {
            tapLight();
            toggleFavourite(farm.id);
          }}
        />
      </View>

      {farm.unclaimed && canClaim && (
        <Section>
          <Row
            title="Claim this listing"
            subtitle="Is this your place?"
            icon="person.crop.circle.badge.checkmark"
            accessory="chevron"
            onPress={() => router.push(`/claim/${farm.id}`)}
          />
        </Section>
      )}

      <Section header="About">
        <View style={styles.paragraph}>
          <Text style={[type.body, { color: colors.label }]}>{farm.story}</Text>
        </View>
      </Section>

      {(farm.address || farm.locationApprox) && (
        <Section header="Address">
          <Row
            icon="mappin.and.ellipse"
            title={farm.address ?? [farm.locality, farm.state, farm.postcode].filter(Boolean).join(' ')}
            subtitle={farm.locationApprox ? 'Approximate location' : undefined}
          />
        </Section>
      )}

      {farm.products.length > 0 ? (
        <Section header={farm.unclaimed ? 'Produce' : 'Produce and prices'} footer={farm.otherProducts}>
          {farm.products.map((p) => (
            <Row
              key={`${p.category}-${p.name}`}
              title={p.name}
              subtitle={[`${PRODUCT_LABELS[p.category]}${p.pasteurised ? ' · pasteurised' : ''}`, p.inStock ? null : 'Out of stock']
                .filter(Boolean)
                .join(' · ')}
              value={p.priceCents !== undefined ? formatPrice(p.priceCents, p.unit) : farm.unclaimed ? undefined : 'Ask for price'}
            />
          ))}
        </Section>
      ) : farm.otherProducts ? (
        <Section header="Produce">
          <Row title={farm.otherProducts} />
        </Section>
      ) : null}

      <Section
        header="Opening hours"
        footer={[farm.hours.note, `Times are local to ${farm.locality}.`].filter(Boolean).join('\n')}
      >
        {hoursLines(farm.hours).map((line) => (
          <HoursRow key={line.label} day={line.label} text={line.text} today={line.day === today} />
        ))}
      </Section>

      {!farm.unclaimed && farm.fulfilment.length > 0 && (
        <Section header="Pick-up and delivery">
          <Row title={farm.fulfilment.map((f) => FULFILMENT_LABELS[f]).join(' · ')} />
        </Section>
      )}

      {farm.paymentTypes.length > 0 && (
        <Section
          header="Payment"
          footer="You pay the farmer directly. Payments are not made in this app."
        >
          <Row title={farm.paymentTypes.map((p) => PAYMENT_LABELS[p]).join(' · ')} />
        </Section>
      )}

      {sources.length > 0 && (
        <Section header="Sources" footer="Details come from these public pages and may be out of date.">
          {sources.map((source) => (
            <Row
              key={source.url}
              icon="link"
              title={source.host}
              accessory="chevron"
              accessibilityLabel={`Open ${source.host}`}
              accessibilityHint="Opens the page in your browser"
              onPress={() => openLink(source.url)}
            />
          ))}
        </Section>
      )}

      {farm.licences.length > 0 && (
        <Section
          header="Licences and food safety"
          footer={`${badge === 'checked' ? '' : 'Licence details are provided by the farmer. '}If you are unsure, check with your state food regulator.`}
        >
          {farm.licences.map((l) => {
            const expired = l.expiresOn !== undefined && l.expiresOn < todayIso;
            const checked = l.status === 'admin_checked';
            const detail = `${expired ? 'Expired' : l.expiresOn ? `Valid to ${formatDateAu(l.expiresOn)}` : 'No expiry given'} · ${
              checked ? 'Checked by Farm Direct' : 'Declared by the farmer'
            }`;
            return (
              <Row
                key={`${l.category}-${l.licenceNumber}`}
                title={LICENCE_LABELS[l.category]}
                subtitle={`${l.regulator} · ${l.licenceNumber}`}
                icon={checked ? 'checkmark.seal.fill' : 'doc.text'}
                iconColor={checked ? colors.tint : colors.secondaryLabel}
              >
                <Text style={[type.footnote, { color: expired ? colors.red : colors.secondaryLabel, fontWeight: expired ? '600' : '400' }]}>
                  {detail}
                </Text>
              </Row>
            );
          })}
        </Section>
      )}

      {!farm.isSample && isStale(farm.updatedOn, now) && (
        <View style={styles.pad}>
          <Notice kind="warn">This listing hasn’t been updated for a while. Call ahead to check before you travel.</Notice>
        </View>
      )}

      <Section footer={`Listing last updated ${formatDateAu(farm.updatedOn)} (${describeAge(farm.updatedOn, now)})`}>
        {canReport && <Row title="Report a problem" accessory="chevron" onPress={() => router.push(`/report/${farm.id}`)} />}
        {canClaim && !farm.unclaimed && (
          <Row
            title="Claim this listing"
            subtitle="Is this your farm?"
            accessory="chevron"
            onPress={() => router.push(`/claim/${farm.id}`)}
          />
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  missing: { flex: 1, backgroundColor: colors.groupedBackground },
  pad: { paddingHorizontal: space.lg, marginTop: space.md },
  header: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md, gap: space.xs },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontWeight: '600' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginVertical: space.md },
  tile: {
    flex: 1,
    minHeight: MIN_TAP + 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.group,
    borderCurve: 'continuous',
  },
  tilePressed: { opacity: 0.6 },
  tileLabel: { fontWeight: '500' },
  name: { fontWeight: '600' },
  paragraph: { paddingHorizontal: ROW_PADDING, paddingVertical: space.md },
  hoursRow: {
    minHeight: MIN_TAP,
    paddingHorizontal: ROW_PADDING,
    paddingVertical: space.sm + 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  hoursValue: { color: colors.secondaryLabel, flexShrink: 1, textAlign: 'right' },
});
