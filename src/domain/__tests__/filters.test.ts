import { activeFilterCount, DEFAULT_FILTERS, searchFarms, toggle } from '../filters';
import { makeFarm } from './fixtures';

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
    expect(ids(searchFarms(farms, { ...DEFAULT_FILTERS, openNow: true }, SYDNEY, NOW))).toEqual([
      'near',
      'far',
    ]);
  });

  it('combines filters', () => {
    const results = searchFarms(
      farms,
      { products: ['honey'], maxKm: 1000, openNow: true, tags: ['organic'] },
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
    expect(activeFilterCount({ products: ['eggs', 'beef'], maxKm: 25, openNow: true, tags: ['organic'] })).toBe(4);
  });
});
