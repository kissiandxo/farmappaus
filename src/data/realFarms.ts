import type {
  DayKey,
  Farm,
  OpeningHours,
  Product,
  ProductCategory,
  StateCode,
  TimeRange,
  VenueType,
} from '../domain/types';
import { PRODUCT_LABELS } from '../domain/types';
import listings from './realListings.json';

/**
 * Real places, taken from public sources and researched by hand. They are "unclaimed": no owner has
 * confirmed them yet. Built by `scripts/build-real-listings.mjs` from `docs/research/listings/`.
 * Public facts only. See docs/REAL_LISTINGS.md.
 */
export interface RealListingRecord {
  name: string;
  type: VenueType;
  address?: string | null;
  locality: string;
  state: StateCode;
  postcode?: string | null;
  products: ProductCategory[];
  otherProducts?: string | null;
  hours: {
    kind: 'weekly' | 'always' | 'appointment';
    days?: Partial<Record<DayKey, string[][]>>;
    note?: string | null;
  };
  hoursAsStated?: string | null;
  website?: string | null;
  phone?: string | null;
  description: string;
  sources: string[];
  researchedOn: string;
  lat: number;
  lng: number;
  locationPrecision: 'address' | 'locality';
}

const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Wording that means "not every week": monthly, seasonal or fortnightly patterns. */
export const IRREGULAR_PATTERN = /\b(monthly|each month|every month|of the month|fortnight\w*|seasonal|season)\b/i;

const text = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/** "Tamborine Mountain State High School (street address not stated)" -> "Tamborine Mountain State High School". */
function cleanAddress(address: string | null | undefined): string | undefined {
  return text(address?.replace(/\s*\(\s*street address not stated\s*\)/i, ''));
}

function validRanges(raw: string[][] | undefined): TimeRange[] {
  return (raw ?? []).filter(
    (r): r is [string, string] => r.length === 2 && TIME.test(r[0]) && TIME.test(r[1]) && r[0] < r[1],
  );
}

/**
 * Maps researched hours to `OpeningHours` without inventing times.
 * - A day with no times means "open that day, times not published": the day is dropped and the
 *   wording stays in `note`, and the listing is `irregular` so it never shows a false "Open now".
 * - Monthly, seasonal and fortnightly patterns are `irregular` and always carry their wording in `note`.
 */
export function toOpeningHours(hours: RealListingRecord['hours'], hoursAsStated?: string | null): OpeningHours {
  const note = text(hours.note);
  if (hours.kind === 'always') return { kind: 'always', note: note ?? text(hoursAsStated) };
  if (hours.kind !== 'weekly') return { kind: 'appointment', note: note ?? text(hoursAsStated) };

  const days: Partial<Record<DayKey, TimeRange[]>> = {};
  let timesMissing = false;
  for (const day of DAY_KEYS) {
    const raw = hours.days?.[day];
    if (!raw) continue;
    const ranges = validRanges(raw);
    if (ranges.length > 0) days[day] = ranges;
    else timesMissing = true;
  }
  const noTimes = Object.keys(days).length === 0;
  const irregular = timesMissing || noTimes || IRREGULAR_PATTERN.test(`${hoursAsStated ?? ''} ${note ?? ''}`);

  return {
    kind: 'weekly',
    days,
    note: note ?? (irregular ? text(hoursAsStated) : undefined),
    ...(irregular ? { irregular: true } : {}),
  };
}

/**
 * One product per researched category, named by its label, no price. Licence-controlled
 * categories (milk, eggs, meat) are included as "advertised by the place": the owner chose this so
 * the product filters work. No licence is recorded or implied; the farm page says so.
 */
export function toProducts(categories: ProductCategory[]): Product[] {
  return [...new Set(categories)]
    .map((category) => ({ category, name: PRODUCT_LABELS[category], inStock: true }));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toRealFarm(record: RealListingRecord): Farm {
  const farm: Farm = {
    id: `real-${record.state.toLowerCase()}-${slugify(record.name)}`,
    name: record.name,
    type: record.type,
    state: record.state,
    locality: record.locality,
    postcode: record.postcode ?? '',
    lat: record.lat,
    lng: record.lng,
    story: record.description,
    photos: [],
    products: toProducts(record.products),
    tags: [],
    hours: toOpeningHours(record.hours, record.hoursAsStated),
    fulfilment: ['pickup'],
    paymentTypes: [],
    licences: [],
    phone: text(record.phone),
    website: text(record.website),
    isSample: false,
    updatedOn: record.researchedOn,
    status: 'live',
    ownerId: null,
    unclaimed: true,
    sources: [...record.sources],
  };
  const address = cleanAddress(record.address);
  if (address) farm.address = address;
  if (record.locationPrecision === 'locality') farm.locationApprox = true;
  const other = text(record.otherProducts);
  if (other) farm.otherProducts = other;
  return farm;
}

/** Maps every record, making ids unique if two places would share one. */
export function toRealFarms(records: RealListingRecord[]): Farm[] {
  const seen = new Set<string>();
  return records.map((record) => {
    const farm = toRealFarm(record);
    let id = farm.id;
    if (seen.has(id)) id = `${farm.id}-${slugify(record.locality)}`;
    for (let n = 2; seen.has(id); n++) id = `${farm.id}-${n}`;
    seen.add(id);
    return id === farm.id ? farm : { ...farm, id };
  });
}

export const REAL_FARMS: Farm[] = toRealFarms(listings as unknown as RealListingRecord[]);
