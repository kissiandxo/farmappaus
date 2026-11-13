import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, ChipGroup, Field, Notice } from '../../components/FormBits';
import { submitReport } from '../../data/mutations';
import { friendlyDbError } from '../../domain/listing';
import { useAuth } from '../../state/AuthContext';
import { useFarm } from '../../state/useFarm';
import { colors, font, space } from '../../theme';

const REASONS = ['Wrong details', 'Closed or moved', 'Not a real farm', 'Food safety concern', 'Something else'];

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { farm } = useFarm(id);
  const { userId } = useAuth();
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId) {
    return (
      <View style={styles.content}>
        <Notice kind="info">Please sign in on the Account tab first, then come back to report a problem.</Notice>
        <Btn label="Go to Account" onPress={() => router.replace('/account')} />
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.content}>
        <Notice kind="ok">Thank you. We’ll look into it.</Notice>
        <Btn label="Done" onPress={() => router.back()} />
      </View>
    );
  }

  const submit = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await submitReport({ farmId: id, userId, reason: details.trim() ? `${reason}: ${details.trim()}` : reason });
      setDone(true);
    } catch (e) {
      setError(friendlyDbError((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{farm?.name ?? 'Report a problem'}</Text>
      <Card title="What’s wrong?">
        <ChipGroup options={REASONS.map((r) => ({ value: r, label: r }))} value={reason} onChange={setReason} />
        <Field label="More detail (optional)" value={details} onChangeText={setDetails} multiline maxLength={400} />
      </Card>
      {error && <Notice kind="error">{error}</Notice>}
      <Btn label={busy ? 'Sending…' : 'Send report'} kind="primary" onPress={submit} disabled={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  title: { fontSize: font.heading, fontWeight: '700', color: colors.text },
});
