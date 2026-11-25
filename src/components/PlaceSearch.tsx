import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatPlace, searchPlaces, type Place } from '../domain/places';
import { colors, space, type } from '../theme';
import { SearchField } from './SearchField';
import { Row, Section } from './ui';

interface PlaceSearchProps {
  label: string;
  /** Currently chosen place text, e.g. "Toowoomba QLD 4350", or empty. */
  chosen: string;
  onSelect: (place: Place) => void;
  error?: string | null;
}

/** Suburb/postcode picker backed by the offline list. Search field on top, matches as grouped Rows below. */
export function PlaceSearch({ label, chosen, onSelect, error }: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => searchPlaces(query, { limit: 6 }), [query]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Type a suburb or postcode"
        accessibilityLabel={label}
        autoCapitalize="words"
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <Text style={styles.hint}>{chosen ? `Chosen: ${chosen}` : 'Choose from the list that appears.'}</Text>
      )}
      {matches.length > 0 && (
        <Section>
          {matches.map((place) => (
            <Row
              key={`${place.postcode}-${place.locality}-${place.state}`}
              title={formatPlace(place)}
              accessibilityLabel={formatPlace(place)}
              onPress={() => {
                onSelect(place);
                setQuery('');
              }}
            />
          ))}
        </Section>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  label: { ...type.subheadline, fontWeight: '600', color: colors.secondaryLabel },
  hint: { ...type.footnote, color: colors.secondaryLabel },
  error: { ...type.footnote, color: colors.red, fontWeight: '600' },
});
