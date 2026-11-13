import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Field, Notice } from '../../components/FormBits';
import { submitClaim } from '../../data/mutations';
import { friendlyDbError } from '../../domain/listing';
import { isValidAbn, normaliseAuPhone } from '../../domain/validation';
import { useAuth } from '../../state/AuthContext';
import { useFarm } from '../../state/useFarm';
import { colors, font, space } from '../../theme';

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
      <View style={styles.content}>
        <Notice kind="info">Please sign in on the Account tab first, then come back to claim this listing.</Notice>
        <Btn label="Go to Account" onPress={() => router.replace('/account')} />
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.content}>
        <Notice kind="ok">
          Thanks. We’ve got your claim for {farm?.name ?? 'this listing'}. We’ll check your details against the public
          record and may call you to confirm. Once approved, you can edit the listing and update your stock.
        </Notice>
        <Btn label="Done" onPress={() => router.back()} />
      </View>
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
    } catch (e) {
      setError(friendlyDbError((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{farm?.name ?? 'Claim this listing'}</Text>
      <Text style={styles.body}>
        Tell us who you are so we can make sure this listing goes to the right person. We use your ABN and phone number
        only to check your claim.
      </Text>
      <Card>
        <Field label="Your ABN (11 digits)" value={abn} onChangeText={setAbn} keyboardType="number-pad" placeholder="e.g. 51 824 753 556" error={abnProblem} />
        <Field label="Phone number we can call" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={phoneProblem} />
        <Field label="Anything else that helps (optional)" value={note} onChangeText={setNote} multiline maxLength={1000} hint="For example, how we can tell it’s your farm." />
      </Card>
      {error && <Notice kind="error">{error}</Notice>}
      <Btn label={busy ? 'Sending…' : 'Send my claim'} kind="primary" onPress={submit} disabled={!ready || busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  title: { fontSize: font.heading, fontWeight: '700', color: colors.text },
  body: { fontSize: font.body, color: colors.text, lineHeight: 26 },
});
