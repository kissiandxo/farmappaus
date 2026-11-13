import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { formatPlace, nearestPlace, searchPlaces, type Place } from '../domain/places';
import { useSearch } from '../state/SearchContext';
import { colors, font, MIN_TAP, radius, space } from '../theme';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
}

type Problem = { text: string; canOpenSettings: boolean } | null;

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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">
            Where are you?
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Pressable
            onPress={useMyLocation}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.gps, pressed && { opacity: 0.8 }]}
          >
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.gpsText}>Use my current location</Text>
            )}
          </Pressable>

          {problem && (
            <View style={styles.problem} accessibilityRole="alert">
              <Text style={styles.problemText}>{problem.text}</Text>
              {problem.canOpenSettings && (
                <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button" style={styles.settings}>
                  <Text style={styles.settingsText}>Open Settings</Text>
                </Pressable>
              )}
            </View>
          )}

          <Text style={styles.or}>or search by suburb or postcode</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. Toowoomba or 4350"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Suburb or postcode"
            style={styles.input}
          />

          {query.trim().length >= 2 && matches.length === 0 && (
            <Text style={styles.none}>No suburb found. Check the spelling, or try the postcode.</Text>
          )}

          {matches.map((place) => (
            <Pressable
              key={`${place.postcode}-${place.locality}-${place.state}`}
              onPress={() => choosePlace(place)}
              accessibilityRole="button"
              accessibilityLabel={formatPlace(place)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.chip }]}
            >
              <Text style={styles.rowText}>{formatPlace(place)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    paddingBottom: space.sm,
  },
  title: { fontSize: font.heading, fontWeight: '700', color: colors.text },
  close: { minHeight: MIN_TAP, justifyContent: 'center', paddingHorizontal: space.sm },
  closeText: { fontSize: font.large, fontWeight: '700', color: colors.accent },
  content: { padding: space.lg, gap: space.md },
  gps: {
    minHeight: 60,
    borderRadius: radius.chip,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsText: { fontSize: font.large, fontWeight: '700', color: colors.onPrimary },
  problem: { backgroundColor: colors.sampleBackground, borderRadius: radius.card, padding: space.lg, gap: space.sm },
  problemText: { fontSize: font.body, color: colors.sampleText },
  settings: { minHeight: MIN_TAP, justifyContent: 'center' },
  settingsText: { fontSize: font.body, fontWeight: '700', color: colors.accent, textDecorationLine: 'underline' },
  or: { fontSize: font.body, fontWeight: '700', color: colors.text, marginTop: space.sm },
  input: {
    minHeight: 60,
    fontSize: font.large,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: space.lg,
  },
  none: { fontSize: font.body, color: colors.textMuted },
  row: {
    minHeight: MIN_TAP,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { fontSize: font.large, color: colors.text },
});
