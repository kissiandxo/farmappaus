import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { reviewFarm, setLicenceChecked } from '../data/mutations';
import { validateListing } from '../domain/compliance';
import { friendlyDbError } from '../domain/listing';
import { LICENCE_LABELS, type Farm } from '../domain/types';
import { draftIssues } from '../domain/validation';
import { colors, space, type } from '../theme';
import { Field, Notice } from './FormBits';
import { BulletLine, Pad } from './EditorBits';
import { Button, Section } from './ui';

/** Shown to administrators above a listing that is waiting for review. A grouped Section with the decisions at the bottom. */
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
    <Section header="Review this listing" footer="Only reviewers see this panel.">
      {blocking.length > 0 && (
        <Pad>
          <Notice kind="error">
            <Text style={styles.heading}>Can’t be approved yet:</Text>
            {blocking.map((m) => (
              <BulletLine key={m}>{m}</BulletLine>
            ))}
          </Notice>
        </Pad>
      )}
      {otherIssues.length > 0 && (
        <Pad>
          <Notice kind="warn">
            <Text style={styles.heading}>Worth a look:</Text>
            {otherIssues.map((m) => (
              <BulletLine key={m}>{m}</BulletLine>
            ))}
          </Notice>
        </Pad>
      )}
      {farm.licences.map(
        (l) =>
          l.id && (
            <Pad key={l.id}>
              <Button
                label={`${LICENCE_LABELS[l.category]} licence ${l.licenceNumber}: ${l.status === 'admin_checked' ? 'checked (tap to undo)' : 'mark as checked'}`}
                icon={l.status === 'admin_checked' ? 'checkmark.circle.fill' : undefined}
                variant="tinted"
                onPress={() => toggleChecked(l.id as string, l.status !== 'admin_checked')}
              />
            </Pad>
          ),
      )}
      <Pad>
        <Field label="Note to the farmer (needed to ask for changes or reject)" value={note} onChangeText={setNote} multiline maxLength={500} />
      </Pad>
      {error && (
        <Pad>
          <Notice kind="error">{error}</Notice>
        </Pad>
      )}
      <Pad style={styles.actions}>
        <Button label="Approve and publish" variant="filled" onPress={() => decide('approve')} disabled={busy || blocking.length > 0} />
        <Button label="Ask for changes" variant="tinted" onPress={() => decide('request_changes')} disabled={busy} />
        <Button label="Reject" variant="tinted" role="destructive" onPress={() => decide('reject')} disabled={busy} />
      </Pad>
    </Section>
  );
}

const styles = StyleSheet.create({
  heading: { ...type.headline, color: colors.label },
  actions: { gap: space.sm },
});
