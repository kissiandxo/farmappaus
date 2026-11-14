import {
  activeFilterCount,
  DEFAULT_FILTERS,
  matchesQuery,
  normaliseText,
  offeredOptions,
  searchFarms,
  sellsMeat,
  venueTypeOptions,
  toggle,
} from '../filters';
import { MEAT_CATEGORIES, PRODUCT_CATEGORIES, PRODUCT_DISPLAY_ORDER, VENUE_LABELS, VENUE_PLURAL_LABELS, VENUE_TYPES } from '../types';
import { REAL_FARMS } from '../../data/realFarms';
import { makeFarm, makeFilters } from './fixtures';

const SYDNEY = { lat: -33.8688, lng: 151.2093 };
const NOW = new Date('2026-11-13T23:00:00Z');

const near = makeFarm({
  id: 'near',
  name: 'Near Eggs',
  lat: -33.9,
  lng: 151.2,
  products: [{ category: 'eggs', name: 'Eggs', inStock: true }],
  tags: ['free_range'],
  hours: { kind: 'always' },
});
const mid = makeFarm({
  id: 'mid',
  name: 'Mid Beef',
  lat: -33.2835,
  lng: 149.1012, // Orange, ~190 km
  products: [{ category: 'beef', name: 'Beef', inStock: true }],
  tags: ['grass_fed', 'organic'],
  hours: { kind: 'appointment' },
});
const far = makeFarm({
  id: 'far',
  name: 'Far Honey',
  state: 'VIC',
  lat: -37.8136,
  lng: 144.9631, // Melbourne, ~714 km
  products: [
    { category: 'honey', name: 'Honey', inStock: true },
    { category: 'eggs', name: 'Eggs', inStock: false },
  ],
  tags: ['organic'],
  hours: { kind: 'always' },
});
const farms = [far, near, mid];

const ids = (results: { farm: { id: string } }[]) => results.map((r) => r.farm.id);

describe('searchFarms', () => {
  it('returns everything, nearest first, with distance and status', () => {
    const results = searchFarms(farms, DEFAULT_FILTERS, SYDNEY, NOW);
    expect(ids(results)).toEqual(['near', 'mid', 'far']);
    expect(results[0].distanceKm).toBeLessThan(10);
    expect(results[0].status.isOpen).toBe(true);
  });

  it('filters by product (any selected), ignoring out-of-stock items', () => {
    const eggs = searchFarms(farms, { ...DEFAULT_FILTERS, products: ['eggs'] }, SYDNEY, NOW);
    expect(ids(eggs)).toEqual(['near']); // far has eggs but out of stock

    const eggsOrBeef = searchFarms(farms, { ...DEFAULT_FILTERS, products: ['eggs', 'beef'] }, SYDNEY, NOW);
    expect(ids(eggsOrBeef)).toEqual(['near', 'mid']);
  });

  it('filters by maximum distance in km', () => {
    expect(ids(searchFarms(farms, { ...DEFAULT_FILTERS, maxKm: 50 }, SYDNEY, NOW))).toEqual(['near']);
    expect(ids(searchFarms(farms, { ...DEFAULT_FILTERS, maxKm: 250 }, SYDNEY, NOW))).toEqual(['near', 'mid']);
  });

  it('requires ALL selected tags', () => {
    expect(ids(searchFarms(farms, { ...DEFAULT_FILTERS, tags: ['organic'] }, SYDNEY, NOW))).toEqual([
      'mid',
      'far',
    ]);
    expect(
      ids(searchFarms(farms, { ...DEFAULT_FILTERS, tags: ['organic', 'grass_fed'] }, SYDNEY, NOW)),
    ).toEqual(['mid']);
  });

  it('filters to places open now', () => {
    expect(ids(searchFarms(farms, { ...DEFAULT_FILTERS, when: 'now' }, SYDNEY, NOW))).toEqual([
      'near',
      'far',
    ]);
  });

  it('combines filters', () => {
    const results = searchFarms(
      farms,
      { products: ['honey'], maxKm: 1000, when: 'now', tags: ['organic'], types: [] },
      SYDNEY,
      NOW,
    );
    expect(ids(results)).toEqual(['far']);
  });

  it('breaks distance ties by name', () => {
    const a = makeFarm({ id: 'a', name: 'Alpha' });
    const b = makeFarm({ id: 'b', name: 'Bravo' });
    expect(ids(searchFarms([b, a], DEFAULT_FILTERS, SYDNEY, NOW))).toEqual(['a', 'b']);
  });
});

