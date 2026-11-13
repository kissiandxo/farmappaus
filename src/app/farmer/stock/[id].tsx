import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Field, Notice, SwitchRow } from '../../../components/FormBits';
import { fetchFarmById, setProductPrice, setProductStock } from '../../../data/mutations';
import { friendlyDbError } from '../../../domain/listing';
import type { Farm, Product } from '../../../domain/types';
import { centsToInput, priceToCents } from '../../../domain/validation';
import { useSearch } from '../../../state/SearchContext';
import { colors, font, space } from '../../../theme';

function Row({ product, onSaved, onError }: { product: Product; onSaved: () => void; onError: (m: string) => void }) {
  const [inStock, setInStock] = useState(product.inStock);
  const [price, setPrice] = useState(centsToInput(product.priceCents));
  const invalid = price.trim() !== '' && priceToCents(price) === null;

  const toggle = async (next: boolean) => {
    setInStock(next);
    try {
      if (product.id) await setProductStock(product.id, next);
      onSaved();
    } catch (e) {
      setInStock(!next);
      onError(friendlyDbError((e as Error).message));
    }
  };

  const savePrice = async () => {
    const cents = price.trim() === '' ? null : priceToCents(price);
    if (invalid || !product.id) return;
    try {
      await setProductPrice(product.id, cents);
      onSaved();
    } catch (e) {
      onError(friendlyDbError((e as Error).message));
    }
  };

  return (
    <Card title={product.name || 'Unnamed product'}>
      <SwitchRow label={inStock ? 'In stock' : 'Out of stock'} value={inStock} onChange={toggle} />
      <Field
        label={`Price in dollars${product.unit ? ` per ${product.unit}` : ''}`}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        error={invalid ? 'Enter a price like 7.50' : null}
        hint="Tap “Save price” to keep a new price. Stock switches save straight away."
      />
      <Text style={styles.link} onPress={savePrice} accessibilityRole="button">
        Save price
      </Text>
    </Card>
  );
}

export default function StockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refresh } = useSearch();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchFarmById(id)
      .then(setFarm)
      .catch((e) => setError(friendlyDbError((e as Error).message)));
  }, [id]);

  const onSaved = useCallback(() => {
    setError(null);
    setSavedAt(new Date().toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }));
    refresh();
  }, [refresh]);

  if (error && !farm) return <View style={styles.content}><Notice kind="error">{error}</Notice></View>;
  if (!farm) return <View style={styles.content}><Text style={styles.body}>Loading…</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{farm.name}</Text>
      <Text style={styles.body}>Switch items on or off as stock comes and goes. Changes are saved straight away.</Text>
      {savedAt && <Notice kind="ok">{`Saved at ${savedAt}.`}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      {farm.products.map((p) => (
        <Row key={p.id ?? p.name} product={p} onSaved={onSaved} onError={setError} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  title: { fontSize: font.heading, fontWeight: '700', color: colors.text },
  body: { fontSize: font.body, color: colors.text, lineHeight: 26 },
  link: { fontSize: font.large, fontWeight: '700', color: colors.accent, textDecorationLine: 'underline', paddingVertical: space.sm },
});
