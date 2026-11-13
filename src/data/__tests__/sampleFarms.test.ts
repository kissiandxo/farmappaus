import { validateListing } from '../../domain/compliance';
import { parseMinutes } from '../../domain/hours';
import { PRODUCT_CATEGORIES, type StateCode } from '../../domain/types';
import { SAMPLE_FARMS } from '../sampleFarms';

const NOW = new Date('2026-11-13T00:00:00Z');
const ALL_STATES: StateCode[] = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

describe('sample data', () => {
  it('is clearly labelled as sample data', () => {
    for (const farm of SAMPLE_FARMS) {
      expect(farm.isSample).toBe(true);
      expect(farm.name.startsWith('Sample ')).toBe(true);
      expect(farm.story.startsWith('SAMPLE LISTING')).toBe(true);
      expect(farm.licences.every((l) => l.licenceNumber.startsWith('SAMPLE-'))).toBe(true);
      expect([undefined, '0400 000 000']).toContain(farm.phone);
    }
  });

  it('has unique ids', () => {
    const ids = SAMPLE_FARMS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every state and territory and every product category', () => {
    expect(new Set(SAMPLE_FARMS.map((f) => f.state))).toEqual(new Set(ALL_STATES));
    const categories = new Set(SAMPLE_FARMS.flatMap((f) => f.products.map((p) => p.category)));
    expect(categories).toEqual(new Set(PRODUCT_CATEGORIES));
  });

  it('keeps coordinates inside Australia', () => {
    for (const farm of SAMPLE_FARMS) {
      expect(farm.lat).toBeLessThan(-9);
      expect(farm.lat).toBeGreaterThan(-44);
      expect(farm.lng).toBeGreaterThan(112);
      expect(farm.lng).toBeLessThan(154);
    }
  });

  it('passes the licence rules', () => {
    for (const farm of SAMPLE_FARMS) {
      expect({ id: farm.id, issues: validateListing(farm, NOW) }).toEqual({ id: farm.id, issues: [] });
    }
  });

  it('has valid opening hours', () => {
    for (const farm of SAMPLE_FARMS) {
      if (farm.hours.kind !== 'weekly') continue;
      for (const ranges of Object.values(farm.hours.days)) {
        for (const [open, close] of ranges ?? []) {
          expect(parseMinutes(open)).toBeLessThan(parseMinutes(close));
        }
      }
    }
  });
});
