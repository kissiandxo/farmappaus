import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { blankLicence, missingLicenceCategories } from '../domain/listing';
import { LICENCE_LABELS, type Farm, type Licence, type LicenceCategory } from '../domain/types';
import { isoToAuDate, parseAuDate } from '../domain/validation';
import { colors, font, space } from '../theme';
import { Btn, ChipGroup, Field, Notice } from './FormBits';

const CATEGORY_OPTIONS = (Object.keys(LICENCE_LABELS) as LicenceCategory[]).map((value) => ({ value, label: LICENCE_LABELS[value] }));

function ExpiryField({ iso, onChange }: { iso: string | undefined; onChange: (iso: string | undefined) => void }) {
  const [text, setText] = useState(isoToAuDate(iso));
  const invalid = text.trim() !== '' && parseAuDate(text) === null;
  return (
    <Field
      label="Expiry date (optional)"
      value={text}
      onChangeText={(t) => {
        setText(t);
        if (t.trim() === '') onChange(undefined);
        else {
          const parsed = parseAuDate(t);
          if (parsed) onChange(parsed);
        }
      }}
      keyboardType="numbers-and-punctuation"
      placeholder="DD/MM/YYYY"
      error={invalid ? 'Write the date like 31/12/2027' : null}
    />
  );
}

export function LicencesEditor({
  farm,
  onChange,
}: {
  farm: Pick<Farm, 'products' | 'licences'>;
  onChange: (next: Licence[]) => void;
}) {
  const { licences } = farm;
  const missing = missingLicenceCategories(farm);
  const update = (index: number, patch: Partial<Licence>) =>
    onChange(licences.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  return (
    <View style={styles.wrap}>
      <Text style={styles.explain}>
        Milk, eggs, chicken, beef, lamb and pork must come from a licensed or registered business. Add the licence or
        accreditation number your state regulator gave you. We check these before a listing goes live.
      </Text>
      {missing.length > 0 && (
        <Notice kind="warn">
          {`You sell products that need a licence: ${missing.map((c) => LICENCE_LABELS[c].toLowerCase()).join(', ')}. Add one below.`}
        </Notice>
      )}

      {licences.map((licence, index) => (
        <View key={licence.id ?? `new-${index}`} style={styles.item}>
          <Text style={styles.itemTitle}>Licence {index + 1}</Text>
          <ChipGroup options={CATEGORY_OPTIONS} value={licence.category} onChange={(category) => update(index, { category })} />
          <Field
            label="Who issued it? (regulator)"
            value={licence.regulator}
            onChangeText={(regulator) => update(index, { regulator })}
            placeholder="e.g. NSW Food Authority, PrimeSafe"
            maxLength={120}
          />
          <Field label="Licence or registration number" value={licence.licenceNumber} onChangeText={(licenceNumber) => update(index, { licenceNumber })} maxLength={60} autoCapitalize="none" />
          <ExpiryField iso={licence.expiresOn} onChange={(expiresOn) => update(index, { expiresOn })} />
          <Text style={styles.status}>
            {licence.status === 'admin_checked' ? '✓ Checked by Farm Direct' : 'Declared by you. We’ll check it during review.'}
          </Text>
          <Btn label="Remove this licence" kind="danger" onPress={() => onChange(licences.filter((_, i) => i !== index))} />
        </View>
      ))}

      {missing.length > 0 ? (
        missing.map((category) => (
          <Btn key={category} label={`Add a ${LICENCE_LABELS[category].toLowerCase()} licence`} onPress={() => onChange([...licences, blankLicence(category)])} />
        ))
      ) : (
        <Btn label="Add a licence" onPress={() => onChange([...licences, blankLicence('other')])} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  explain: { fontSize: font.body, color: colors.text, lineHeight: 26 },
  item: { gap: space.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md },
  itemTitle: { fontSize: font.large, fontWeight: '700', color: colors.text },
  status: { fontSize: font.small, color: colors.textMuted },
});
