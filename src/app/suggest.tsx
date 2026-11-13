import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, ChipGroup, Field, Notice } from '../components/FormBits';
import { PlaceSearch } from '../components/PlaceSearch';
import { submitSuggestion } from '../data/mutations';
import { friendlyDbError } from '../domain/listing';
import { formatPlace, type Place } from '../domain/places';
import { PRODUCT_CATEGORIES, PRODUCT_LABELS, type ProductCategory } from '../domain/types';
import { useAuth } from '../state/AuthContext';
import { colors, font, space } from '../theme';

export default function SuggestScreen() {
  const { userId } = useAuth();
  const [name, setName] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [products, setProducts] = useState<ProductCategory[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId) {
    return (
      <View style={styles.content}>
        <Notice kind="info">Please sign in on the Account tab first. It’s free, and it helps us stop spam.</Notice>
        <Btn label="Go to Account" onPress={() => router.replace('/account')} />
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.content}>
        <Notice kind="ok">
          Thank you. We’ll check this place and, if it’s a good fit, invite the farmer to take over the listing. Nothing
          appears in the app until it’s been reviewed.
        </Notice>
        <Btn label="Done" onPress={() => router.back()} />
      </View>
    );
  }

  const ready = name.trim().length >= 2 && !!place;

  const submit = async () => {
    if (!place || !ready) return;
    setBusy(true);
    setError(null);
    try {
      await submitSuggestion({
        userId,
        name,
        state: place.state,
        locality: place.locality,
        postcode: place.postcode,
        lat: place.lat,
        lng: place.lng,
        products,
        notes,
      });
      setDone(true);
    } catch (e) {
      setError(friendlyDbError((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.body}>
        Know a farm, farm-gate stall, farm shop or farmers’ market that should be here? Tell us about it. We check every
        suggestion before it goes live.
      </Text>
      <Card>
        <Field label="Name of the place" value={name} onChangeText={setName} maxLength={100} />
        <PlaceSearch label="Suburb or postcode" chosen={place ? formatPlace(place) : ''} onSelect={setPlace} />
        <Text style={styles.label}>What do they sell? (optional)</Text>
        <ChipGroup
          options={PRODUCT_CATEGORIES.map((value) => ({ value, label: PRODUCT_LABELS[value] }))}
          value={products}
          onChange={(p) => setProducts(products.includes(p) ? products.filter((x) => x !== p) : [...products, p])}
        />
        <Field label="Anything else that helps (optional)" value={notes} onChangeText={setNotes} multiline maxLength={1000} hint="Address, opening days, or how you know them." />
      </Card>
      {error && <Notice kind="error">{error}</Notice>}
      <Btn label={busy ? 'Sending…' : 'Send suggestion'} kind="primary" onPress={submit} disabled={!ready || busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  body: { fontSize: font.body, color: colors.text, lineHeight: 26 },
  label: { fontSize: font.body, fontWeight: '700', color: colors.text },
});
