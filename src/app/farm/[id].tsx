import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { SUPPORT_EMAIL } from '../../config';
import { ReviewPanel } from '../../components/ReviewPanel';
import { Notice } from '../../components/FormBits';
import { ActionTiles, type ActionTileSpec } from '../../components/place/ActionTiles';
import { HoursSection, irregularStatusLabel } from '../../components/place/HoursSection';
import { NearbySection } from '../../components/place/NearbySection';
import { Badge, EmptyState, Icon, Row, Section, tapLight, type SFSymbol } from '../../components/ui';
import { ROW_ICON_GAP, ROW_ICON_SIZE, ROW_PADDING } from '../../components/ui/Row';
import { licenceBadge } from '../../domain/compliance';
import { formatDistance, haversineKm } from '../../domain/geo';
import { localDayAndMinutes, openStatus, timezoneForState } from '../../domain/hours';
import { addressLines, describeAge, formatDateAu, formatPrice, isStale, UNCLAIMED_STALE_AFTER_DAYS } from '../../domain/format';
import { directionsUrl, sourceRows, telUrl, websiteUrl } from '../../domain/links';
import { shareText } from '../../domain/share';
import {
  FULFILMENT_LABELS,
  LICENCE_LABELS,
  PAYMENT_LABELS,
  PRODUCT_DISPLAY_ORDER,
  PRODUCT_LABELS,
  STATE_NAMES,
  TAG_LABELS,
  VENUE_LABELS,
  type Farm,
} from '../../domain/types';
import { statusAdvice, STATUS_LABELS } from '../../domain/listing';
import { claimMailto, reportMailto } from '../../domain/support';
import { openEmail, openLink } from '../../lib/openLink';
import { isBackendConfigured } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';
import { useFavourites } from '../../state/FavouritesContext';
import { useSearch } from '../../state/SearchContext';
import { useFarm } from '../../state/useFarm';
import { colors, MIN_TAP, space, type } from '../../theme';

// A crash on this screen keeps the navigation bar and offers a way back.
export { ScreenErrorBoundary as ErrorBoundary } from '../../components/ScreenErrorBoundary';

/** Hero photo height (pt). Edge to edge, under the navigation bar. */
const HERO_HEIGHT = 240;

const UNCLAIMED_STALE_TEXT = 'These details were last checked over a year ago. Call or check the source before you travel.';
const CLAIMED_STALE_TEXT = 'This listing hasn’t been updated for a while. Call ahead to check before you travel.';

/**
 * A grouped row whose first line can be long-pressed to copy (selectable text), and whose tap opens a link.
 * `icon` is also read by `Section` to inset the separator past the symbol.
 */
function CopyableRow({
  icon,
  line1,
  line2,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  icon: SFSymbol;
  line1: string;
  line2?: string;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.copyRow, pressed && { backgroundColor: colors.fill }]}
    >
      <View style={styles.copyIcon}>
        <Icon name={icon} size={22} color={colors.tint} />
      </View>
      <View style={styles.copyText}>
        <Text selectable style={[type.body, { color: colors.label }]}>
          {line1}
        </Text>
        {line2 ? <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>{line2}</Text> : null}
      </View>
      <Icon name="chevron.right" size={14} weight="semibold" color={colors.tertiaryLabel} />
    </Pressable>
  );
}

/** Product categories in display order ("Fruit · Vegetables · Eggs"), in-stock ones first choice. */
function categoryLine(farm: Farm): string {
  const inStock = farm.products.filter((p) => p.inStock);
  const pool = inStock.length > 0 ? inStock : farm.products;
  const present = new Set(pool.map((p) => p.category));
  return PRODUCT_DISPLAY_ORDER.filter((c) => present.has(c))
    .map((c) => PRODUCT_LABELS[c])
    .join(' · ');
}

