import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { blankProduct } from '../domain/listing';
import { PRODUCT_CATEGORIES, PRODUCT_LABELS, type Product, type ProductCategory } from '../domain/types';
import { centsToInput, priceToCents } from '../domain/validation';
import { colors, font, space } from '../theme';
import { Btn, ChipGroup, Field, SwitchRow } from './FormBits';

const CATEGORY_OPTIONS = PRODUCT_CATEGORIES.map((value) => ({ value, label: PRODUCT_LABELS[value] }));

/** A price box that keeps what you typed, and only reports a price when it makes sense. */
function PriceField({ cents, onChange }: { cents: number | undefined; onChange: (cents: number | undefined) => void }) {
  const [text, setText] = useState(centsToInput(cents));
  const parsed = priceToCents(text);
  const invalid = text.trim() !== '' && parsed === null;
  return (
    <Field
      label="Price in dollars (AUD)"
      value={text}
      onChangeText={(t) => {
        setText(t);
        if (t.trim() === '') onChange(undefined);
        else {
          const c = priceToCents(t);
          if (c !== null) onChange(c);
        }
      }}
      keyboardType="decimal-pad"
      placeholder="e.g. 7.50"
      error={invalid ? 'Enter a price like 7.50' : null}
      hint="Leave blank if customers should ask."
    />
  );
}

export function ProductsEditor({ products, onChange }: { products: Product[]; onChange: (next: Product[]) => void }) {
  const update = (index: number, patch: Partial<Product>) =>
    onChange(products.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  return (
    <View style={styles.wrap}>
      {products.length === 0 && <Text style={styles.empty}>No products yet. Add what you sell.</Text>}
      {products.map((product, index) => (
        <View key={product.id ?? `new-${index}`} style={styles.item}>
          <Text style={styles.itemTitle}>Product {index + 1}</Text>
          <ChipGroup
            options={CATEGORY_OPTIONS}
            value={product.category}
            onChange={(category: ProductCategory) =>
              update(index, { category, pasteurised: category === 'milk' ? (product.pasteurised ?? false) : undefined })
            }
          />
          <Field label="Name" value={product.name} onChangeText={(name) => update(index, { name })} placeholder="e.g. Free-range eggs" maxLength={100} />
          <PriceField cents={product.priceCents} onChange={(priceCents) => update(index, { priceCents })} />
          <Field label="Sold by" value={product.unit ?? ''} onChangeText={(unit) => update(index, { unit })} placeholder="e.g. dozen, kg, 500 g jar" maxLength={30} />
          <SwitchRow label="In stock" value={product.inStock} onChange={(inStock) => update(index, { inStock })} />
          {product.category === 'milk' && (
            <SwitchRow
              label="This milk is pasteurised"
              value={product.pasteurised === true}
              onChange={(pasteurised) => update(index, { pasteurised })}
              hint="Raw (unpasteurised) milk can’t be sold for drinking in Australia, so it can’t be listed."
            />
          )}
          <Btn label="Remove this product" kind="danger" onPress={() => onChange(products.filter((_, i) => i !== index))} />
        </View>
      ))}
      <Btn label="Add a product" onPress={() => onChange([...products, blankProduct()])} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  empty: { fontSize: font.body, color: colors.textMuted },
  item: { gap: space.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md },
  itemTitle: { fontSize: font.large, fontWeight: '700', color: colors.text },
});
