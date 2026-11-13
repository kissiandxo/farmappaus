import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Notice } from '../../components/FormBits';
import {
  convertSuggestion,
  fetchReviewQueue,
  rejectSuggestion,
  reviewClaim,
  type ReviewQueue,
} from '../../data/mutations';
import { formatDateAu } from '../../domain/format';
import { friendlyDbError } from '../../domain/listing';
import { PRODUCT_LABELS, STATE_NAMES } from '../../domain/types';
import { useAuth } from '../../state/AuthContext';
import { colors, font, space } from '../../theme';

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
      <View style={styles.content}>
        <Notice kind="info">This area is for Farm Direct reviewers only.</Notice>
      </View>
    );
  }

  const empty = queue && queue.farms.length + queue.claims.length + queue.suggestions.length === 0;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      {error && <Notice kind="error">{error}</Notice>}
      {empty && <Notice kind="ok">Nothing waiting for review. 🎉</Notice>}

      {queue && queue.farms.length > 0 && (
        <Card title={`Listings to review (${queue.farms.length})`}>
          {queue.farms.map((farm) => (
            <View key={farm.id} style={styles.item}>
              <Text style={styles.itemTitle}>{farm.name}</Text>
              <Text style={styles.body}>
                {farm.locality}, {farm.state} · {farm.products.length} product{farm.products.length === 1 ? '' : 's'} · updated {formatDateAu(farm.updatedOn)}
              </Text>
              <Btn label="Open and review" kind="primary" onPress={() => router.push(`/farm/${farm.id}`)} />
            </View>
          ))}
        </Card>
      )}

      {queue && queue.claims.length > 0 && (
        <Card title={`Ownership claims (${queue.claims.length})`} hint="Check the ABN on abr.business.gov.au and call the phone number before approving.">
          {queue.claims.map((claim) => (
            <View key={claim.id} style={styles.item}>
              <Text style={styles.itemTitle}>{claim.farms?.name ?? 'Unknown listing'}</Text>
              <Text style={styles.body}>ABN {claim.abn}</Text>
              <Text style={styles.body}>Phone {claim.phone}</Text>
              {claim.note ? <Text style={styles.body}>“{claim.note}”</Text> : null}
              <Btn label="Approve – make them the owner" kind="primary" onPress={() => run(() => reviewClaim(claim.id, true))} />
              <Btn label="Reject" kind="danger" onPress={() => run(() => reviewClaim(claim.id, false))} />
              <Btn label="Look at the listing" onPress={() => router.push(`/farm/${claim.farm_id}`)} />
            </View>
          ))}
        </Card>
      )}

      {queue && queue.suggestions.length > 0 && (
        <Card title={`Suggested places (${queue.suggestions.length})`} hint="Adding one creates an unowned listing for you to review. Search for real details first.">
          {queue.suggestions.map((s) => (
            <View key={s.id} style={styles.item}>
              <Text style={styles.itemTitle}>{s.name}</Text>
              <Text style={styles.body}>
                {s.locality}, {STATE_NAMES[s.state]} {s.postcode}
              </Text>
              {s.products.length > 0 && <Text style={styles.body}>{s.products.map((p) => PRODUCT_LABELS[p]).join(' · ')}</Text>}
              {s.notes ? <Text style={styles.body}>“{s.notes}”</Text> : null}
              <Btn
                label="Add as a listing to review"
                kind="primary"
                onPress={() =>
                  run(async () => {
                    const farmId = await convertSuggestion(s.id);
                    router.push(`/farm/${farmId}`);
                  })
                }
              />
              <Btn label="Reject" kind="danger" onPress={() => run(() => rejectSuggestion(s.id))} />
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  body: { fontSize: font.body, color: colors.text, lineHeight: 26 },
  item: { gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md },
  itemTitle: { fontSize: font.large, fontWeight: '700', color: colors.text },
});
