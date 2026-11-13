import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPlace, searchPlaces, type Place } from '../domain/places';
import { colors, font, MIN_TAP, space } from '../theme';
import { Field } from './FormBits';

interface PlaceSearchProps {
  label: string;
  /** Currently chosen place text, e.g. "Toowoomba QLD 4350", or empty. */
  chosen: string;
  onSelect: (place: Place) => void;
  error?: string | null;
}

/** Suburb/postcode picker backed by the offline list. Used for listing and suggestion locations. */
export function PlaceSearch({ label, chosen, onSelect, error }: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => searchPlaces(query, { limit: 6 }), [query]);

  return (
    <View style={styles.wrap}>
      <Field
        label={label}
        value={query}
        onChangeText={setQuery}
        placeholder="Type a suburb or postcode"
        hint={chosen ? `Chosen: ${chosen}` : 'Choose from the list that appears.'}
        error={error}
        autoCapitalize="words"
      />
      {matches.map((place) => (
        <Pressable
          key={`${place.postcode}-${place.locality}-${place.state}`}
          onPress={() => {
            onSelect(place);
            setQuery('');
          }}
          accessibilityRole="button"
          accessibilityLabel={formatPlace(place)}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.chip }]}
        >
          <Text style={styles.rowText}>{formatPlace(place)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: { minHeight: MIN_TAP, justifyContent: 'center', paddingHorizontal: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { fontSize: font.large, color: colors.text },
});
