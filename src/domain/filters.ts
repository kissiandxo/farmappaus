import { haversineKm, type LatLng } from './geo';
import { openStatus, timezoneForState, weekendSummary, type OpenStatus } from './hours';
import {
  MEAT_CATEGORIES,
  PRODUCT_LABELS,
  STATE_NAMES,
  TAG_LABELS,
  VENUE_LABELS,
  VENUE_PLURAL_LABELS,
  VENUE_TYPES,
  type Farm,
  type FarmTag,
  type ProductCategory,
  type VenueType,
} from './types';

/** "any" = no time filter; "now" = open at this moment; "weekend" = has published times this weekend. */
export type WhenFilter = 'any' | 'now' | 'weekend';

export interface FarmFilters {
  /** Show places selling ANY of these (in stock). Empty = no product filter. */
  products: ProductCategory[];
  /** Maximum distance in km. null = any distance. */
  maxKm: number | null;
  when: WhenFilter;
  /** Places must have ALL of these tags. */
  tags: FarmTag[];
  /** Show places of ANY of these types. Empty = every type. */
  types: VenueType[];
}

export const DEFAULT_FILTERS: FarmFilters = {
  products: [],
  maxKm: null,
  when: 'any',
  tags: [],
  types: [],
};

export const DISTANCE_OPTIONS_KM = [10, 25, 50, 100, 250] as const;

export interface FarmResult {
  farm: Farm;
  distanceKm: number;
  status: OpenStatus;
  /** This weekend's times, e.g. "Sat 7:00 am – 11:30 am". Set only when filtering by "This weekend". */
  weekend?: string;
}

export function activeFilterCount(filters: FarmFilters): number {
  return (
    (filters.products.length > 0 ? 1 : 0) +
    (filters.maxKm !== null ? 1 : 0) +
    (filters.when !== 'any' ? 1 : 0) +
    (filters.tags.length > 0 ? 1 : 0) +
    (filters.types.length > 0 ? 1 : 0)
  );
}

export function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** True when the place has at least one in-stock product that is beef, lamb, pork or chicken. */
export function sellsMeat(farm: Pick<Farm, 'products'>): boolean {
  return farm.products.some((p) => p.inStock && MEAT_CATEGORIES.includes(p.category));
}

/** Applies filters, attaches distance and open status, sorts nearest first. */
export function searchFarms(
  farms: Farm[],
  filters: FarmFilters,
  origin: LatLng,
  now: Date,
): FarmResult[] {
  const results: FarmResult[] = [];
  const types = filters.types ?? [];
  const when = filters.when ?? 'any';

  for (const farm of farms) {
    if (types.length > 0 && !types.includes(farm.type)) continue;
    if (
      filters.products.length > 0 &&
      !farm.products.some((p) => p.inStock && filters.products.includes(p.category))
    ) {
      continue;
    }
    if (filters.tags.length > 0 && !filters.tags.every((t) => farm.tags.includes(t))) {
      continue;
    }

    const distanceKm = haversineKm(origin, farm);
    if (filters.maxKm !== null && distanceKm > filters.maxKm) continue;

    const timeZone = timezoneForState(farm.state);
    const status = openStatus(farm.hours, timeZone, now);
    if (when === 'now' && !status.isOpen) continue;

    if (when === 'weekend') {
      const weekend = weekendSummary(farm.hours, timeZone, now);
      if (weekend === null) continue;
      results.push({ farm, distanceKm, status, weekend });
      continue;
    }

    results.push({ farm, distanceKm, status });
  }

  return results.sort((a, b) => a.distanceKm - b.distanceKm || a.farm.name.localeCompare(b.farm.name));
}

/**
 * Filter options worth offering for a fixed list of places: only the product categories, tags and venue types
 * that at least one place has, plus any already selected (so a chosen filter can always be switched off). Keeps
 * the order of `allProducts`, `allTags` and `allTypes`.
 */
