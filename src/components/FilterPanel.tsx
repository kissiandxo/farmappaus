import { StyleSheet, Switch, View } from 'react-native';

import {
  activeFilterCount,
  DEFAULT_FILTERS,
  DISTANCE_OPTIONS_KM,
  offeredOptions,
  toggle,
  type FarmFilters,
} from '../domain/filters';
import { FARM_TAGS, PRODUCT_CATEGORIES, PRODUCT_LABELS, TAG_LABELS } from '../domain/types';
import { isBackendConfigured } from '../lib/supabase';
import { useSearch } from '../state/SearchContext';
import { colors, space } from '../theme';
import { Chip } from './Chip';
import { Button, Row, Section, selection } from './ui';

interface FilterPanelProps {
  filters: FarmFilters;
  onChange: (filters: FarmFilters) => void;
}

/** Filters as grouped Sections: chips for multi-select options, a system Switch for "Open now". */
export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const { farms } = useSearch();
  const set = (patch: Partial<FarmFilters>) => onChange({ ...filters, ...patch });
  // Without a backend the list is fixed, so only offer options that at least one place has (a filter that
  // can never match is a dead end). With a backend listings change, so every option stays available.
  const offered = offeredOptions(farms, filters, PRODUCT_CATEGORIES, FARM_TAGS);
  const productOptions = isBackendConfigured ? PRODUCT_CATEGORIES : offered.products;
  const tagOptions = isBackendConfigured ? FARM_TAGS : offered.tags;

  return (
    <View style={styles.panel}>
      <Section header="What are you after?">
        <View style={styles.chips}>
          {productOptions.map((category) => (
            <Chip
              key={category}
              label={PRODUCT_LABELS[category]}
              selected={filters.products.includes(category)}
              onPress={() => set({ products: toggle(filters.products, category) })}
            />
          ))}
        </View>
      </Section>

      <Section header="How far will you travel?">
        <View style={styles.chips}>
          <Chip label="Any distance" selected={filters.maxKm === null} onPress={() => set({ maxKm: null })} />
          {DISTANCE_OPTIONS_KM.map((km) => (
            <Chip
              key={km}
              label={`${km} km`}
              selected={filters.maxKm === km}
              onPress={() => set({ maxKm: km })}
            />
          ))}
        </View>
      </Section>

      <Section>
        <Row
          title="Open now"
          accessory={
            <Switch
              value={filters.openNow}
              onValueChange={(openNow) => {
                selection();
                set({ openNow });
              }}
              trackColor={{ true: colors.tint, false: colors.fill }}
              accessibilityLabel="Show only places open now"
            />
          }
        />
      </Section>

      {tagOptions.length > 0 && (
        <Section header="Good to know">
          <View style={styles.chips}>
            {tagOptions.map((tag) => (
              <Chip
                key={tag}
                label={TAG_LABELS[tag]}
                selected={filters.tags.includes(tag)}
                onPress={() => set({ tags: toggle(filters.tags, tag) })}
              />
            ))}
          </View>
        </Section>
      )}

      {activeFilterCount(filters) > 0 && (
        <Button
          label="Clear all filters"
          variant="plain"
          role="destructive"
          size="small"
          onPress={() => onChange(DEFAULT_FILTERS)}
          style={styles.clear}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { paddingTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: space.lg },
  clear: { marginLeft: space.lg, marginBottom: space.xl },
});
