import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Notice } from '../../components/FormBits';
import { fetchMyFarms } from '../../data/mutations';
import { friendlyDbError, STATUS_LABELS, statusAdvice } from '../../domain/listing';
import type { Farm } from '../../domain/types';
import { useAuth } from '../../state/AuthContext';
import { colors, font, space } from '../../theme';

const STATUS_COLOURS = { draft: colors.textMuted, pending: colors.accent, live: colors.open, rejected: colors.closed } as const;

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
      <ScrollView contentContainerStyle={styles.content}>
        <Notice kind="info">
          {available
            ? 'Sign in on the Account tab first. It’s free, and takes a minute.'
            : 'Listings need the online service, which isn’t connected in this version of the app.'}
        </Notice>
        <Btn label="Go to Account" onPress={() => router.replace('/account')} />
      </ScrollView>
    );
  }

  if (role === 'user' || role === null) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card title="List your farm for free">
          <Text style={styles.body}>
            Farm Direct is free for farmers. Create a listing, keep your stock up to date, and customers nearby can
            find you. Every listing is checked before it goes live.
          </Text>
          <Btn
            label="Create my free farmer account"
            kind="primary"
            onPress={async () => {
              const result = await becomeFarmer();
              setMessage(result.message);
            }}
          />
          {message && <Text style={styles.body}>{message}</Text>}
        </Card>
        <Card title="Already on the map?">
          <Text style={styles.body}>
            If your farm is already listed, find it in the list, open it and tap “Is this your farm? Claim it”.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Btn label="Create a new listing" kind="primary" onPress={() => router.push('/farmer/new')} />
      {error && <Notice kind="error">{error}</Notice>}
      {farms === null && !error && <Text style={styles.body}>Loading your listings…</Text>}
      {farms?.length === 0 && (
        <Notice kind="info">You don’t have any listings yet. Tap “Create a new listing” to start.</Notice>
      )}
      {farms?.map((farm) => (
        <Card key={farm.id} title={farm.name || 'Untitled listing'}>
          <Text style={[styles.status, { color: STATUS_COLOURS[farm.status ?? 'draft'] }]}>
            {STATUS_LABELS[farm.status ?? 'draft']}
          </Text>
          <Text style={styles.body}>{statusAdvice(farm.status ?? 'draft', farm.reviewNote)}</Text>
          <View style={styles.buttons}>
            <Btn label="Edit listing" onPress={() => router.push(`/farmer/${farm.id}`)} />
            {farm.products.length > 0 && (
              <Btn label="Update stock and prices" kind="primary" onPress={() => router.push(`/farmer/stock/${farm.id}`)} />
            )}
            {farm.status === 'live' && <Btn label="See how customers see it" onPress={() => router.push(`/farm/${farm.id}`)} />}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  body: { fontSize: font.body, color: colors.text, lineHeight: 26 },
  status: { fontSize: font.large, fontWeight: '700' },
  buttons: { gap: space.sm },
});