describe('helpers', () => {
  it('toggle adds and removes items without mutating', () => {
    const list = ['a'];
    expect(toggle(list, 'b')).toEqual(['a', 'b']);
    expect(toggle(list, 'a')).toEqual([]);
    expect(list).toEqual(['a']);
  });

  it('counts active filter groups', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(
      activeFilterCount({ products: ['eggs', 'beef'], maxKm: 25, when: 'now', tags: ['organic'], types: [] }),
    ).toBe(4);
    expect(activeFilterCount(makeFilters({ types: ['farm'] }))).toBe(1);
    expect(activeFilterCount(makeFilters({ when: 'weekend' }))).toBe(1);
    expect(
      activeFilterCount({ products: ['eggs'], maxKm: 25, when: 'weekend', tags: ['organic'], types: ['farm_shop'] }),
    ).toBe(5);
  });
});

describe('offeredOptions', () => {
  const all = ['milk', 'eggs', 'beef', 'honey'] as const;
  const tags = ['free_range', 'organic', 'spray_free'] as const;

  it('offers only products and tags that some place has, in the original order', () => {
    const offered = offeredOptions([near, mid], DEFAULT_FILTERS, all, tags);
    expect(offered.products).toEqual(['eggs', 'beef']);
    expect(offered.tags).toEqual(['free_range', 'organic']);
  });

  it('offers no tags when no place has any', () => {
    const plain = makeFarm({ tags: [] });
    expect(offeredOptions([plain], DEFAULT_FILTERS, all, tags).tags).toEqual([]);
  });

  it('keeps an option that is already selected so it can be turned off', () => {
    const offered = offeredOptions([near], { products: ['milk'], tags: ['spray_free'], types: [] }, all, tags);
    expect(offered.products).toContain('milk');
    expect(offered.tags).toContain('spray_free');
  });

  it('offers nothing for an empty list', () => {
    expect(offeredOptions([], DEFAULT_FILTERS, all, tags)).toEqual({ products: [], tags: [], types: [] });
  });

  it('offers venue types that some place has, in VENUE_TYPES order, plus any selected', () => {
    const market = makeFarm({ id: 'm', type: 'farmers_market' });
    const shop = makeFarm({ id: 's', type: 'farm_shop' });
    expect(offeredOptions([shop, market, near], DEFAULT_FILTERS, all, tags).types).toEqual([
      'farmers_market',
      'farm_shop',
      'farm',
    ]);
    expect(offeredOptions([shop], makeFilters({ types: ['farm_gate_stall'] }), all, tags).types).toEqual([
      'farm_shop',
      'farm_gate_stall',
    ]);
    expect(offeredOptions([shop], DEFAULT_FILTERS, all, tags, ['farm', 'farm_shop']).types).toEqual(['farm_shop']);
  });

  it('offers butchers only when at least one butcher is in the list (or Butchers is selected)', () => {
    const market = makeFarm({ id: 'm', type: 'farmers_market' });
    const butcher = makeFarm({ id: 'b', type: 'butcher' });
    expect(offeredOptions([market, near], DEFAULT_FILTERS, all, tags).types).not.toContain('butcher');
    expect(offeredOptions([butcher, market, near], DEFAULT_FILTERS, all, tags).types).toEqual([
      'farmers_market',
      'farm',
      'butcher',
    ]);
    expect(offeredOptions([market], makeFilters({ types: ['butcher'] }), all, tags).types).toEqual([
      'farmers_market',
      'butcher',
    ]);
  });
});

