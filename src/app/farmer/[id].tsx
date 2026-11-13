import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, ChipGroup, Field, Notice, SwitchRow } from '../../components/FormBits';
import { HoursEditor } from '../../components/HoursEditor';
import { LicencesEditor } from '../../components/LicencesEditor';
import { PhotosEditor } from '../../components/PhotosEditor';
import { PlaceSearch } from '../../components/PlaceSearch';
import { ProductsEditor } from '../../components/ProductsEditor';
import { deleteFarm, fetchFarmById, saveFarm, submitForReview } from '../../data/mutations';
import { blankFarm, friendlyDbError, STATUS_LABELS, statusAdvice } from '../../domain/listing';
import { formatPlace } from '../../domain/places';
import {
  FARM_TAGS,
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
import { colors, font, space } from '../../theme';

const toggleIn = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
const options = <T extends string>(labels: Record<T, string>) => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export default function EditListingScreen() {
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
      <View style={styles.content}>
        <Notice kind="info">Create a free farmer account first (Account tab, then My listings).</Notice>
      </View>
    );
  }
  if (loadError) return <View style={styles.content}><Notice kind="error">{loadError}</Notice></View>;
  if (!farm) return <View style={styles.content}><Text style={styles.body}>Loading…</Text></View>;

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
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {farm.id ? (
        <Notice kind={status === 'live' ? 'ok' : status === 'rejected' ? 'error' : 'info'}>
          <Text style={styles.statusTitle}>{STATUS_LABELS[status]}</Text>
          <Text style={styles.body}>{statusAdvice(status, farm.reviewNote)}</Text>
        </Notice>
      ) : null}

      <Card title="About your place">
        <Field label="Name" value={farm.name} onChangeText={(name) => set({ name })} maxLength={100} placeholder="e.g. Creek Road Eggs" />
        <Text style={styles.label}>What kind of place is it?</Text>
        <ChipGroup options={options<VenueType>(VENUE_LABELS)} value={farm.type} onChange={(type) => set({ type })} />
        <Field
          label="Your story"
          value={farm.story}
          onChangeText={(story) => set({ story })}
          multiline
          maxLength={2000}
          hint="Who you are, how you farm, what makes your produce special."
        />
        <Text style={styles.label}>Good to know (tap any that are true)</Text>
        <ChipGroup options={options<FarmTag>(TAG_LABELS)} value={farm.tags} onChange={(tag) => set({ tags: toggleIn(farm.tags, tag) })} />
      </Card>

      <Card title="Where are you?" hint="Customers see your suburb and a pin on the map.">
        <PlaceSearch
          label="Suburb or postcode"
          chosen={farm.postcode ? formatPlace({ ...farm, postcode: farm.postcode }) : ''}
          onSelect={(p) => set({ state: p.state, locality: p.locality, postcode: p.postcode, lat: p.lat, lng: p.lng })}
        />
      </Card>

      <Card title="Opening hours">
        <HoursEditor hours={farm.hours} onChange={(hours) => set({ hours })} />
      </Card>

      <Card title="Pick-up, delivery and payment">
        <Text style={styles.label}>How do customers get it?</Text>
        <ChipGroup options={options<Fulfilment>(FULFILMENT_LABELS)} value={farm.fulfilment} onChange={(f) => set({ fulfilment: toggleIn(farm.fulfilment, f) })} />
        <Text style={styles.label}>How can they pay you?</Text>
        <ChipGroup options={options<PaymentType>(PAYMENT_LABELS)} value={farm.paymentTypes} onChange={(p) => set({ paymentTypes: toggleIn(farm.paymentTypes, p) })} />
        <Text style={styles.hint}>Customers pay you directly. Farm Direct doesn’t take payments.</Text>
      </Card>

      <Card title="Contact" hint="Add a phone number, a website, or both.">
        <Field label="Phone" value={farm.phone ?? ''} onChangeText={(phone) => set({ phone })} keyboardType="phone-pad" placeholder="e.g. 0412 345 678" error={phoneProblem} />
        <Field label="Website (optional)" value={farm.website ?? ''} onChangeText={(website) => set({ website })} keyboardType="url" autoCapitalize="none" placeholder="e.g. www.example.com.au" />
      </Card>

      <Card title="What you sell">
        <ProductsEditor products={farm.products} onChange={(products) => set({ products })} />
      </Card>

      <Card title="Licences and accreditation">
        <LicencesEditor farm={farm} onChange={(licences) => set({ licences })} />
      </Card>

      <Card title="Photos">
        <PhotosEditor farmId={farm.id || undefined} photos={farm.photos ?? []} onChange={(photos) => set({ photos })} />
      </Card>

      {notice && (
        <Notice kind={notice.kind}>
          <Text style={styles.body}>{notice.text}</Text>
          {notice.list?.map((line) => (
            <Text key={line} style={styles.body}>• {line}</Text>
          ))}
        </Notice>
      )}

      <Btn label={busy ? 'Saving…' : status === 'live' ? 'Save changes' : 'Save draft'} kind={canSubmit ? 'secondary' : 'primary'} onPress={onSave} disabled={busy} />
      {canSubmit && <Btn label="Send for review" kind="primary" onPress={onSubmit} disabled={busy} />}
      {canSubmit && issues.length > 0 && <Text style={styles.hint}>{issues.length} thing{issues.length === 1 ? '' : 's'} left to fix before you can send it.</Text>}
      {farm.id && (status === 'draft' || status === 'rejected') && <Btn label="Delete this listing" kind="danger" onPress={onDelete} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 3 },
  body: { fontSize: font.body, color: colors.text, lineHeight: 26 },
  label: { fontSize: font.body, fontWeight: '700', color: colors.text },
  hint: { fontSize: font.small, color: colors.textMuted },
  statusTitle: { fontSize: font.large, fontWeight: '700', color: colors.text },
});
