import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { VENUE_LABELS } from '../../domain/types';
import {
  DB_VENUE_TYPES,
  farmToRow,
  groupFarms,
  licenceToRow,
  parseFarmCache,
  parseHours,
  productToRow,
  serialiseFarmCache,
  toFarm,
  type FarmRow,
  type LicenceRow,
  type ProductRow,
} from '../mappers';
import { makeFarm } from '../../domain/__tests__/fixtures';

const farmRow: FarmRow = {
  id: 'f1',
  owner_id: 'u1',
  name: 'Sample Row Farm',
  type: 'farm_shop',
  state: 'VIC',
  locality: 'Daylesford',
  postcode: '3460',
  lat: -37.35,
  lng: 144.15,
  story: 'Story',
  photos: ['https://example.com/a.jpg'],
  tags: ['organic'],
  hours: { kind: 'weekly', days: { sat: [['09:00', '13:00']] }, note: 'Markets too' },
  fulfilment: ['pickup', 'delivery'],
  payment_types: ['cash', 'card'],
  phone: '0412 345 678',
  website: null,
  status: 'live',
  review_note: null,
  is_sample: false,
  updated_at: '2026-11-05T03:21:00.000Z',
};
const productRow: ProductRow = {
  id: 'p1', farm_id: 'f1', category: 'honey', name: 'Honey', price_cents: 1400, unit: '500 g', in_stock: true, pasteurised: null,
};
const licenceRow: LicenceRow = {
  id: 'l1', farm_id: 'f1', category: 'meat', regulator: 'PrimeSafe', licence_number: 'X-1', expires_on: '2030-01-01', status: 'admin_checked',
};

describe('toFarm', () => {
  it('maps database rows to the app model', () => {
    const farm = toFarm(farmRow, [productRow], [licenceRow]);
    expect(farm).toMatchObject({
      id: 'f1',
      name: 'Sample Row Farm',
      paymentTypes: ['cash', 'card'],
      updatedOn: '2026-11-05',
      status: 'live',
      ownerId: 'u1',
      website: undefined,
      phone: '0412 345 678',
    });
    expect(farm.products[0]).toEqual({
      id: 'p1', category: 'honey', name: 'Honey', priceCents: 1400, unit: '500 g', inStock: true, pasteurised: undefined,
    });
    expect(farm.licences[0]).toMatchObject({ licenceNumber: 'X-1', expiresOn: '2030-01-01', status: 'admin_checked' });
    expect(farm.hours).toEqual({ kind: 'weekly', days: { sat: [['09:00', '13:00']] }, note: 'Markets too' });
  });
});

describe('groupFarms', () => {
  it('attaches products and licences to the right farm and ignores strays', () => {
    const second = { ...farmRow, id: 'f2', name: 'Second' };
    const stray = { ...productRow, id: 'p9', farm_id: 'nope' };
    const farms = groupFarms([farmRow, second], [productRow, stray, { ...productRow, id: 'p2', farm_id: 'f2' }], [licenceRow]);
    expect(farms.map((f) => [f.id, f.products.length, f.licences.length])).toEqual([
      ['f1', 1, 1],
      ['f2', 1, 0],
    ]);
  });
});

describe('parseHours', () => {
  it('keeps valid weekly hours and drops invalid ranges', () => {
    expect(
      parseHours({ kind: 'weekly', days: { mon: [['09:00', '17:00'], ['25:00', '26:00'], ['10:00', '09:00']], fri: 'nope' } }),
    ).toEqual({ kind: 'weekly', days: { mon: [['09:00', '17:00']] }, note: undefined });
  });

  it('understands always-open and appointment', () => {
    expect(parseHours({ kind: 'always', note: 'Honesty box' })).toEqual({ kind: 'always', note: 'Honesty box' });
    expect(parseHours({ kind: 'appointment' })).toEqual({ kind: 'appointment', note: undefined });
  });

  it('falls back to "by appointment" for anything malformed', () => {
    for (const bad of [null, undefined, 'x', 42, {}, { kind: 'weekly' }, { kind: 'weekly', days: 5 }, { kind: 'mystery' }]) {
      expect(parseHours(bad)).toEqual({ kind: 'appointment' });
    }
  });
});

describe('row builders', () => {
  it('farmToRow trims text, nulls empty contacts, and never includes status or owner', () => {
    const row = farmToRow(makeFarm({ name: '  Padded Farm ', story: ' Hi ', phone: ' ', website: '', status: 'live', ownerId: 'u1' }));
    expect(row).toMatchObject({ name: 'Padded Farm', story: 'Hi', phone: null, website: null });
    expect(row).not.toHaveProperty('status');
    expect(row).not.toHaveProperty('owner_id');
  });

  it('productToRow only keeps "pasteurised" for milk', () => {
    const base = { name: ' Thing ', inStock: true, priceCents: 500 };
    expect(productToRow({ ...base, category: 'milk', pasteurised: true }, 'f1').pasteurised).toBe(true);
    expect(productToRow({ ...base, category: 'milk' }, 'f1').pasteurised).toBe(false);
    expect(productToRow({ ...base, category: 'honey', pasteurised: true }, 'f1')).toMatchObject({ pasteurised: null, name: 'Thing' });
  });

  it('licenceToRow never sets the review status', () => {
    const row = licenceToRow({ category: 'meat', regulator: ' PrimeSafe ', licenceNumber: ' 1 ', status: 'admin_checked' }, 'f1');
    expect(row).toEqual({ farm_id: 'f1', category: 'meat', regulator: 'PrimeSafe', licence_number: '1', expires_on: null });
  });
});

describe('offline cache', () => {
  const farms = [makeFarm({ id: 'a' }), makeFarm({ id: 'b' })];

  it('round-trips farms with the time they were saved', () => {
    const raw = serialiseFarmCache(farms, new Date('2026-11-13T01:00:00Z'));
    const cache = parseFarmCache(raw);
    expect(cache?.savedAt).toBe('2026-11-13T01:00:00.000Z');
    expect(cache?.farms.map((f) => f.id)).toEqual(['a', 'b']);
  });

  it('rejects missing, corrupt or malformed caches instead of crashing', () => {
    expect(parseFarmCache(null)).toBeNull();
    expect(parseFarmCache('not json')).toBeNull();
    expect(parseFarmCache('{"savedAt":1,"farms":[]}')).toBeNull();
    expect(parseFarmCache('{"savedAt":"x","farms":[{"id":"a"}]}')).toBeNull();
    expect(parseFarmCache('{"savedAt":"x","farms":"nope"}')).toBeNull();
  });
});

describe('venue types in the database', () => {
  it('DB_VENUE_TYPES lists every VenueType', () => {
    expect([...DB_VENUE_TYPES].sort()).toEqual(Object.keys(VENUE_LABELS).sort());
  });

  it('the latest migration allows every type, butcher included, on farms and suggestions', () => {
    const sql = readFileSync(join(__dirname, '../../../supabase/migrations/0003_butcher_venue_type.sql'), 'utf8');
    const checks = [...sql.matchAll(/check \((?:type|venue_type) in \(([^)]*)\)\)/g)].map((m) =>
      m[1].split(',').map((v) => v.trim().replace(/'/g, '')).sort(),
    );
    expect(checks).toHaveLength(2);
    for (const values of checks) expect(values).toEqual([...DB_VENUE_TYPES].sort());
  });

  it('maps a butcher row and writes it back unchanged', () => {
    const farm = toFarm({ ...farmRow, type: 'butcher' }, [], []);
    expect(farm.type).toBe('butcher');
    expect(farmToRow(farm).type).toBe('butcher');
  });
});