function ShareButton({ farm }: { farm: Farm }) {
  return (
    <Pressable
      onPress={() => {
        tapLight();
        Share.share({ message: shareText(farm) }).catch(() => {});
      }}
      accessibilityRole="button"
      accessibilityLabel={`Share ${farm.name}`}
      hitSlop={4}
      style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
    >
      <Icon name="square.and.arrow.up" size={20} color={colors.tint} />
    </Pressable>
  );
}

export default function FarmProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { location, isDefaultLocation, now } = useSearch();
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
          <EmptyState
            icon="mappin.slash"
            title="We couldn’t find that place"
            message="It may have been removed. Try browsing for another."
            action={{ label: 'Browse places', onPress: () => router.replace('/') }}
          />
        )}
      </View>
    );
  }

  const isOwner = !!userId && farm.ownerId === userId;
  // With a backend, claims and reports are in-app forms. Otherwise they are pre-filled emails. When the build has
  // no support address either, "Check the source" opens the public page the details came from, so there is
  // always a way to correct a listing. Never a screen that needs accounts.
  const canClaim = isBackendConfigured && (farm.unclaimed ? true : !farm.isSample && farm.status === 'live' && !farm.ownerId && !!userId);
  const canReport = isBackendConfigured && !farm.unclaimed && !farm.isSample && farm.status === 'live' && !!userId;
  const claimEmail = !canClaim && farm.unclaimed ? claimMailto(SUPPORT_EMAIL, farm) : null;
  const reportEmail = !canReport && !farm.isSample ? reportMailto(SUPPORT_EMAIL, farm) : null;
  const showReview = role === 'admin' && farm.status === 'pending';

  const tz = timezoneForState(farm.state);
  const status = openStatus(farm.hours, tz, now);
  const irregular = status.kind === 'irregular';
  const statusLabel = irregular ? irregularStatusLabel(farm.hours.note) : status.label;
  const statusColor = status.isOpen ? colors.green : status.opensToday ? colors.orange : colors.secondaryLabel;
  const today = localDayAndMinutes(now, tz).day;
  const saved = isFavourite(farm.id);
  const tel = farm.phone ? telUrl(farm.phone) : null;
  const web = farm.website ? websiteUrl(farm.website) : null;
  const badge = licenceBadge(farm);
  const todayIso = now.toISOString().slice(0, 10);
  const photos = farm.photos ?? [];
  const hasPhotos = photos.length > 0;
  const sources = sourceRows(farm.sources ?? []);
  const checkSource = !canReport && !reportEmail && !farm.isSample ? sources[0] : undefined;

  const metaParts = [`${VENUE_LABELS[farm.type]} · ${farm.locality}, ${STATE_NAMES[farm.state]} ${farm.postcode}`];
  // The distance means nothing until the person has chosen where they are.
  if (!isDefaultLocation) {
    metaParts.push(`${formatDistance(haversineKm(location, farm), farm.locationApprox)} from ${location.label}`);
  }
  const meta = metaParts.join(' · ');

  const address = addressLines(farm);
  const approx = farm.locationApprox ? ' · approximate location' : '';
  const addressLine1 = address?.line1 ?? `${farm.locality} ${farm.state} ${farm.postcode}`.replace(/\s+/g, ' ').trim();
  const addressLine2 = address ? `${address.line2}${approx}` : farm.locationApprox ? 'Approximate location' : undefined;

  const unpricedUnclaimed = farm.unclaimed && farm.products.every((p) => p.priceCents === undefined);
  const advertisedNote = 'As advertised by this place. Farm Direct has not checked food licences here.';

  const staleNow = farm.unclaimed
    ? isStale(farm.updatedOn, now, UNCLAIMED_STALE_AFTER_DAYS)
    : isStale(farm.updatedOn, now);
  const checkedLine = farm.unclaimed
    ? `Details checked against public sources on ${formatDateAu(farm.updatedOn)}`
    : `Listing last updated ${formatDateAu(farm.updatedOn)} (${describeAge(farm.updatedOn, now)})`;

  const actions: ActionTileSpec[] = [
    {
      key: 'directions',
      variant: 'filled',
      icon: 'arrow.triangle.turn.up.right.circle.fill',
      label: 'Directions',
      accessibilityHint: 'Opens in Maps',
      onPress: () => openLink(directionsUrl(farm)),
    },
  ];
  if (tel) actions.push({ key: 'call', icon: 'phone.fill', label: 'Call', accessibilityLabel: `Call ${farm.phone}`, onPress: () => openLink(tel) });
  if (web) actions.push({ key: 'website', icon: 'safari', label: 'Website', accessibilityLabel: 'Visit website', onPress: () => openLink(web) });
  actions.push({
    key: 'save',
    icon: saved ? 'heart.fill' : 'heart',
    label: saved ? 'Saved' : 'Save',
    accessibilityLabel: saved ? 'Saved – tap to remove' : 'Save this place',
    color: saved ? colors.red : undefined,
    fill: saved ? colors.redFill : undefined,
    selected: saved,
    onPress: () => {
      tapLight();
      toggleFavourite(farm.id);
    },
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
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: hasPhotos,
          headerBackButtonDisplayMode: 'minimal',
          headerRight: Platform.OS === 'web' ? undefined : () => <ShareButton farm={farm} />,
        }}
      />

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
        <Section style={styles.ownerTools}>
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
          <Notice kind="warn">Sample listing. This is not a real farm.</Notice>
        </View>
      )}

      <View style={styles.header}>
        <Text style={[type.title1, styles.name, { color: colors.label }]} accessibilityRole="header">
          {farm.name}
        </Text>
        <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>{meta}</Text>
        {farm.unclaimed && (
          <Text style={[type.footnote, { color: colors.secondaryLabel }]}>From public sources · not confirmed by the owner</Text>
        )}
        <View style={styles.statusLine} accessible accessibilityLabel={statusLabel}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[type.subheadline, styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        {farm.isSample || farm.tags.length > 0 ? (
          <View style={styles.badges}>
            {farm.isSample && <Badge label="SAMPLE" tone="orange" />}
            {farm.tags.map((t) => (
              <Badge key={t} label={TAG_LABELS[t]} />
            ))}
          </View>
        ) : null}
      </View>

      <ActionTiles actions={actions} />

      <HoursSection hours={farm.hours} locality={farm.locality} today={today} />

      <Section header={tel ? 'Address and phone' : 'Address'}>
        <CopyableRow
          icon="mappin.and.ellipse"
          line1={addressLine1}
          line2={addressLine2}
          onPress={() => openLink(directionsUrl(farm))}
          accessibilityLabel={`Address: ${[addressLine1, addressLine2].filter(Boolean).join(', ')}`}
          accessibilityHint="Opens in Maps"
        />
        {tel && farm.phone ? (
          <CopyableRow
            icon="phone"
            line1={farm.phone}
            line2="Phone"
            onPress={() => openLink(tel)}
            accessibilityLabel={`Phone: ${farm.phone}`}
            accessibilityHint="Calls this number"
          />
        ) : null}
      </Section>

      {farm.products.length > 0 ? (
        unpricedUnclaimed ? (
          <Section header="Produce" footer={advertisedNote}>
            <Row title={categoryLine(farm)} subtitle={farm.otherProducts} />
          </Section>
        ) : (
          <Section
            header={farm.unclaimed ? 'Produce' : 'Produce and prices'}
            footer={farm.unclaimed ? [farm.otherProducts, advertisedNote].filter(Boolean).join('\n') : farm.otherProducts}
          >
            {farm.products.map((p) => {
              const category = PRODUCT_LABELS[p.category];
              const subtitle = [p.name === category ? null : category, p.pasteurised ? 'pasteurised' : null, p.inStock ? null : 'Out of stock']
                .filter(Boolean)
                .join(' · ');
              return (
                <Row
                  key={`${p.category}-${p.name}`}
                  title={p.name}
                  subtitle={subtitle || undefined}
                  value={p.priceCents !== undefined ? formatPrice(p.priceCents, p.unit) : farm.unclaimed ? undefined : 'Ask for price'}
                />
              );
            })}
          </Section>
        )
      ) : farm.otherProducts ? (
        <Section header="Produce" footer={farm.unclaimed ? advertisedNote : undefined}>
          <View style={styles.paragraph}>
            <Text style={[type.body, { color: colors.label }]}>{farm.otherProducts}</Text>
          </View>
        </Section>
      ) : null}

      {!farm.unclaimed && farm.fulfilment.length > 0 && (
        <Section header="Pick-up and delivery">
          <Row title={farm.fulfilment.map((f) => FULFILMENT_LABELS[f]).join(' · ')} />
        </Section>
      )}

      {farm.paymentTypes.length > 0 && (
        <Section header="Payment" footer="You pay the farmer directly. Payments are not made in this app.">
          <Row title={farm.paymentTypes.map((p) => PAYMENT_LABELS[p]).join(' · ')} />
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

      {farm.story.trim() ? (
        <Section header="About">
          <View style={styles.paragraph}>
            <Text style={[type.body, { color: colors.label }]}>{farm.story}</Text>
          </View>
        </Section>
      ) : null}

      <NearbySection farm={farm} now={now} />

      {sources.length > 0 && (
        <Section
          header="Sources"
          footer={
            farm.unclaimed
              ? 'Details come from these public pages and have not been confirmed by the owner.'
              : 'Details come from these public pages and may be out of date.'
          }
        >
          {sources.map((source) => (
            <Row
              key={source.url}
              icon="link"
              title={source.title}
              subtitle={source.subtitle}
              accessory="chevron"
              accessibilityLabel={`Open ${source.title}${source.subtitle ? `, ${source.subtitle}` : ''}`}
              accessibilityHint="Opens the page in your browser"
              onPress={() => openLink(source.url)}
            />
          ))}
        </Section>
      )}

      {!farm.isSample && staleNow && (
        <View style={styles.stale}>
          <Notice kind="warn">{farm.unclaimed ? UNCLAIMED_STALE_TEXT : CLAIMED_STALE_TEXT}</Notice>
        </View>
      )}

      <Section footer={checkedLine}>
        {canReport && <Row title="Report a problem" accessory="chevron" onPress={() => router.push(`/report/${farm.id}`)} />}
        {reportEmail && (
          <Row
            title="Report a problem"
            subtitle="Wrong hours, closed or moved? Email us"
            accessory="chevron"
            onPress={() => openEmail(reportEmail, SUPPORT_EMAIL)}
          />
        )}
        {checkSource && (
          <Row
            title="Check the source"
            subtitle={`Wrong hours, closed or moved? See ${checkSource.title}`}
            accessory="chevron"
            accessibilityHint="Opens the page in your browser"
            onPress={() => openLink(checkSource.url)}
          />
        )}
        {canClaim && (
          <Row
            title="Claim this listing"
            subtitle={farm.unclaimed ? 'Is this your place?' : 'Is this your farm?'}
            accessory="chevron"
            onPress={() => router.push(`/claim/${farm.id}`)}
          />
        )}
        {claimEmail && (
          <Row
            title="Is this your place?"
            subtitle="Email us to claim or update this listing"
            accessory="chevron"
            onPress={() => openEmail(claimEmail, SUPPORT_EMAIL)}
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
  ownerTools: { marginTop: space.md },
  stale: { paddingHorizontal: space.lg, marginBottom: space.xl },
  header: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md, gap: space.xs },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontWeight: '600', flexShrink: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  name: { fontWeight: '600' },
  paragraph: { paddingHorizontal: ROW_PADDING, paddingVertical: space.md },
  headerButton: { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  copyRow: {
    minHeight: MIN_TAP,
    paddingHorizontal: ROW_PADDING,
    paddingVertical: space.sm + 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_ICON_GAP,
  },
  copyIcon: { width: ROW_ICON_SIZE, alignItems: 'center', justifyContent: 'center' },
  copyText: { flex: 1, gap: 1 },
});
