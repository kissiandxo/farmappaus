import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { browseFilters, matchesBrowseCategory, type BrowseCategory } from '../domain/filters';
import { useSearch } from '../state/SearchContext';
import { colors, radius, space, type } from '../theme';
import { Icon, selection } from './ui';

const CATEGORIES = [
  { key: 'farmers_market', label: 'Markets', image: require('../../assets/images/browse/markets.jpg') },
  { key: 'butcher', label: 'Butchers', image: require('../../assets/images/browse/butchers.jpg') },
  { key: 'fruit', label: 'Fruit', image: require('../../assets/images/browse/fruit.jpg') },
] as const;

export function BrowseCategories() {
  const { farms, filters, setFilters } = useSearch();
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale > 1.6 || width < 320;

  const choose = (category: BrowseCategory) => {
    selection();
    setFilters(browseFilters(filters, category));
  };

  return (
    <View style={[styles.row, stacked && styles.column]}>
      {CATEGORIES.map(({ key, label, image }) => {
        const selected = matchesBrowseCategory(filters, key);
        const available = selected || farms.some(farm => key === 'fruit'
          ? farm.products.some(product => product.category === 'fruit' && product.inStock)
          : farm.type === key);
        if (!available) return null;
        return (
          <Pressable key={key} accessibilityRole="button" accessibilityLabel={`Browse ${label.toLowerCase()}`}
            accessibilityState={{ selected }} onPress={() => choose(key)}
            style={({ pressed }) => [styles.tile, stacked && styles.horizontal, selected && styles.selected, pressed && styles.pressed]}>
            <Image source={image} accessible={false} contentFit="cover" style={stacked ? styles.thumb : styles.image} />
            <View style={styles.caption}>
              <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
              {selected && <Icon name="checkmark" color={colors.onTint} weight="bold" size={14} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  column: { flexDirection: 'column' },
  tile: { flex: 1, minWidth: 0, backgroundColor: colors.cell, borderRadius: radius.group, borderCurve: 'continuous', overflow: 'hidden' },
  horizontal: { flex: 0, flexDirection: 'row', alignItems: 'center' },
  selected: { backgroundColor: colors.tint },
  pressed: { opacity: 0.75 },
  image: { width: '100%', height: 66, backgroundColor: colors.fill },
  thumb: { width: 64, height: 60, backgroundColor: colors.fill },
  caption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.sm },
  label: { ...type.subheadline, fontWeight: '600', color: colors.label, flexShrink: 1 },
  selectedLabel: { color: colors.onTint },
});
