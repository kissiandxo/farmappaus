import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { blankLicence, missingLicenceCategories } from '../domain/listing';
import { LICENCE_LABELS, type Farm, type Licence, type LicenceCategory } from '../domain/types';
import { isoToAuDate, parseAuDate } from '../domain/validation';
import { colors, space, type } from '../theme';
import { ChipGroup, Field, Notice } from './FormBits';
import { Divided, IconButton, Pad } from './EditorBits';
import { Button, Icon } from './ui';

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

/** One block per licence (remove as an icon button), then a plain "Add a licence" row per missing category. */
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
    <Divided>
      <Pad>
        <Text style={styles.explain}>
          Milk, eggs, chicken, beef, lamb and pork must come from a licensed or registered business. Add the licence or
          accreditation number your state regulator gave you. We check these before a listing goes live.
        </Text>
        {missing.length > 0 && (
          <Notice kind="warn">
            {`You sell products that need a licence: ${missing.map((c) => LICENCE_LABELS[c].toLowerCase()).join(', ')}. Add one below.`}
          </Notice>
        )}
      </Pad>

      {licences.map((licence, index) => (
        <Pad key={licence.id ?? `new-${index}`} style={styles.item}>
          <View style={styles.itemHead}>
            <Text style={[type.headline, styles.itemTitle]} accessibilityRole="header">
              Licence {index + 1}
            </Text>
            <IconButton
              icon="minus.circle.fill"
              label="Remove this licence"
              color={colors.red}
              onPress={() => onChange(licences.filter((_, i) => i !== index))}
            />
          </View>
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
          {licence.status === 'admin_checked' ? (
            <View style={styles.checked}>
              <Icon name="checkmark.seal.fill" size={16} color={colors.green} />
              <Text style={styles.status}>Checked by Farm Direct</Text>
            </View>
          ) : (
            <Text style={styles.status}>Declared by you. We’ll check it during review.</Text>
          )}
        </Pad>
      ))}

      <Pad>
        {missing.length > 0 ? (
          missing.map((category) => (
            <Button
              key={category}
              label={`Add a ${LICENCE_LABELS[category].toLowerCase()} licence`}
              icon="plus.circle.fill"
              variant="plain"
              onPress={() => onChange([...licences, blankLicence(category)])}
            />
          ))
        ) : (
          <Button label="Add a licence" icon="plus.circle.fill" variant="plain" onPress={() => onChange([...licences, blankLicence('other')])} />
        )}
      </Pad>
    </Divided>
  );
}

const styles = StyleSheet.create({
  explain: { ...type.callout, color: colors.label },
  item: { gap: space.md },
  itemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { color: colors.label },
  checked: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  status: { ...type.footnote, color: colors.secondaryLabel },
});
