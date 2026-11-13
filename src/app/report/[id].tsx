import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChipGroup, Field, Notice } from '../../components/FormBits';
import { Button, Icon, Section, success } from '../../components/ui';
import { submitReport } from '../../data/mutations';
import { friendlyDbError } from '../../domain/listing';
import { useAuth } from '../../state/AuthContext';
import { useFarm } from '../../state/useFarm';
import { colors, space, type } from '../../theme';

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
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.pad}>
          <Notice kind="info">Please sign in on the Account tab first, then come back to report a problem.</Notice>
        </View>
        <View style={styles.actions}>
          <Button variant="tinted" label="Go to Account" onPress={() => router.replace('/account')} />
        </View>
      </ScrollView>
    );
  }

  if (done) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.done}>
          <Icon name="checkmark.seal.fill" size={64} color={colors.tint} />
        </View>
        <View style={styles.pad}>
          <Notice kind="ok">Thank you. We’ll look into it.</Notice>
        </View>
        <View style={styles.actions}>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      </ScrollView>
    );
  }

  const submit = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await submitReport({ farmId: id, userId, reason: details.trim() ? `${reason}: ${details.trim()}` : reason });
      setDone(true);
      success();
    } catch (e) {
      setError(friendlyDbError((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[type.title2, styles.title]} accessibilityRole="header">
        {farm?.name ?? 'Report a problem'}
      </Text>
      <Section header="What’s wrong?">
        <View style={styles.field}>
          <ChipGroup options={REASONS.map((r) => ({ value: r, label: r }))} value={reason} onChange={setReason} />
        </View>
        <View style={styles.field}>
          <Field label="More detail (optional)" value={details} onChangeText={setDetails} multiline maxLength={400} />
        </View>
      </Section>

      {error && (
        <View style={styles.pad}>
          <Notice kind="error">{error}</Notice>
        </View>
      )}

      <View style={styles.actions}>
        <Button label={busy ? 'Sending…' : 'Send report'} onPress={submit} disabled={busy} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.sm, paddingBottom: space.xxl },
  title: { color: colors.label, paddingHorizontal: space.lg, paddingBottom: space.md },
  pad: { paddingHorizontal: space.lg, marginBottom: space.lg },
  field: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  actions: { paddingHorizontal: space.lg, marginBottom: space.xl, gap: space.sm },
  done: { alignItems: 'center', paddingTop: space.xxl, paddingBottom: space.lg },
});
