import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { reviewFarm, setLicenceChecked } from '../data/mutations';
import { validateListing } from '../domain/compliance';
import { friendlyDbError } from '../domain/listing';
import { LICENCE_LABELS, type Farm } from '../domain/types';
import { draftIssues } from '../domain/validation';
import { colors, font } from '../theme';
import { Btn, Card, Field, Notice } from './FormBits';

/** Shown to administrators above a listing that is waiting for review. */
export function ReviewPanel({ farm, onChanged }: { farm: Farm; onChanged: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocking = validateListing(farm).map((i) => i.message);
  const otherIssues = draftIssues(farm)
    .filter((i) => i.field !== 'licences' && !(i.field === 'products' && /pasteurised/.test(i.message)))
    .map((i) => i.message);

  const decide = async (decision: 'approve' | 'reject' | 'request_changes') => {
    if (decision !== 'approve' && !note.trim()) {
      setError('Write a short note so the farmer knows what to fix.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await reviewFarm(farm.id, decision, note);
      router.back();
    } catch (e) {
      setError(friendlyDbError((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const toggleChecked = async (licenceId: string, checked: boolean) => {
    try {
      await setLicenceChecked(licenceId, checked);
      onChanged();
    } catch (e) {
      setError(friendlyDbError((e as Error).message));
    }
  };

  return (
    <Card title="Review this listing" hint="Only reviewers see this panel.">
      {blocking.length > 0 && (
        <Notice kind="error">
          <Text style={styles.text}>Can’t be approved yet:</Text>
          {blocking.map((m) => (
            <Text key={m} style={styles.text}>• {m}</Text>
          ))}
        </Notice>
      )}
      {otherIssues.length > 0 && (
        <Notice kind="warn">
          <Text style={styles.text}>Worth a look:</Text>
          {otherIssues.map((m) => (
            <Text key={m} style={styles.text}>• {m}</Text>
          ))}
        </Notice>
      )}
      {farm.licences.map(
        (l) =>
          l.id && (
            <Btn
              key={l.id}
              label={`${LICENCE_LABELS[l.category]} licence ${l.licenceNumber}: ${l.status === 'admin_checked' ? '✓ checked (tap to undo)' : 'mark as checked'}`}
              onPress={() => toggleChecked(l.id as string, l.status !== 'admin_checked')}
            />
          ),
      )}
      <Field label="Note to the farmer (needed to ask for changes or reject)" value={note} onChangeText={setNote} multiline maxLength={500} />
      {error && <Notice kind="error">{error}</Notice>}
      <Btn label="Approve and publish" kind="primary" onPress={() => decide('approve')} disabled={busy || blocking.length > 0} />
      <Btn label="Ask for changes" onPress={() => decide('request_changes')} disabled={busy} />
      <Btn label="Reject" kind="danger" onPress={() => decide('reject')} disabled={busy} />
    </Card>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: font.body, color: colors.text, lineHeight: 26 },
});
