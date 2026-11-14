import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Notice } from '../../../components/FormBits';
import { fetchFarmById, setProductPrice, setProductStock } from '../../../data/mutations';
import { friendlyDbError } from '../../../domain/listing';
import type { Farm, Product } from '../../../domain/types';
import { centsToInput, priceToCents } from '../../../domain/validation';
import { useSearch } from '../../../state/SearchContext';
import { colors, MIN_TAP, radius, space, type } from '../../../theme';
import { Button, Section, selection } from '../../../components/ui';
import { requireBackend } from '../../../components/RequireBackend';

/** One product: name and status on the left, price box and stock switch on the right. */
function ProductRow({ product, onSaved, onError }: { product: Product; onSaved: () => void; onError: (m: string) => void }) {
  const [inStock, setInStock] = useState(product.inStock);
  const [price, setPrice] = useState(centsToInput(product.priceCents));
  const invalid = price.trim() !== '' && priceToCents(price) === null;
  const stockLabel = inStock ? 'In stock' : 'Out of stock';

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
    <View style={styles.product}>
      <View style={styles.line}>
        <View style={styles.nameCol}>
          <Text style={[type.body, styles.name]} numberOfLines={2}>
            {product.name || 'Unnamed product'}
          </Text>
          <Text style={[type.footnote, styles.meta]}>{product.unit ? `${stockLabel} · per ${product.unit}` : stockLabel}</Text>
        </View>
        <View style={[styles.priceBox, invalid && styles.priceInvalid]}>
          <Text style={[type.body, styles.dollar]}>$</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.tint}
            accessibilityLabel={`Price in dollars${product.unit ? ` per ${product.unit}` : ''}`}
            style={[type.body, styles.priceInput]}
          />
        </View>
        <Switch
          value={inStock}
          onValueChange={(v) => {
            selection();
            toggle(v);
          }}
          trackColor={{ true: colors.tint, false: colors.fill }}
          accessibilityLabel={stockLabel}
        />
      </View>
      {invalid && <Text style={[type.footnote, styles.error]}>Enter a price like 7.50</Text>}
      <View style={styles.footRow}>
        <Button label="Save price" variant="tinted" size="small" onPress={savePrice} />
      </View>
    </View>
  );
}

function StockScreen() {
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

  if (error && !farm) return <View style={styles.guard}><Notice kind="error">{error}</Notice></View>;
  if (!farm) return <View style={styles.guard}><Text style={styles.body}>Loading…</Text></View>;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ headerLargeTitle: true }} />
      {(savedAt || error) && (
        <View style={styles.inset}>
          {savedAt && <Notice kind="ok">{`Saved at ${savedAt}.`}</Notice>}
          {error && <Notice kind="error">{error}</Notice>}
        </View>
      )}
      <Section
        header={farm.name}
        footer="Switch items on or off as stock comes and goes. Changes are saved straight away. Tap “Save price” to keep a new price."
      >
        {farm.products.map((p) => (
          <ProductRow key={p.id ?? p.name} product={p} onSaved={onSaved} onError={setError} />
        ))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.groupedBackground },
  content: { paddingTop: space.sm, paddingBottom: space.xxl },
  guard: { padding: space.lg },
  inset: { marginHorizontal: space.lg, marginBottom: space.lg, gap: space.md },
  body: { ...type.callout, color: colors.label },
  product: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: MIN_TAP },
  nameCol: { flex: 1, gap: 2 },
  name: { color: colors.label, fontWeight: '600' },
  meta: { color: colors.secondaryLabel },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 112,
    minHeight: MIN_TAP,
    paddingHorizontal: space.md,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    backgroundColor: colors.fill,
  },
  priceInvalid: { borderWidth: 1, borderColor: colors.red },
  dollar: { color: colors.secondaryLabel, marginRight: 2 },
  priceInput: { flex: 1, color: colors.label, textAlign: 'right', paddingVertical: space.sm, minWidth: 0 },
  error: { color: colors.red, fontWeight: '600' },
  footRow: { flexDirection: 'row', justifyContent: 'flex-end' },
});

export default requireBackend(StockScreen);
