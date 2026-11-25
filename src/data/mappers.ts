import type {
  Farm,
  Fulfilment,
  FarmTag,
  Licence,
  LicenceCategory,
  OpeningHours,
  PaymentType,
  Product,
  ProductCategory,
  StateCode,
  VenueType,
  DayKey,
  TimeRange,
} from '../domain/types';

/**
 * Values the database accepts for farms.type and suggestions.venue_type (the check constraints in
 * supabase/migrations/0001_init.sql, widened to include 'butcher' by 0003_butcher_venue_type.sql).
 * Must list every VenueType; src/data/__tests__/mappers.test.ts checks both.
 */
export const DB_VENUE_TYPES = ['farm', 'farm_gate_stall', 'farm_shop', 'farmers_market', 'butcher'] as const satisfies readonly VenueType[];

/** Rows exactly as they come back from the database (see supabase/migrations/0001_init.sql and later). */
export interface FarmRow {
  id: string;
  owner_id: string | null;
  name: string;
  type: VenueType;
  state: StateCode;
  locality: string;
  postcode: string;
  lat: number;
  lng: number;
  story: string;
  photos: string[];
  tags: FarmTag[];
  hours: unknown;
  fulfilment: Fulfilment[];
  payment_types: PaymentType[];
  phone: string | null;
  website: string | null;
  status: 'draft' | 'pending' | 'live' | 'rejected';
  review_note: string | null;
  is_sample: boolean;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  farm_id: string;
  category: ProductCategory;
  name: string;
  price_cents: number | null;
  unit: string | null;
  in_stock: boolean;
  pasteurised: boolean | null;
}

export interface LicenceRow {
  id: string;
  farm_id: string;
  category: LicenceCategory;
  regulator: string;
  licence_number: string;
  expires_on: string | null;
  status: 'self_declared' | 'admin_checked';
}

const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Defensive parse of the stored hours JSON. Anything malformed becomes "by appointment". */
export function parseHours(value: unknown): OpeningHours {
  const fallback: OpeningHours = { kind: 'appointment' };
  if (!value || typeof value !== 'object') return fallback;
  const v = value as { kind?: unknown; days?: unknown; note?: unknown; irregular?: unknown };
  const note = typeof v.note === 'string' && v.note.trim() ? v.note : undefined;
  if (v.kind === 'always') return { kind: 'always', note };
  if (v.kind === 'appointment') return { kind: 'appointment', note };
  if (v.kind !== 'weekly' || !v.days || typeof v.days !== 'object') return fallback;

  const days: Partial<Record<DayKey, TimeRange[]>> = {};
  for (const day of DAY_KEYS) {
    const raw = (v.days as Record<string, unknown>)[day];
    if (!Array.isArray(raw)) continue;
    const ranges = raw.filter(
      (r): r is [string, string] =>
        Array.isArray(r) && r.length === 2 && TIME.test(String(r[0])) && TIME.test(String(r[1])) && String(r[0]) < String(r[1]),
    );
    if (ranges.length > 0) days[day] = ranges;
  }
  return { kind: 'weekly', days, note, ...(v.irregular === true ? { irregular: true } : {}) };
}

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    priceCents: row.price_cents ?? undefined,
    unit: row.unit ?? undefined,
    inStock: row.in_stock,
    pasteurised: row.pasteurised ?? undefined,
  };
}

export function toLicence(row: LicenceRow): Licence {
  return {
    id: row.id,
    category: row.category,
    regulator: row.regulator,
    licenceNumber: row.licence_number,
    expiresOn: row.expires_on ?? undefined,
    status: row.status,
  };
}

export function toFarm(row: FarmRow, products: ProductRow[], licences: LicenceRow[]): Farm {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    state: row.state,
    locality: row.locality,
    postcode: row.postcode,
    lat: row.lat,
    lng: row.lng,
    story: row.story,
    photos: row.photos,
    products: products.map(toProduct),
    tags: row.tags,
    hours: parseHours(row.hours),
    fulfilment: row.fulfilment,
    paymentTypes: row.payment_types,
    licences: licences.map(toLicence),
    phone: row.phone ?? undefined,
    website: row.website ?? undefined,
    isSample: row.is_sample,
    updatedOn: row.updated_at.slice(0, 10),
    status: row.status,
    ownerId: row.owner_id,
    reviewNote: row.review_note,
  };
}

/** Joins the three tables into farms. Products and licences for unknown farms are ignored. */
export function groupFarms(farms: FarmRow[], products: ProductRow[], licences: LicenceRow[]): Farm[] {
  const byFarm = <T extends { farm_id: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) map.set(row.farm_id, [...(map.get(row.farm_id) ?? []), row]);
    return map;
  };
  const p = byFarm(products);
  const l = byFarm(licences);
  return farms.map((f) => toFarm(f, p.get(f.id) ?? [], l.get(f.id) ?? []));
}

/** Writable columns for inserting/updating a farm (never status, owner or review fields). */
export function farmToRow(farm: Farm) {
  return {
    name: farm.name.trim(),
    type: farm.type,
    state: farm.state,
    locality: farm.locality,
    postcode: farm.postcode,
    lat: farm.lat,
    lng: farm.lng,
    story: farm.story.trim(),
    photos: farm.photos ?? [],
    tags: farm.tags,
    hours: farm.hours,
    fulfilment: farm.fulfilment,
    payment_types: farm.paymentTypes,
    phone: farm.phone?.trim() || null,
    website: farm.website?.trim() || null,
  };
}

export function productToRow(product: Product, farmId: string) {
  return {
    farm_id: farmId,
    category: product.category,
    name: product.name.trim(),
    price_cents: product.priceCents ?? null,
    unit: product.unit?.trim() || null,
    in_stock: product.inStock,
    pasteurised: product.category === 'milk' ? (product.pasteurised ?? false) : null,
  };
}

export function licenceToRow(licence: Licence, farmId: string) {
  return {
    farm_id: farmId,
    category: licence.category,
    regulator: licence.regulator.trim(),
    licence_number: licence.licenceNumber.trim(),
    expires_on: licence.expiresOn || null,
  };
}

// ------------------------------------------------------------------ offline cache
export interface FarmCache {
  /** ISO timestamp of the last successful refresh. */
  savedAt: string;
  farms: Farm[];
}

export function serialiseFarmCache(farms: Farm[], now: Date): string {
  return JSON.stringify({ savedAt: now.toISOString(), farms } satisfies FarmCache);
}

/** Returns null for anything that is not a well-formed cache, so a bad cache never crashes the app. */
export function parseFarmCache(raw: string | null): FarmCache | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<FarmCache>;
    if (typeof v.savedAt !== 'string' || !Array.isArray(v.farms)) return null;
    const ok = v.farms.every(
      (f) =>
        f && typeof f.id === 'string' && typeof f.name === 'string' && Number.isFinite(f.lat) && Number.isFinite(f.lng) &&
        Array.isArray(f.products) && f.hours && typeof f.hours === 'object',
    );
    return ok ? { savedAt: v.savedAt, farms: v.farms } : null;
  } catch {
    return null;
  }
}
