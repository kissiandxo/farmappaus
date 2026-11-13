import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field, Notice } from '../../components/FormBits';
import { Button, Icon, Section, success } from '../../components/ui';
import { submitClaim } from '../../data/mutations';
import { friendlyDbError } from '../../domain/listing';
import { isValidAbn, normaliseAuPhone } from '../../domain/validation';
import { useAuth } from '../../state/AuthContext';
import { useFarm } from '../../state/useFarm';
import { colors, space, type } from '../../theme';

export default function ClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { farm } = useFarm(id);
  const { userId } = useAuth();
  const [abn, setAbn] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.pad}>
          <Notice kind="info">Please sign in on the Account tab first, then come back to claim this listing.</Notice>
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
          <Notice kind="ok">
            {`Thanks. We’ve got your claim for ${farm?.name ?? 'this listing'}. We’ll check your details against the public record and may call you to confirm. Once approved, you can edit the listing and update your stock.`}
          </Notice>
        </View>
        <View style={styles.actions}>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      </ScrollView>
    );
  }

  const abnProblem = abn && !isValidAbn(abn) ? 'That ABN doesn’t look right. It has 11 digits.' : null;
  const phoneNice = normaliseAuPhone(phone);
  const phoneProblem = phone && !phoneNice ? 'That phone number doesn’t look right.' : null;
  const ready = isValidAbn(abn) && !!phoneNice;

  const submit = async () => {
    if (!id || !ready) return;
    setBusy(true);
    setError(null);
    try {
      await submitClaim({ farmId: id, userId, abn, phone: phoneNice as string, note });
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
        {farm?.name ?? 'Claim this listing'}
      </Text>
      <Section footer="Tell us who you are so we can make sure this listing goes to the right person. We use your ABN and phone number only to check your claim.">
        <View style={styles.field}>
          <Field
            label="Your ABN (11 digits)"
            value={abn}
            onChangeText={setAbn}
            keyboardType="number-pad"
            placeholder="e.g. 51 824 753 556"
            error={abnProblem}
          />
        </View>
        <View style={styles.field}>
          <Field label="Phone number we can call" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={phoneProblem} />
        </View>
        <View style={styles.field}>
          <Field
            label="Anything else that helps (optional)"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={1000}
            hint="For example, how we can tell it’s your farm."
          />
        </View>
      </Section>

      {error && (
        <View style={styles.pad}>
          <Notice kind="error">{error}</Notice>
        </View>
      )}

      <View style={styles.actions}>
        <Button label={busy ? 'Sending…' : 'Send my claim'} onPress={submit} disabled={!ready || busy} />
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