export function offeredOptions(
  farms: Farm[],
  filters: Pick<FarmFilters, 'products' | 'tags' | 'types'>,
  allProducts: readonly ProductCategory[],
  allTags: readonly FarmTag[],
  allTypes: readonly VenueType[] = VENUE_TYPES,
): { products: ProductCategory[]; tags: FarmTag[]; types: VenueType[] } {
  const selectedTypes = filters.types ?? [];
  return {
    products: allProducts.filter((c) => filters.products.includes(c) || farms.some((f) => f.products.some((p) => p.category === c))),
    tags: allTags.filter((t) => filters.tags.includes(t) || farms.some((f) => f.tags.includes(t))),
    types: allTypes.filter((t) => selectedTypes.includes(t) || farms.some((f) => f.type === t)),
  };
}

/** Venue types offered only when at least one listed place (or the current selection) has them. */
export const ON_DEMAND_VENUE_TYPES: readonly VenueType[] = ['butcher'];

/**
 * Type-of-place chips. Without a backend the list is fixed, so only the types some place has (`offeredTypes`,
 * from offeredOptions). With a backend every type stays available, except the on-demand ones (butchers),
 * which appear only once at least one is offered.
 */
export function venueTypeOptions(offeredTypes: readonly VenueType[], backendConfigured: boolean): VenueType[] {
  if (!backendConfigured) return [...offeredTypes];
  return VENUE_TYPES.filter((t) => !ON_DEMAND_VENUE_TYPES.includes(t) || offeredTypes.includes(t));
}

/**
 * Folds text for matching: removes accents, lower-cases, drops apostrophes (straight and curly) and collapses
 * whitespace. "Farmers’ Market  Café" -> "farmers market cafe".
 */
export function normaliseText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const haystackCache = new WeakMap<Farm, string>();

/** Extra search words for in-stock produce, so everyday and Aussie spellings find the right places. */
const SEARCH_SYNONYMS: Partial<Record<ProductCategory, string>> = {
  veg: 'veg veggies vegies vegetable',
  beef: 'steak mince',
  chicken: 'poultry',
  milk: 'dairy',
  fruit: 'fruits',
};

function haystack(farm: Farm): string {
  let text = haystackCache.get(farm);
  if (text === undefined) {
    const inStock = farm.products.filter((p) => p.inStock);
    const parts = [
      farm.name,
      farm.story,
      farm.locality,
      farm.postcode,
      farm.state,
      STATE_NAMES[farm.state],
      VENUE_LABELS[farm.type],
      VENUE_PLURAL_LABELS[farm.type],
      ...inStock.map((p) => PRODUCT_LABELS[p.category]),
      ...inStock.map((p) => SEARCH_SYNONYMS[p.category] ?? ''),
      sellsMeat(farm) ? 'meat meats butcher' : '',
      farm.otherProducts ?? '',
      ...farm.tags.map((t) => TAG_LABELS[t]),
    ];
    text = normaliseText(parts.filter(Boolean).join(' \n '));
    haystackCache.set(farm, text);
  }
  return text;
}

const STATE_CODES = new Set(['nsw', 'vic', 'qld', 'sa', 'wa', 'tas', 'nt', 'act']);

/**
 * Free-text search over a place's name, description, suburb, postcode, state, type, in-stock produce (plus
 * everyday words for it, e.g. "vegies", "steak", "dairy", and "meat" for any place selling beef, lamb, pork or
 * chicken), other products and tags. Every word of the query must appear (as the start of a word or anywhere
 * in the text), except a state code ("SA", "WA", "NT", "TAS", ...), which matches only places in that state,
 * so "wa" does not match "New South Wales". A blank query matches everything.
 */
export function matchesQuery(farm: Farm, query: string): boolean {
  const tokens = normaliseText(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const text = haystack(farm);
  const state = farm.state.toLowerCase();
  // A substring match also covers "prefix of a word".
  return tokens.every((token) => (STATE_CODES.has(token) ? state === token : text.includes(token)));
}