describe('venueTypeOptions', () => {
  it('without a backend offers exactly the types some place has', () => {
    expect(venueTypeOptions(['farm_shop', 'butcher'], false)).toEqual(['farm_shop', 'butcher']);
    expect(venueTypeOptions([], false)).toEqual([]);
  });

  it('with a backend keeps the four other types and adds Butchers only when one is offered', () => {
    expect(venueTypeOptions([], true)).toEqual(['farmers_market', 'farm_shop', 'farm_gate_stall', 'farm']);
    expect(venueTypeOptions(['farm'], true)).toEqual(['farmers_market', 'farm_shop', 'farm_gate_stall', 'farm']);
    expect(venueTypeOptions(['butcher'], true)).toEqual(['farmers_market', 'farm_shop', 'farm_gate_stall', 'farm', 'butcher']);
  });
});

describe('type and weekend filters', () => {
  const market = makeFarm({ id: 'market', name: 'Market', type: 'farmers_market' });
  const shop = makeFarm({ id: 'shop', name: 'Shop', type: 'farm_shop' });
  const plain = makeFarm({ id: 'farm', name: 'Farm', type: 'farm' });

  it('shows places of ANY selected type', () => {
    const list = [market, shop, plain];
    expect(ids(searchFarms(list, makeFilters({ types: ['farm_shop'] }), SYDNEY, NOW))).toEqual(['shop']);
    expect(ids(searchFarms(list, makeFilters({ types: ['farm_shop', 'farmers_market'] }), SYDNEY, NOW))).toEqual([
      'market',
      'shop',
    ]);
    expect(ids(searchFarms(list, makeFilters({ types: [] }), SYDNEY, NOW))).toHaveLength(3);
  });

  it('filters butchers by type and by the Meat categories like any other place', () => {
    const butcher = makeFarm({
      id: 'butcher',
      name: 'Butcher',
      type: 'butcher',
      products: [
        { category: 'beef', name: 'Beef', inStock: true },
        { category: 'lamb', name: 'Lamb', inStock: true },
      ],
    });
    const list = [market, shop, plain, butcher];
    expect(ids(searchFarms(list, makeFilters({ types: ['butcher'] }), SYDNEY, NOW))).toEqual(['butcher']);
    expect(ids(searchFarms(list, makeFilters({ products: [...MEAT_CATEGORIES] }), SYDNEY, NOW))).toContain('butcher');
    expect(sellsMeat(butcher)).toBe(true);
    expect(matchesQuery(butcher, 'butchers')).toBe(true);
  });

  it('"This weekend" keeps places with weekend times and attaches them', () => {
    // NOW is Saturday 14 Nov 2026, 10:00 am in Sydney.
    const saturday = makeFarm({
      id: 'sat',
      name: 'Saturday market',
      hours: { kind: 'weekly', days: { sat: [['07:00', '12:00']] } },
    });
    const weekday = makeFarm({
      id: 'wed',
      name: 'Wednesday market',
      hours: { kind: 'weekly', days: { wed: [['07:00', '12:00']] } },
    });
    const byAppointment = makeFarm({ id: 'appt', hours: { kind: 'appointment' } });
    const results = searchFarms([saturday, weekday, byAppointment], makeFilters({ when: 'weekend' }), SYDNEY, NOW);
    expect(ids(results)).toEqual(['sat']);
    expect(results[0].weekend).toBe('Sat 7:00 am – 12:00 pm');
  });

  it('leaves weekend unset for other time filters', () => {
    const results = searchFarms([plain], DEFAULT_FILTERS, SYDNEY, NOW);
    expect(results[0].weekend).toBeUndefined();
  });
});

