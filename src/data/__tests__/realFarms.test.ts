import { LICENCE_CONTROLLED_CATEGORIES } from '../../domain/compliance';
import { openStatus, timezoneForState } from '../../domain/hours';
import { PRODUCT_LABELS, STATE_NAMES } from '../../domain/types';
import {
  REAL_FARMS,
  slugify,
  toOpeningHours,
  toProducts,
  toRealFarm,
  toRealFarms,
  type RealListingRecord,
} from '../realFarms';

const STATES = Object.keys(STATE_NAMES);

function record(overrides: Partial<RealListingRecord> = {}): RealListingRecord {
  return {
    name: "Test Growers' Market & Co",
    type: 'farmers_market',
    address: '1 Market St',
    locality: 'Testville',
    state: 'VIC',
    postcode: '3000',
    products: ['honey', 'veg'],
    otherProducts: 'Also bread.',
    hours: { kind: 'weekly', days: { sat: [['08:00', '12:00']] }, note: null },
    hoursAsStated: 'Every Saturday 8am to 12pm',
    website: 'https://example.com/',
    phone: null,
    description: 'A market.',
    sources: ['https://example.com/about'],
    researchedOn: '2026-11-13',
    lat: -37.8,
    lng: 144.9,
    locationPrecision: 'address',
    ...overrides,
  };
}

describe('REAL_FARMS (the researched data)', () => {
  it('has places', () => {
    expect(REAL_FARMS.length).toBeGreaterThanOrEqual(50);
  });

  it('gives every place a name, a valid state and a locality', () => {
    for (const farm of REAL_FARMS) {
      expect(farm.name.trim()).not.toBe('');
      expect(STATES).toContain(farm.state);
      expect(farm.locality.trim()).not.toBe('');
    }
  });

  it('puts every pin inside Australia', () => {
    for (const farm of REAL_FARMS) {
      expect(farm.lat).toBeGreaterThan(-44);
      expect(farm.lat).toBeLessThan(-9);
      expect(farm.lng).toBeGreaterThan(112);
      expect(farm.lng).toBeLessThan(154);
    }
  });

  it('has at least one http(s) source for every place', () => {
    for (const farm of REAL_FARMS) {
      expect(farm.sources?.length ?? 0).toBeGreaterThanOrEqual(1);
      for (const url of farm.sources ?? []) expect(url).toMatch(/^https?:\/\//);
    }
  });

  it('records no licence for any place, even when it advertises licence-controlled produce', () => {
    for (const farm of REAL_FARMS) expect(farm.licences).toEqual([]);
    const controlled = REAL_FARMS.flatMap((f) => f.products).filter((p) => LICENCE_CONTROLLED_CATEGORIES.includes(p.category));
    expect(controlled.length).toBeGreaterThan(0);
  });

  it('is never sample data, and is unclaimed, live and unpriced', () => {
    for (const farm of REAL_FARMS) {
      expect(farm.isSample).toBe(false);
      expect(farm.unclaimed).toBe(true);
      expect(farm.status).toBe('live');
      expect(farm.photos).toEqual([]);
      for (const product of farm.products) {
        expect(product.priceCents).toBeUndefined();
        expect(product.inStock).toBe(true);
      }
    }
  });

  it('has unique ids of the form real-<state>-<slug>', () => {
    const ids = REAL_FARMS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const farm of REAL_FARMS) expect(farm.id).toMatch(new RegExp(`^real-${farm.state.toLowerCase()}-[a-z0-9-]+$`));
  });

  it('does not include the excluded one-off event', () => {
    expect(REAL_FARMS.some((f) => /mulgowie/i.test(f.name))).toBe(false);
  });

  it('never claims "Open now" for a monthly or unpublished-times listing', () => {
    const monthly = REAL_FARMS.find((f) => f.name === 'Orange Farmers Market');
    const noTimes = REAL_FARMS.find((f) => f.name === 'Bickley Valley Fresh');
    for (const farm of [monthly, noTimes]) {
      expect(farm).toBeDefined();
      expect(farm!.hours.kind === 'weekly' && farm!.hours.irregular).toBe(true);
      expect(farm!.hours.note).toBeTruthy();
      // At any moment of a week, the label is the same "Check dates".
      for (let hour = 0; hour < 24 * 7; hour += 5) {
        const now = new Date(Date.UTC(2026, 10, 9, hour));
        expect(openStatus(farm!.hours, timezoneForState(farm!.state), now).label).toBe('Check dates');
      }
    }
  });
});

describe('toRealFarm', () => {
  it('maps the researched facts and marks the place unclaimed', () => {
    const farm = toRealFarm(record());
    expect(farm).toMatchObject({
      id: 'real-vic-test-growers-market-and-co',
      name: "Test Growers' Market & Co",
      type: 'farmers_market',
      state: 'VIC',
      locality: 'Testville',
      postcode: '3000',
      lat: -37.8,
      lng: 144.9,
      story: 'A market.',
      address: '1 Market St',
      website: 'https://example.com/',
      sources: ['https://example.com/about'],
      otherProducts: 'Also bread.',
      isSample: false,
      unclaimed: true,
      status: 'live',
      updatedOn: '2026-11-13',
      photos: [],
      licences: [],
      fulfilment: ['pickup'],
      paymentTypes: [],
    });
    expect(farm.phone).toBeUndefined();
    expect(farm.locationApprox).toBeUndefined();
  });

  it('marks locality-precision pins as approximate and keeps a recorded phone', () => {
    const farm = toRealFarm(record({ locationPrecision: 'locality', phone: '07 5446 0144' }));
    expect(farm.locationApprox).toBe(true);
    expect(farm.phone).toBe('07 5446 0144');
  });

  it('leaves out a missing address, other products and postcode', () => {
    const farm = toRealFarm(record({ address: null, otherProducts: null, postcode: '' }));
    expect(farm.address).toBeUndefined();
    expect(farm.otherProducts).toBeUndefined();
    expect(farm.postcode).toBe('');
  });

  it('drops a "street address not stated" aside from the address', () => {
    const farm = toRealFarm(record({ address: 'Berry Springs hall (street address not stated)' }));
    expect(farm.address).toBe('Berry Springs hall');
  });
});

