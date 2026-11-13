import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatPlace, searchPlaces, type Place } from '../domain/places';
import { locateMe } from '../lib/locate';
import { useSearch } from '../state/SearchContext';
import { colors, radius, space, type } from '../theme';
import { SearchField } from './SearchField';
import { SheetHeader } from './SheetHeader';
import { Button, Row, Section, success } from './ui';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
}

type Problem = { text: string; canOpenSettings: boolean } | null;

/** Where are you? A pageSheet with a "Use my current location" row and a suburb/postcode search. */
export function LocationModal({ visible, onClose }: LocationModalProps) {
  const { location, isDefaultLocation, setLocation } = useSearch();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);

  const matches = useMemo(() => (visible ? searchPlaces(query) : []), [query, visible]);

  // Start fresh every time the sheet opens, however it was closed (Done, a choice, or a swipe down).
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setProblem(null);
    }
  }, [visible]);

  const close = () => {
    setQuery('');
    setProblem(null);
    onClose();
  };

  const choosePlace = (place: Place) => {
    setLocation({ label: formatPlace(place), lat: place.lat, lng: place.lng, source: 'search' });
    success();
    close();
  };

  const useMyLocation = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const result = await locateMe();
    setBusy(false);
    if (!result.ok) {
      setProblem({ text: result.message, canOpenSettings: result.canOpenSettings });
      return;
    }
    setLocation(result.location);
    success();
    close();
  };

  const noMatch = query.trim().length >= 2 && matches.length === 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={styles.sheet}>
        <SheetHeader title="Where are you?" onDone={close} />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
        >
          <Section>
            <Row
              title={`Current: ${isDefaultLocation ? 'Not set — showing Sydney' : location.label}`}
              accessibilityLabel={
                isDefaultLocation ? 'Current location not set, showing Sydney' : `Current location, ${location.label}`
              }
            />
            <Row
              icon="location.fill"
              title={busy ? 'Finding your location…' : 'Use my current location'}
              onPress={useMyLocation}
              accessory={busy ? <ActivityIndicator color={colors.tint} /> : 'none'}
            />
          </Section>

          {problem && (
            <View style={styles.problem} accessibilityRole="alert">
              <Text style={styles.problemText}>{problem.text}</Text>
              {problem.canOpenSettings && (
                <Button label="Open Settings" variant="tinted" size="small" onPress={() => Linking.openSettings()} />
              )}
            </View>
          )}

          <Section header="Or search by suburb or postcode" footer={noMatch ? 'No suburb found. Check the spelling, or try the postcode.' : undefined}>
            <View style={styles.searchWrap}>
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder="e.g. Toowoomba or 4350"
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="search"
                clearButtonMode="while-editing"
                accessibilityLabel="Suburb or postcode"
              />
            </View>
            {matches.map((place) => (
              <Row
                key={`${place.postcode}-${place.locality}-${place.state}`}
                title={formatPlace(place)}
                onPress={() => choosePlace(place)}
                accessibilityLabel={formatPlace(place)}
              />
            ))}
          </Section>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.groupedBackground },
  content: { paddingTop: space.sm, paddingBottom: space.xl * 2 },
  problem: {
    marginHorizontal: space.lg,
    marginBottom: space.xl,
    padding: space.lg,
    gap: space.sm,
    borderRadius: radius.group,
    borderCurve: 'continuous',
    backgroundColor: colors.orangeFill,
  },
  problemText: { ...type.callout, color: colors.label },
  searchWrap: { padding: space.lg },
});
