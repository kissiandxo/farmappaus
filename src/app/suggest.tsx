import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChipGroup, Field, Notice } from '../components/FormBits';
import { PlaceSearch } from '../components/PlaceSearch';
import { Button, Icon, Section, success } from '../components/ui';
import { submitSuggestion } from '../data/mutations';
import { friendlyDbError } from '../domain/listing';
import { formatPlace, type Place } from '../domain/places';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_LABELS,
  VENUE_LABELS,
  type ProductCategory,
  type VenueType,
} from '../domain/types';
import { useAuth } from '../state/AuthContext';
import { colors, space, type } from '../theme';
import { requireBackend } from '../components/RequireBackend';

function SuggestScreen() {
  const { userId } = useAuth();
  const [name, setName] = useState('');
  const [venueType, setVenueType] = useState<VenueType>('farm');
  const [place, setPlace] = useState<Place | null>(null);
  const [products, setProducts] = useState<ProductCategory[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.pad}>
          <Notice kind="info">Please sign in on the Account tab first. It’s free, and it helps us stop spam.</Notice>
        </View>
        <View style={styles.actions}>
          <Button variant="tinted" label="Go to Account" onPress={() => router.replace('/account')} />
        </View>
      </ScrollView>
    );
  }

  if (done) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.done}>
          <Icon name="checkmark.seal.fill" size={64} color={colors.tint} />
        </View>
        <View style={styles.pad}>
          <Notice kind="ok">
            Thank you. We’ll check this place and, if it’s a good fit, invite the farmer to take over the listing. Nothing
            appears in the app until it’s been reviewed.
          </Notice>
        </View>
        <View style={styles.actions}>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      </ScrollView>
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
        venueType,
        state: place.state,
        locality: place.locality,
        postcode: place.postcode,
        lat: place.lat,
        lng: place.lng,
        products,
        notes,
      });
      setDone(true);
      success();
    } catch (e) {
      setError(friendlyDbError((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <Section footer="Know a farm, farm-gate stall, farm shop or farmers’ market that should be here? Tell us about it. We check every suggestion before it goes live.">
        <View style={styles.field}>
          <Field label="Name of the place" value={name} onChangeText={setName} maxLength={100} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>What kind of place is it?</Text>
          <ChipGroup
            options={(Object.keys(VENUE_LABELS) as VenueType[]).map((value) => ({ value, label: VENUE_LABELS[value] }))}
            value={venueType}
            onChange={setVenueType}
          />
        </View>
        <View style={styles.field}>
          <PlaceSearch label="Suburb or postcode" chosen={place ? formatPlace(place) : ''} onSelect={setPlace} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>What do they sell? (optional)</Text>
          <ChipGroup
            options={PRODUCT_CATEGORIES.map((value) => ({ value, label: PRODUCT_LABELS[value] }))}
            value={products}
            onChange={(p) => setProducts(products.includes(p) ? products.filter((x) => x !== p) : [...products, p])}
          />
        </View>
        <View style={styles.field}>
          <Field
            label="Anything else that helps (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={1000}
            hint="Address, opening days, or how you know them."
          />
        </View>
      </Section>

      {error && (
        <View style={styles.pad}>
          <Notice kind="error">{error}</Notice>
        </View>
      )}

      <View style={styles.actions}>
        <Button label={busy ? 'Sending…' : 'Send suggestion'} onPress={submit} disabled={!ready || busy} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.sm, paddingBottom: space.xxl },
  pad: { paddingHorizontal: space.lg, marginBottom: space.lg },
  field: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  label: { ...type.subheadline, fontWeight: '600', color: colors.secondaryLabel },
  actions: { paddingHorizontal: space.lg, marginBottom: space.xl, gap: space.sm },
  done: { alignItems: 'center', paddingTop: space.xxl, paddingBottom: space.lg },
});

export default requireBackend(SuggestScreen);
