import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChipGroup, Field, Notice } from '../../components/FormBits';
import { BulletLine, FieldLabel, Pad } from '../../components/EditorBits';
import { HoursEditor } from '../../components/HoursEditor';
import { LicencesEditor } from '../../components/LicencesEditor';
import { PhotosEditor } from '../../components/PhotosEditor';
import { PlaceSearch } from '../../components/PlaceSearch';
import { ProductsEditor } from '../../components/ProductsEditor';
import { Button, Row, Section, success } from '../../components/ui';
import { deleteFarm, fetchFarmById, saveFarm, submitForReview } from '../../data/mutations';
import { blankFarm, friendlyDbError, STATUS_LABELS, statusAdvice } from '../../domain/listing';
import { formatPlace } from '../../domain/places';
import {
  FULFILMENT_LABELS,
  PAYMENT_LABELS,
  TAG_LABELS,
  VENUE_LABELS,
  type Farm,
  type Fulfilment,
  type FarmTag,
  type PaymentType,
  type VenueType,
} from '../../domain/types';
import { draftIssues, normaliseAuPhone } from '../../domain/validation';
import { useSearch } from '../../state/SearchContext';
import { useAuth } from '../../state/AuthContext';
import { colors, space, type } from '../../theme';
import { requireBackend } from '../../components/RequireBackend';

