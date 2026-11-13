import { LICENCE_CONTROLLED_CATEGORIES } from '../../domain/compliance';
import { openStatus, timezoneForState } from '../../domain/hours';
import { PRODUCT_LABELS, STATE_NAMES } from '../../domain/types';
import listings from '../realListings.json';
import {
  LISTINGS_CHECKED_ON,
  REAL_FARMS,
  latestResearchedOn,
  slugify,
  toOpeningHours,
  toProducts,
  toRealFarm,
  toRealFarms,
  type RealListingRecord,
} from '../realFarms';

const STATES = Object.keys(STATE_NAMES);
const RECORDS = listings as unknown as RealListingRecord[];
const byName = (name: string) => {
  const farm = REAL_FARMS.find((f) => f.name === name);
  if (!farm) throw new Error(`No bundled place named ${name}`);
  return farm;
};

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

describe('REAL_FARMS listing rules', () => {
  it('only lets honesty-box farm-gate stalls be "open any time"', () => {
    for (const farm of REAL_FARMS) {
      if (farm.hours.kind === 'always') expect(`${farm.name}: ${farm.type}`).toBe(`${farm.name}: farm_gate_stall`);
    }
  });

  it('shows no research-process wording in shopper copy, and no alias in a name', () => {
    const META = /page opened|see caveats|per the site|^per |not itemised|not recorded|regional guide|no product list|\bthe (site|page)( footer)? (says|flags|notes|gives)\b|recorded here|\blisting (shows|says)\b|another listing|tourism page|council directory|^stated as|^site notes/i;
    for (const farm of REAL_FARMS) {
      const texts = [farm.story, farm.otherProducts, farm.hours.note].filter((t): t is string => !!t);
      for (const t of texts) expect(`${farm.name}: ${t}`).not.toMatch(META);
      expect(farm.name).not.toMatch(/\(| - /);
    }
  });

  it('never uses a tourism, blog or council page as the Website, but keeps it in sources', () => {
    const NOT_OWN_SITE = /(^|\.)(visit[a-z]*|destination[a-z]*|experience[a-z]*)\.|northernterritory\.com|bendigoregion\.com\.au|swanvalley\.com\.au|\.gov\.au$/;
    for (const farm of REAL_FARMS) {
      if (!farm.website || farm.name === "Golden Plains Farmers' Market") continue;
      expect(`${farm.name}: ${new URL(farm.website).hostname}`).not.toMatch(NOT_OWN_SITE);
    }
    const moved: [string, string][] = [
      ['Nightcliff Markets', 'northernterritory.com/us/en/articles/markets-in-the-nt'],
      ['Batchelor Markets', 'northernterritory.com/articles/markets-in-the-nt'],
      ['Palm Beach Farmers Market', 'destinationgoldcoast.com/blog'],
      ['Burleigh Farmers Market', 'destinationgoldcoast.com/blog'],
      ['Helensvale Farmers Market', 'destinationgoldcoast.com/blog'],
      ['Organic Gold Coast Farmers Market', 'destinationgoldcoast.com/blog'],
      ['Yandina Country Markets', 'visitsunshinecoast.com'],
      ['Kawana Waters Farmers Market', 'visitsunshinecoast.com'],
      ['Marcoola Farmers Market', 'visitsunshinecoast.com'],
      ['Green Shed Market', 'visitscenicrim.com.au'],
      ['Torquay Farmers Market', 'visitgreatoceanroad.org.au'],
      ['Bendigo Community Farmers Market', 'bendigoregion.com.au'],
      ['Tolga Markets', 'trc.qld.gov.au'],
      ['Atherton Artisan & Farmers Night Markets', 'trc.qld.gov.au'],
      ['Freds Pass Rural Markets', 'litchfield.nt.gov.au'],
      ['Berry Springs Markets', 'litchfield.nt.gov.au'],
    ];
    for (const [name, url] of moved) {
      const farm = byName(name);
      expect(farm.website).toBeUndefined();
      expect(farm.sources?.some((s) => s.includes(url))).toBe(true);
    }
    // Council-run market and Facebook-only places keep their Website.
    expect(byName("Golden Plains Farmers' Market").website).toMatch(/goldenplains\.vic\.gov\.au/);
    expect(byName("Kiama Farmers' Market").website).toMatch(/facebook\.com/);
    expect(byName('Lismore Farmers Market').website).toMatch(/facebook\.com/);
  });

  it('keeps every alias findable in the description', () => {
    expect(byName('Bermagui Growers and Makers Market').story).toMatch(/Bermi Market/);
    expect(byName('Farm Gate Market').story).toMatch(/Farmy/);
    expect(byName('Farm Club Australia').story).toMatch(/Snake Creek Cattle Company/);
    expect(byName('Myrtlebank Roaming Farms').story).toMatch(/The Chook House/);
  });

  it('never shows "Open now" for daily-but-untimed, monthly or part-year places', () => {
    for (const name of ['Stanthorpe Cheese', 'Bendigo Community Farmers Market', 'Batchelor Markets', 'Perth City Farm Farmers Market']) {
      const farm = byName(name);
      expect(farm.hours.kind === 'weekly' && farm.hours.irregular).toBe(true);
      expect(farm.hours.note).toBeTruthy();
    }
    const stanthorpe = byName('Stanthorpe Cheese');
    expect(openStatus(stanthorpe.hours, timezoneForState(stanthorpe.state), new Date(Date.UTC(2026, 10, 12, 2))).label).toBe(
      'Check dates',
    );
    expect(byName('Bendigo Community Farmers Market').hours).toMatchObject({ days: { sat: [['09:00', '12:30']] } });
  });

  it('gives Myrtlebank its published daily hours instead of "open any time"', () => {
    expect(byName('Myrtlebank Roaming Farms').hours).toMatchObject({
      kind: 'weekly',
      days: { sun: [['07:30', '19:30']], wed: [['07:30', '19:30']], sat: [['07:30', '19:30']] },
    });
  });
});

describe('LISTINGS_CHECKED_ON', () => {
  it('is the latest researchedOn across the bundled records, as an ISO date', () => {
    const max = RECORDS.map((r) => r.researchedOn).sort().at(-1);
    expect(LISTINGS_CHECKED_ON).toBe(max);
    expect(LISTINGS_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('picks the latest date', () => {
    expect(latestResearchedOn([{ researchedOn: '2026-11-13' }, { researchedOn: '2026-12-01' }, { researchedOn: '2026-01-31' }])).toBe(
      '2026-12-01',
    );
    expect(latestResearchedOn([])).toBe('');
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

  it('honours an explicit irregular flag from the research', () => {
    const hours = toOpeningHours({ kind: 'weekly', days: { sun: [['08:00', '13:00']] }, note: 'Runs April to December.', irregular: true });
    expect(hours).toMatchObject({ kind: 'weekly', irregular: true, note: 'Runs April to December.' });
    const plain = toOpeningHours({ kind: 'weekly', days: { sun: [['08:00', '13:00']] }, note: 'Runs April to December.', irregular: false });
    expect(plain.kind === 'weekly' && plain.irregular).toBeUndefined();
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
