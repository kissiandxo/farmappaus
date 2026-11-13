import { StyleSheet, View } from 'react-native';

import {
  activeFilterCount,
  DEFAULT_FILTERS,
  DISTANCE_OPTIONS_KM,
  offeredOptions,
  toggle,
  venueTypeOptions,
  type FarmFilters,
  type WhenFilter,
} from '../domain/filters';
import {
  FARM_TAGS,
  MEAT_CATEGORIES,
  PRODUCT_DISPLAY_ORDER,
  PRODUCT_LABELS,
  TAG_LABELS,
  VENUE_PLURAL_LABELS,
  VENUE_TYPES,
  type ProductCategory,
} from '../domain/types';
import { isBackendConfigured } from '../lib/supabase';
import { useSearch } from '../state/SearchContext';
import { space } from '../theme';
import { Chip } from './Chip';
import { Button, Section } from './ui';

interface FilterPanelProps {
  filters: FarmFilters;
  onChange: (filters: FarmFilters) => void;
}

const WHEN_OPTIONS: { value: WhenFilter; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'now', label: 'Open now' },
  { value: 'weekend', label: 'This weekend' },
];

export const MEAT_CHIP_LABEL = 'Meat';
export const MEAT_CHIP_ACCESSIBILITY_LABEL = 'Meat: beef, lamb, pork or chicken';

/**
 * The "Meat" shortcut chip. It stands for the meat categories that are on offer: shown only when at least one
 * is offered, selected only when every offered one is selected. Pressing it selects them all, or clears them
 * all when they are already all selected. Other selected produce is left alone.
 */
export function meatChip(
  offered: readonly ProductCategory[],
  selected: readonly ProductCategory[],
): { visible: boolean; selected: boolean; next: ProductCategory[] } {
  const meat = MEAT_CATEGORIES.filter((c) => offered.includes(c));
  const allSelected = meat.length > 0 && meat.every((c) => selected.includes(c));
  const next = allSelected
    ? selected.filter((c) => !meat.includes(c))
    : [...selected, ...meat.filter((c) => !selected.includes(c))];
  return { visible: meat.length > 0, selected: allSelected, next };
}

export type NoResultsFix = 'clearSearch' | 'clearFilters' | 'anyTime' | 'anyDistance';

export interface NoResultsCopy {
  title: string;
  message: string;
  action: { label: string; fix: NoResultsFix };
  secondaryAction?: { label: string; fix: NoResultsFix };
}

/**
 * Why Explore is empty, most specific cause first: a search query, then "Open now", then "This weekend", then
 * the distance limit, then the other filters. Distance is only mentioned when a distance limit is set (and is
 * ignored while searching, because search covers any distance).
 */
export function explainNoResults(filters: FarmFilters, query: string): NoResultsCopy {
  const q = query.trim();
  if (q !== '') {
    // Search ignores the distance filter, so only the other filters can be hiding matches.
    const others = activeFilterCount({ ...filters, maxKm: null });
    return {
      title: `No places match “${q}”`,
      message: 'Check the spelling, or try a town or something to buy.',
      action: { label: 'Clear search', fix: 'clearSearch' },
      secondaryAction: others > 0 ? { label: 'Clear filters', fix: 'clearFilters' } : undefined,
    };
  }
  const within = filters.maxKm !== null ? ` within ${filters.maxKm} km` : '';
  if (filters.when === 'now') {
    return {
      title: 'Nothing open right now',
      message: `No place${within} that matches your filters is open at the moment. Many open only on certain days.`,
      action: { label: 'Turn off Open now', fix: 'anyTime' },
    };
  }
  if (filters.when === 'weekend') {
    return {
      title: 'Nothing on this weekend',
      message: `No place${within} that matches your filters has published times for this weekend.`,
      action: { label: 'Any time', fix: 'anyTime' },
    };
  }
  if (filters.maxKm !== null) {
    return {
      title: `Nothing within ${filters.maxKm} km`,
      message: 'Try a bigger distance, or clear some filters.',
      action: { label: 'Any distance', fix: 'anyDistance' },
    };
  }
  return {
    title: 'No places match these filters',
    message: 'Try fewer filters.',
    action: { label: 'Clear filters', fix: 'clearFilters' },
  };
}

/** Filters as grouped Sections of capsule chips: type, when, produce, distance and "good to know" tags. */
export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const { farms, isDefaultLocation } = useSearch();
  const set = (patch: Partial<FarmFilters>) => onChange({ ...filters, ...patch });
  // Without a backend the list is fixed, so only offer options that at least one place has (a filter that
  // can never match is a dead end). With a backend listings change, so every option stays available, except
  // Butchers, which appears only when at least one butcher is listed.
  const offered = offeredOptions(farms, filters, PRODUCT_DISPLAY_ORDER, FARM_TAGS, VENUE_TYPES);
  const productOptions = isBackendConfigured ? PRODUCT_DISPLAY_ORDER : offered.products;
  const tagOptions = isBackendConfigured ? FARM_TAGS : offered.tags;
  const typeOptions = venueTypeOptions(offered.types, isBackendConfigured);
  const meat = meatChip(productOptions, filters.products);

  return (
    <View style={styles.panel}>
      {typeOptions.length > 0 && (
        <Section header="Type of place">
          <View style={styles.chips}>
            {typeOptions.map((venue) => (
              <Chip
                key={venue}
                label={VENUE_PLURAL_LABELS[venue]}
                selected={filters.types.includes(venue)}
                onPress={() => set({ types: toggle(filters.types, venue) })}
              />
            ))}
          </View>
        </Section>
      )}

      <Section
        header="When can you go?"
        footer="Uses published weekly times. Places that run monthly or seasonally aren't included; their page says when they run."
      >
        <View style={styles.chips}>
          {WHEN_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={filters.when === option.value}
              onPress={() => {
                if (filters.when !== option.value) set({ when: option.value });
              }}
            />
          ))}
        </View>
      </Section>

      <Section header="What are you after?" footer="Only places that list this produce. Many markets don't publish a list.">
        <View style={styles.chips}>
          {meat.visible && (
            <Chip
              label={MEAT_CHIP_LABEL}
              accessibilityLabel={MEAT_CHIP_ACCESSIBILITY_LABEL}
              selected={meat.selected}
              onPress={() => set({ products: meat.next })}
            />
          )}
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

      <Section
        header="How far will you travel?"
        footer={isDefaultLocation ? 'Measured from Sydney. Set your location for accurate distances.' : undefined}
      >
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
