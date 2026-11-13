import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Notice } from '../../components/FormBits';
import { Pad } from '../../components/EditorBits';
import { fetchMyFarms } from '../../data/mutations';
import { friendlyDbError, STATUS_LABELS, statusAdvice } from '../../domain/listing';
import type { Farm, ListingStatus } from '../../domain/types';
import { useAuth } from '../../state/AuthContext';
import { colors, space, type } from '../../theme';
import { Badge, Button, EmptyState, Row, Section, type BadgeTone } from '../../components/ui';

const STATUS_TONES: Record<ListingStatus, BadgeTone> = { draft: 'neutral', pending: 'orange', live: 'green', rejected: 'red' };

export default function MyListingsScreen() {
  const { available, session, userId, role, becomeFarmer } = useAuth();
  const [farms, setFarms] = useState<Farm[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || (role !== 'farmer' && role !== 'admin')) return;
    try {
      setFarms(await fetchMyFarms(userId));
      setError(null);
    } catch (e) {
      setError(friendlyDbError((e as Error).message));
    }
  }, [userId, role]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!available || !session) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.inset}>
          <Notice kind="info">
            {available
              ? 'Sign in on the Account tab first. It’s free, and takes a minute.'
              : 'Listings need the online service, which isn’t connected in this version of the app.'}
          </Notice>
          <Button label="Go to Account" onPress={() => router.replace('/account')} />
        </View>
      </ScrollView>
    );
  }

  if (role === 'user' || role === null) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Section header="List your farm for free">
          <Pad>
            <Text style={styles.body}>
              Farm Direct is free for farmers. Create a listing, keep your stock up to date, and customers nearby can
              find you. Every listing is checked before it goes live.
            </Text>
          </Pad>
          <Pad>
            <Button
              label="Create my free farmer account"
              onPress={async () => {
                const result = await becomeFarmer();
                setMessage(result.message);
              }}
            />
            {message && <Text style={styles.body}>{message}</Text>}
          </Pad>
        </Section>
        <Section header="Already on the map?">
          <Pad>
            <Text style={styles.body}>
              If your farm is already listed, find it in the list, open it and tap “Is this your farm? Claim it”.
            </Text>
          </Pad>
        </Section>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.inset}>
        <Button label="Create a new listing" variant="tinted" icon="plus.circle.fill" onPress={() => router.push('/farmer/new')} />
        {error && <Notice kind="error">{error}</Notice>}
        {farms === null && !error && <Text style={styles.loading}>Loading your listings…</Text>}
      </View>

      {farms?.length === 0 && (
        <EmptyState
          icon="leaf"
          title="You don’t have any listings yet."
          message="Tap “Create a new listing” to start."
          style={styles.empty}
        />
      )}

      {farms?.map((farm) => {
        const status: ListingStatus = farm.status ?? 'draft';
        return (
          <Section key={farm.id}>
            <Pad style={styles.listing}>
              <Text style={[type.headline, styles.name]} accessibilityRole="header">
                {farm.name || 'Untitled listing'}
              </Text>
              <Badge label={STATUS_LABELS[status]} tone={STATUS_TONES[status]} />
              <Text style={[type.subheadline, styles.advice]}>{statusAdvice(status, farm.reviewNote)}</Text>
            </Pad>
            <Row title="Edit listing" accessory="chevron" onPress={() => router.push(`/farmer/${farm.id}`)} />
            {farm.products.length > 0 && (
              <Row title="Update stock and prices" accessory="chevron" onPress={() => router.push(`/farmer/stock/${farm.id}`)} />
            )}
            {status === 'live' && <Row title="See how customers see it" accessory="chevron" onPress={() => router.push(`/farm/${farm.id}`)} />}
          </Section>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.groupedBackground },
  content: { paddingTop: space.sm, paddingBottom: space.xxl },
  inset: { marginHorizontal: space.lg, gap: space.md, marginBottom: space.xl },
  body: { ...type.body, color: colors.label },
  loading: { ...type.body, color: colors.secondaryLabel, textAlign: 'center' },
  empty: { marginTop: space.xxl },
  listing: { gap: space.sm, paddingVertical: space.md },
  name: { color: colors.label },
  advice: { color: colors.secondaryLabel },
});