describe('toRealFarms', () => {
  it('keeps ids unique when two names slug the same', () => {
    const farms = toRealFarms([record({ locality: 'A' }), record({ locality: 'B' }), record({ locality: 'B' })]);
    expect(new Set(farms.map((f) => f.id)).size).toBe(3);
    expect(farms[0].id).toBe('real-vic-test-growers-market-and-co');
  });
});

describe('toProducts', () => {
  it('makes one unpriced product per category, named by its label', () => {
    expect(toProducts(['honey', 'veg', 'honey'])).toEqual([
      { category: 'honey', name: PRODUCT_LABELS.honey, inStock: true },
      { category: 'veg', name: PRODUCT_LABELS.veg, inStock: true },
    ]);
  });

  it('keeps milk, eggs and meat as advertised, unpriced', () => {
    expect(toProducts(['milk', 'eggs', 'fruit']).map((p) => p.category)).toEqual(['milk', 'eggs', 'fruit']);
    expect(toProducts(['milk'])).toEqual([{ category: 'milk', name: 'Milk', inStock: true }]);
  });
});

describe('toOpeningHours', () => {
  it('keeps plainly weekly hours as they are, without a note or the irregular flag', () => {
    expect(toOpeningHours({ kind: 'weekly', days: { sat: [['08:00', '12:00']] }, note: null }, 'Every Saturday')).toEqual({
      kind: 'weekly',
      days: { sat: [['08:00', '12:00']] },
      note: undefined,
    });
  });

  it('carries a note on a weekly market without calling it irregular', () => {
    const hours = toOpeningHours({ kind: 'weekly', days: { sun: [['07:00', '11:30']] }, note: 'Stated as open every Sunday.' });
    expect(hours).toMatchObject({ kind: 'weekly', note: 'Stated as open every Sunday.' });
    expect(hours.kind === 'weekly' && hours.irregular).toBeUndefined();
  });

  it('marks a monthly pattern irregular and keeps the wording', () => {
    const hours = toOpeningHours(
      { kind: 'weekly', days: { sat: [['08:30', '12:00']] }, note: 'Second Saturday of each month only.' },
      'Second Saturday of every month, 8.30am to midday.',
    );
    expect(hours).toEqual({
      kind: 'weekly',
      days: { sat: [['08:30', '12:00']] },
      note: 'Second Saturday of each month only.',
      irregular: true,
    });
  });

  it('falls back to the stated wording for the note when a monthly entry has none', () => {
    const hours = toOpeningHours(
      { kind: 'weekly', days: { sun: [['09:00', '13:00']] }, note: null },
      'First Sunday of every month, 9am to 1pm',
    );
    expect(hours).toMatchObject({ irregular: true, note: 'First Sunday of every month, 9am to 1pm' });
  });

  it('treats seasonal wording as irregular', () => {
    const hours = toOpeningHours({ kind: 'weekly', days: { mon: [['10:00', '17:00']] }, note: 'Seasonal: open 7 days this season.' });
    expect(hours).toMatchObject({ irregular: true });
  });

  it('drops days with no published times, keeps the wording, and does not invent times', () => {
    const hours = toOpeningHours(
      { kind: 'weekly', days: { fri: [], sat: [], sun: [] }, note: 'Open Friday to Sunday; closed public holidays.' },
      'Fri to Sun',
    );
    expect(hours).toEqual({
      kind: 'weekly',
      days: {},
      note: 'Open Friday to Sunday; closed public holidays.',
      irregular: true,
    });
  });

  it('keeps the days that do have times when only some are missing', () => {
    const hours = toOpeningHours({ kind: 'weekly', days: { sat: [['08:00', '12:00']], sun: [] }, note: 'Sunday times not published.' });
    expect(hours).toMatchObject({ days: { sat: [['08:00', '12:00']] }, irregular: true, note: 'Sunday times not published.' });
  });

  it('ignores malformed time ranges instead of inventing them', () => {
    const hours = toOpeningHours({ kind: 'weekly', days: { sat: [['25:00', '12:00'], ['09:00', '08:00']] }, note: null });
    expect(hours).toMatchObject({ days: {}, irregular: true });
  });

  it('maps "always" and "appointment" with their wording', () => {
    expect(toOpeningHours({ kind: 'always', note: 'Seasonal.' })).toEqual({ kind: 'always', note: 'Seasonal.' });
    expect(toOpeningHours({ kind: 'appointment' }, 'Call ahead')).toEqual({ kind: 'appointment', note: 'Call ahead' });
  });
});

describe('slugify', () => {
  it('lowercases, drops apostrophes and turns & into "and"', () => {
    expect(slugify("Kiama Farmers' Market")).toBe('kiama-farmers-market');
    expect(slugify('Baba & Dida’s Marketplace')).toBe('baba-and-didas-marketplace');
  });
});