const toggleIn = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
const options = <T extends string>(labels: Record<T, string>) => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { userId, role } = useAuth();
  const { refresh } = useSearch();
  const [farm, setFarm] = useState<Farm | null>(isNew ? blankFarm() : null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error' | 'warn'; text: string; list?: string[] } | null>(null);

  useEffect(() => {
    if (isNew || !id) return;
    fetchFarmById(id)
      .then((f) => (f ? setFarm(f) : setLoadError('We couldn’t find that listing.')))
      .catch((e) => setLoadError(friendlyDbError((e as Error).message)));
  }, [id, isNew]);

  if (!userId || (role !== 'farmer' && role !== 'admin')) {
    return (
      <View style={styles.guard}>
        <Notice kind="info">Create a free farmer account first (Account tab, then My listings).</Notice>
      </View>
    );
  }
  if (loadError) return <View style={styles.guard}><Notice kind="error">{loadError}</Notice></View>;
  if (!farm) return <View style={styles.guard}><Text style={styles.body}>Loading…</Text></View>;

  const set = (patch: Partial<Farm>) => setFarm({ ...farm, ...patch });
  const status = farm.status ?? 'draft';
  const issues = draftIssues(farm);
  const canSubmit = status === 'draft' || status === 'rejected';

  const save = async (): Promise<string | null> => {
    if (farm.name.trim().length < 2) {
      setNotice({ kind: 'warn', text: 'Give your place a name first.' });
      return null;
    }
    if (!/^\d{4}$/.test(farm.postcode)) {
      setNotice({ kind: 'warn', text: 'Choose your suburb or postcode first, so we know where you are.' });
      return null;
    }
    try {
      const savedId = await saveFarm({ ...farm, phone: farm.phone ? (normaliseAuPhone(farm.phone) ?? farm.phone) : undefined }, userId);
      const fresh = await fetchFarmById(savedId);
      if (fresh) setFarm(fresh);
      return savedId;
    } catch (e) {
      setNotice({ kind: 'error', text: friendlyDbError((e as Error).message) });
      return null;
    }
  };

  const onSave = async () => {
    setBusy(true);
    setNotice(null);
    const savedId = await save();
    setBusy(false);
    if (savedId) {
      success();
      setNotice({
        kind: 'ok',
        text:
          status === 'live'
            ? 'Saved. Changes to stock, price, hours and your story are live now. Changes to your name, location, licences or regulated products are checked first.'
            : 'Saved.',
      });
      if (isNew) router.replace(`/farmer/${savedId}`);
      refresh();
    }
  };

  const onSubmit = async () => {
    setNotice(null);
    if (issues.length > 0) {
      setNotice({ kind: 'warn', text: 'A few things to fix before we can review your listing:', list: issues.map((i) => i.message) });
      return;
    }
    setBusy(true);
    const savedId = await save();
    if (savedId) {
      try {
        await submitForReview(savedId);
        success();
        router.replace('/farmer');
        refresh();
      } catch (e) {
        setNotice({ kind: 'error', text: friendlyDbError((e as Error).message) });
      }
    }
    setBusy(false);
  };

  const onDelete = () =>
    Alert.alert('Delete this listing?', 'This can’t be undone.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete listing',
        style: 'destructive',
        onPress: async () => {
          try {
            if (farm.id) await deleteFarm(farm.id);
            router.replace('/farmer');
          } catch (e) {
            setNotice({ kind: 'error', text: friendlyDbError((e as Error).message) });
          }
        },
      },
    ]);

  const phoneProblem = farm.phone && !normaliseAuPhone(farm.phone) ? 'That phone number doesn’t look right.' : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      {farm.id ? (
        <View style={styles.inset}>
          <Notice kind={status === 'live' ? 'ok' : status === 'rejected' ? 'error' : 'info'}>
            <Text style={styles.statusTitle}>{STATUS_LABELS[status]}</Text>
            <Text style={styles.body}>{statusAdvice(status, farm.reviewNote)}</Text>
          </Notice>
        </View>
      ) : null}

      <Section header="About your place">
        <Pad>
          <Field label="Name" value={farm.name} onChangeText={(name) => set({ name })} maxLength={100} placeholder="e.g. Creek Road Eggs" />
        </Pad>
        <Pad>
          <FieldLabel>What kind of place is it?</FieldLabel>
          <ChipGroup options={options<VenueType>(VENUE_LABELS)} value={farm.type} onChange={(type) => set({ type })} />
        </Pad>
        <Pad>
          <Field
            label="Your story"
            value={farm.story}
            onChangeText={(story) => set({ story })}
            multiline
            maxLength={2000}
            hint="Who you are, how you farm, what makes your produce special."
          />
        </Pad>
        <Pad>
          <FieldLabel>Good to know (tap any that are true)</FieldLabel>
          <ChipGroup options={options<FarmTag>(TAG_LABELS)} value={farm.tags} onChange={(tag) => set({ tags: toggleIn(farm.tags, tag) })} />
        </Pad>
      </Section>

      <Section header="Where are you?" footer="Customers see your suburb and a pin on the map.">
        <Pad>
          <PlaceSearch
            label="Suburb or postcode"
            chosen={farm.postcode ? formatPlace({ ...farm, postcode: farm.postcode }) : ''}
            onSelect={(p) => set({ state: p.state, locality: p.locality, postcode: p.postcode, lat: p.lat, lng: p.lng })}
          />
        </Pad>
      </Section>

      <Section header="Opening hours">
        <HoursEditor hours={farm.hours} onChange={(hours) => set({ hours })} />
      </Section>

      <Section header="Pick-up, delivery and payment" footer="Customers pay you directly. Farm Direct doesn’t take payments.">
        <Pad>
          <FieldLabel>How do customers get it?</FieldLabel>
          <ChipGroup options={options<Fulfilment>(FULFILMENT_LABELS)} value={farm.fulfilment} onChange={(f) => set({ fulfilment: toggleIn(farm.fulfilment, f) })} />
        </Pad>
        <Pad>
          <FieldLabel>How can they pay you?</FieldLabel>
          <ChipGroup options={options<PaymentType>(PAYMENT_LABELS)} value={farm.paymentTypes} onChange={(p) => set({ paymentTypes: toggleIn(farm.paymentTypes, p) })} />
        </Pad>
      </Section>

      <Section header="Contact" footer="Add a phone number, a website, or both.">
        <Pad>
          <Field label="Phone" value={farm.phone ?? ''} onChangeText={(phone) => set({ phone })} keyboardType="phone-pad" placeholder="e.g. 0412 345 678" error={phoneProblem} />
        </Pad>
        <Pad>
          <Field label="Website (optional)" value={farm.website ?? ''} onChangeText={(website) => set({ website })} keyboardType="url" autoCapitalize="none" placeholder="e.g. www.example.com.au" />
        </Pad>
      </Section>

      <Section header="What you sell">
        <ProductsEditor products={farm.products} onChange={(products) => set({ products })} />
      </Section>

      <Section header="Licences and accreditation">
        <LicencesEditor farm={farm} onChange={(licences) => set({ licences })} />
      </Section>

      <Section header="Photos">
        <PhotosEditor farmId={farm.id || undefined} photos={farm.photos ?? []} onChange={(photos) => set({ photos })} />
      </Section>

      {notice && (
        <View style={styles.inset}>
          <Notice kind={notice.kind}>
            <Text style={styles.body}>{notice.text}</Text>
            {notice.list?.map((line) => (
              <BulletLine key={line}>{line}</BulletLine>
            ))}
          </Notice>
        </View>
      )}

      <View style={styles.actions}>
        <Button
          label={busy ? 'Saving…' : status === 'live' ? 'Save changes' : 'Save draft'}
          variant={canSubmit ? 'tinted' : 'filled'}
          onPress={onSave}
          disabled={busy}
        />
        {canSubmit && <Button label="Send for review" variant="filled" onPress={onSubmit} disabled={busy} />}
        {canSubmit && issues.length > 0 && (
          <Text style={styles.hint}>{issues.length} thing{issues.length === 1 ? '' : 's'} left to fix before you can send it.</Text>
        )}
      </View>

      {farm.id && (status === 'draft' || status === 'rejected') && (
        <Section>
          <Row title="Delete this listing" destructive onPress={onDelete} />
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.groupedBackground },
  content: { paddingTop: space.sm, paddingBottom: space.xxl },
  guard: { padding: space.lg },
  inset: { marginHorizontal: space.lg, marginBottom: space.xl, gap: space.md },
  actions: { marginHorizontal: space.lg, marginBottom: space.xl, gap: space.md },
  body: { ...type.callout, color: colors.label },
  statusTitle: { ...type.headline, color: colors.label },
  hint: { ...type.footnote, color: colors.secondaryLabel, textAlign: 'center' },
});

export default requireBackend(EditListingScreen);