describe('meat', () => {
  it('lists beef, lamb, pork and chicken as meat', () => {
    expect([...MEAT_CATEGORIES].sort()).toEqual(['beef', 'chicken', 'lamb', 'pork']);
  });

  it('sellsMeat needs an in-stock meat product', () => {
    expect(sellsMeat({ products: [{ category: 'lamb', name: 'Lamb', inStock: true }] })).toBe(true);
    expect(sellsMeat({ products: [{ category: 'pork', name: 'Pork', inStock: false }] })).toBe(false);
    expect(sellsMeat({ products: [{ category: 'eggs', name: 'Eggs', inStock: true }] })).toBe(false);
    expect(sellsMeat({ products: [] })).toBe(false);
  });

  it('filtering by all meat categories is still "any of"', () => {
    const results = searchFarms(farms, makeFilters({ products: [...MEAT_CATEGORIES] }), SYDNEY, NOW);
    expect(ids(results)).toEqual(['mid']);
  });
});

describe('category and type lists', () => {
  it('display order starts with fruit and veg and covers every category once', () => {
    expect(PRODUCT_DISPLAY_ORDER.slice(0, 4)).toEqual(['fruit', 'veg', 'eggs', 'honey']);
    expect([...PRODUCT_DISPLAY_ORDER].sort()).toEqual([...PRODUCT_CATEGORIES].sort());
  });

  it('venue types start with markets and end with butchers', () => {
    expect(VENUE_TYPES).toEqual(['farmers_market', 'farm_shop', 'farm_gate_stall', 'farm', 'butcher']);
  });

  it('every venue type has a singular and plural label and appears once in VENUE_TYPES', () => {
    expect([...VENUE_TYPES].sort()).toEqual(Object.keys(VENUE_LABELS).sort());
    expect(Object.keys(VENUE_PLURAL_LABELS).sort()).toEqual(Object.keys(VENUE_LABELS).sort());
    expect(VENUE_LABELS.butcher).toBe('Butcher');
    expect(VENUE_PLURAL_LABELS.butcher).toBe('Butchers');
  });
});

