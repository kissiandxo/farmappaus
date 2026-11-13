import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatPlace, nearestPlace, searchPlaces, type Place } from '../domain/places';
import { useSearch } from '../state/SearchContext';
import { colors, space, type } from '../theme';
import { SearchField } from './SearchField';
import { SheetHeader } from './SheetHeader';
import { Button, Row, Section } from './ui';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
}

type Problem = { text: string; canOpenSettings: boolean } | null;

/** Where are you? A pageSheet with a "Use my current location" row and a suburb/postcode search. */
export function LocationModal({ visible, onClose }: LocationModalProps) {
  const { setLocation } = useSearch();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);

  const matches = useMemo(() => (visible ? searchPlaces(query) : []), [query, visible]);

  const choosePlace = (place: Place) => {
    setLocation({ label: formatPlace(place), lat: place.lat, lng: place.lng, source: 'search' });
    setQuery('');
    setProblem(null);
    onClose();
  };

  const useMyLocation = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setProblem({
          text: 'Location is switched off for this app. You can turn it on in Settings, or search by suburb or postcode instead.',
          canOpenSettings: !permission.canAskAgain,
        });
        return;
      }
      const position =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const { latitude, longitude } = position.coords;
      const near = nearestPlace({ lat: latitude, lng: longitude });
      setLocation({
        label: near ? `${near.locality} ${near.state}` : 'Your location',
        lat: latitude,
        lng: longitude,
        source: 'gps',
      });
      onClose();
    } catch {
      setProblem({
        text: 'We could not find your location. Check that Location Services is on, or search by suburb or postcode.',
        canOpenSettings: false,
      });
    } finally {
      setBusy(false);
    }
  };

  const noMatch = query.trim().length >= 2 && matches.length === 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <SheetHeader title="Where are you?" onDone={onClose} />

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Section>
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
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.orangeFill,
  },
  problemText: { ...type.callout, color: colors.label },
  searchWrap: { padding: space.lg },
});
