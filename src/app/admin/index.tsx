import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Notice } from '../../components/FormBits';
import { Pad } from '../../components/EditorBits';
import { Button, EmptyState, Row, Section } from '../../components/ui';
import {
  convertSuggestion,
  fetchReviewQueue,
  rejectSuggestion,
  reviewClaim,
  type ReviewQueue,
} from '../../data/mutations';
import { formatDateAu } from '../../domain/format';
import { friendlyDbError } from '../../domain/listing';
import { PRODUCT_LABELS, STATE_NAMES, VENUE_LABELS } from '../../domain/types';
import { useAuth } from '../../state/AuthContext';
import { colors, space, type } from '../../theme';

/** Heading for one queue type, with an optional hint underneath. */
function QueueHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.queueHead}>
      <Text style={[type.title3, styles.queueTitle]} accessibilityRole="header">
        {title}
      </Text>
      {hint ? <Text style={[type.footnote, styles.queueHint]}>{hint}</Text> : null}
    </View>
  );
}

export default function AdminQueueScreen() {
  const { role } = useAuth();
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (role !== 'admin') return;
    setLoading(true);
    try {
      setQueue(await fetchReviewQueue());
      setError(null);
    } catch (e) {
      setError(friendlyDbError((e as Error).message));
    } finally {
      setLoading(false);
    }
  }, [role]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await load();
    } catch (e) {
      setError(friendlyDbError((e as Error).message));
    }
  };

  if (role !== 'admin') {
    return (
      <View style={styles.guard}>
        <Notice kind="info">This area is for Farm Direct reviewers only.</Notice>
      </View>
    );
  }

  const empty = queue && queue.farms.length + queue.claims.length + queue.suggestions.length === 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      {error && (
        <View style={styles.inset}>
          <Notice kind="error">{error}</Notice>
        </View>
      )}
      {empty && (
        <EmptyState icon="checkmark.circle" title="Nothing waiting for review." style={styles.empty} />
      )}

      {queue && queue.farms.length > 0 && (
        <>
          <QueueHead title={`Listings to review (${queue.farms.length})`} />
          {queue.farms.map((farm) => (
            <Section key={farm.id}>
              <Pad>
                <Text style={[type.headline, styles.itemTitle]} accessibilityRole="header">
                  {farm.name}
                </Text>
              </Pad>
              <Row title="Location" value={`${farm.locality}, ${farm.state}`} />
              <Row title="Products" value={`${farm.products.length} product${farm.products.length === 1 ? '' : 's'}`} />
              <Row title="Updated" value={formatDateAu(farm.updatedOn)} />
              <Pad style={styles.actions}>
                <Button label="Open and review" onPress={() => router.push(`/farm/${farm.id}`)} />
              </Pad>
            </Section>
          ))}
        </>
      )}

      {queue && queue.claims.length > 0 && (
        <>
          <QueueHead
            title={`Ownership claims (${queue.claims.length})`}
            hint="Check the ABN on abr.business.gov.au and call the phone number before approving."
          />
          {queue.claims.map((claim) => (
            <Section key={claim.id}>
              <Pad>
                <Text style={[type.headline, styles.itemTitle]} accessibilityRole="header">
                  {claim.farms?.name ?? 'Unknown listing'}
                </Text>
              </Pad>
              <Row title="ABN" value={claim.abn} />
              <Row title="Phone" value={claim.phone} />
              {claim.note ? (
                <Row title="Note">
                  <Text style={[type.callout, styles.long]}>“{claim.note}”</Text>
                </Row>
              ) : null}
              <Pad style={styles.actions}>
                <Button label="Approve – make them the owner" onPress={() => run(() => reviewClaim(claim.id, true))} />
                <Button label="Reject" variant="tinted" role="destructive" onPress={() => run(() => reviewClaim(claim.id, false))} />
                <Button label="Look at the listing" variant="tinted" onPress={() => router.push(`/farm/${claim.farm_id}`)} />
              </Pad>
            </Section>
          ))}
        </>
      )}

      {queue && queue.suggestions.length > 0 && (
        <>
          <QueueHead
            title={`Suggested places (${queue.suggestions.length})`}
            hint="Adding one creates an unowned listing for you to review. Search for real details first."
          />
          {queue.suggestions.map((s) => (
            <Section key={s.id}>
              <Pad>
                <Text style={[type.headline, styles.itemTitle]} accessibilityRole="header">
                  {s.name}
                </Text>
              </Pad>
              <Row title="Type" value={VENUE_LABELS[s.venue_type] ?? 'Farm'} />
              <Row title="Location" value={`${s.locality}, ${STATE_NAMES[s.state]} ${s.postcode}`} />
              {s.products.length > 0 && (
                <Row title="Products">
                  <Text style={[type.callout, styles.long]}>{s.products.map((p) => PRODUCT_LABELS[p]).join(' · ')}</Text>
                </Row>
              )}
              {s.notes ? (
                <Row title="Notes">
                  <Text style={[type.callout, styles.long]}>“{s.notes}”</Text>
                </Row>
              ) : null}
              <Pad style={styles.actions}>
                <Button
                  label="Add as a listing to review"
                  onPress={() =>
                    run(async () => {
                      const farmId = await convertSuggestion(s.id);
                      router.push(`/farm/${farmId}`);
                    })
                  }
                />
                <Button label="Reject" variant="tinted" role="destructive" onPress={() => run(() => rejectSuggestion(s.id))} />
              </Pad>
            </Section>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.groupedBackground },
  content: { paddingTop: space.sm, paddingBottom: space.xxl },
  guard: { padding: space.lg },
  inset: { marginHorizontal: space.lg, marginBottom: space.lg },
  empty: { marginTop: space.xxl },
  queueHead: { marginHorizontal: space.lg, marginBottom: space.sm, gap: space.xs, marginTop: space.sm },
  queueTitle: { color: colors.label, fontWeight: '600' },
  queueHint: { color: colors.secondaryLabel },
  itemTitle: { color: colors.label },
  long: { color: colors.label },
  actions: { gap: space.sm },
});