describe('search text', () => {
  const bilpin = makeFarm({
    id: 'bilpin',
    name: "Bilpin Farmers' Market",
    type: 'farmers_market',
    locality: 'Bilpin',
    state: 'NSW',
    postcode: '2758',
    story: 'Growers from the Blue Mountains.',
    products: [
      { category: 'honey', name: 'Honey', inStock: true },
      { category: 'veg', name: 'Vegetables', inStock: true },
      { category: 'milk', name: 'Milk', inStock: false },
    ],
    tags: ['spray_free'],
  });
  const toowoomba = makeFarm({
    id: 'twb',
    name: 'Darling Downs Café Farm',
    type: 'farm_shop',
    locality: 'Toowoomba',
    state: 'QLD',
    postcode: '4350',
    story: 'Stone fruit.',
    products: [{ category: 'fruit', name: 'Peaches', inStock: true }],
    otherProducts: 'Also jams and preserves.',
  });
  const bermi = makeFarm({
    id: 'bermi',
    name: 'Bermagui Growers and Makers Market',
    story: 'Known locally as Bermi Market.',
  });

  it('normalises accents, case, apostrophes and spacing', () => {
    expect(normaliseText("  Farmers’  MARKET Café ")).toBe('farmers market cafe');
    expect(normaliseText("Farmers' Market")).toBe('farmers market');
  });

  it.each([
    ['bilpin', 'bilpin'],
    ['farmers market', 'bilpin'],
    ['queensland', 'twb'],
    ['QLD', 'twb'],
    ['4350', 'twb'],
    ['veg', 'bilpin'],
    ['honey bilpin', 'bilpin'],
    ['café', 'twb'],
    ['cafe', 'twb'],
    ['jams', 'twb'],
    ['spray-free', 'bilpin'],
    ['farm shops', 'twb'],
    ['blue mountains', 'bilpin'],
    ['bermi', 'bermi'],
  ])('"%s" finds %s', (query, id) => {
    const found = [bilpin, toowoomba, bermi].filter((f) => matchesQuery(f, query)).map((f) => f.id);
    expect(found).toEqual([id]);
  });

  it('ANDs words and ignores out-of-stock products', () => {
    expect(matchesQuery(bilpin, 'honey toowoomba')).toBe(false);
    expect(matchesQuery(bilpin, 'milk')).toBe(false);
  });

  it('matches everything for a blank query', () => {
    expect(matchesQuery(bilpin, '')).toBe(true);
    expect(matchesQuery(bilpin, '   ')).toBe(true);
  });

  describe('state codes', () => {
    const states = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'] as const;
    const byState = states.map((state) =>
      makeFarm({ id: state.toLowerCase(), name: `${state} Place`, state, story: 'Fresh produce.' }),
    );
    // Text containing 'wa' (Wales), 'sa' (sausages, Saturday), 'nt' (plant) and 'tas' (taste), and 'act' (factory).
    const tricky = makeFarm({
      id: 'tricky',
      name: 'Plant Factory Farm',
      state: 'NSW',
      story: 'Taste our sausages every Saturday in New South Wales.',
    });
    const all = [...byState, tricky];

    it.each(['WA', 'SA', 'NT', 'TAS', 'ACT', 'wa', 'Sa', 'nt', 'Tas', 'act'])('"%s" matches only that state', (query) => {
      const found = all.filter((f) => matchesQuery(f, query));
      expect(found.map((f) => f.state)).toEqual([query.toUpperCase()]);
    });

    it('still finds QLD by code and by name', () => {
      expect(all.filter((f) => matchesQuery(f, 'QLD')).map((f) => f.id)).toEqual(['qld']);
      expect(matchesQuery(toowoomba, 'queensland')).toBe(true);
      expect(matchesQuery(toowoomba, 'QLD')).toBe(true);
    });

    it('still matches the other words in the text', () => {
      expect(matchesQuery(tricky, 'sausages')).toBe(true);
      expect(matchesQuery(tricky, 'wales')).toBe(true);
      expect(matchesQuery(tricky, 'new south wales nsw')).toBe(true);
    });
  });

  describe('produce words', () => {
    const lambOnly = makeFarm({
      id: 'lamb',
      name: 'Hill Farm',
      story: 'Family farm.',
      products: [{ category: 'lamb', name: 'Lamb', inStock: true }],
    });
    const beefOnly = makeFarm({
      id: 'beef',
      name: 'Creek Farm',
      story: 'Family farm.',
      products: [{ category: 'beef', name: 'Beef', inStock: true }],
    });
    const outOfStock = (f: typeof lambOnly) => ({
      ...f,
      products: f.products.map((p) => ({ ...p, inStock: false })),
    });

    it('"meat" finds every place selling beef, lamb, pork or chicken', () => {
      for (const f of [mid, lambOnly, beefOnly]) {
        expect(sellsMeat(f)).toBe(true);
        expect(matchesQuery(f, 'meat')).toBe(true);
      }
      expect(matchesQuery(beefOnly, 'steak')).toBe(true);
      expect(matchesQuery(lambOnly, 'meats')).toBe(true);
    });

    it('"meat" does not match when the only meat is out of stock and the text has no meat word', () => {
      expect(matchesQuery(outOfStock(lambOnly), 'meat')).toBe(false);
      expect(matchesQuery(outOfStock(beefOnly), 'steak')).toBe(false);
      expect(matchesQuery(near, 'meat')).toBe(false);
    });

    it('"vegies" and "veggies" find in-stock veg only', () => {
      expect(matchesQuery(bilpin, 'vegies')).toBe(true);
      expect(matchesQuery(bilpin, 'veggies')).toBe(true);
      const noVeg = { ...bilpin, products: bilpin.products.map((p) => ({ ...p, inStock: false })) };
      expect(matchesQuery(noVeg, 'vegies')).toBe(false);
      expect(matchesQuery(noVeg, 'veggies')).toBe(false);
      expect(matchesQuery(bilpin, 'dairy')).toBe(false);
    });

    it('"meat" matches every bundled place that sells meat', () => {
      const sellers = REAL_FARMS.filter(sellsMeat);
      expect(sellers.length).toBeGreaterThan(0);
      expect(sellers.filter((f) => !matchesQuery(f, 'meat')).map((f) => f.name)).toEqual([]);
    });
  });
});
