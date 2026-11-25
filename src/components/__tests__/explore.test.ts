jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { farmCardLabel, farmCardPropsEqual, showsStaleWarning, type FarmCardProps } from '../FarmCard';
import { explainNoResults, meatChip, MEAT_CHIP_ACCESSIBILITY_LABEL } from '../FilterPanel';
import { countLine, DEFAULT_LOCATION_LINE, filtersLabel } from '../LocationBar';
import { countAnnouncement } from '../useAnnounceCount';
import type { FarmResult } from '../../domain/filters';
import { makeFarm, makeFilters } from '../../domain/__tests__/fixtures';

const NOW = new Date('2026-11-13T02:00:00Z');

function result(overrides: Partial<FarmResult> = {}, farm = makeFarm()): FarmResult {
  return {
    farm,
    distanceKm: 3.42,
    status: { isOpen: true, kind: 'always', label: 'Open now' },
    ...overrides,
  };
}

describe('countAnnouncement', () => {
  it('uses singular and plural', () => {
    expect(countAnnouncement(1)).toBe('1 place');
    expect(countAnnouncement(0)).toBe('0 places');
    expect(countAnnouncement(12)).toBe('12 places');
  });
});

describe('LocationBar copy', () => {
  it('explains the sort order once a location is set', () => {
    expect(countLine(12, '', false)).toBe('12 places · nearest first');
    expect(countLine(1, '  ', false)).toBe('1 place · nearest first');
  });

  it('leaves the Sydney explanation to the second line while the location is the default', () => {
    expect(countLine(87, '', true)).toBe('87 places');
    expect(DEFAULT_LOCATION_LINE).toBe('Nearest to Sydney first · set your location for distances');
  });

  it('says a search covers any distance', () => {
    expect(countLine(3, ' honey ', false)).toBe('3 places match “honey” · any distance');
    expect(countLine(1, 'honey', true)).toBe('1 place matches “honey” · any distance');
  });

  it('labels the Filters capsule with a count only when filters are on', () => {
    expect(filtersLabel(0)).toBe('Filters');
    expect(filtersLabel(2)).toBe('Filters, 2 on');
  });
});

describe('meatChip', () => {
  const all = ['fruit', 'veg', 'beef', 'lamb', 'chicken', 'pork'] as const;

  it('is hidden when no meat is offered', () => {
    expect(meatChip(['fruit', 'veg'], []).visible).toBe(false);
  });

  it('selects every offered meat category, keeping other produce', () => {
    const chip = meatChip(all, ['fruit']);
    expect(chip.visible).toBe(true);
    expect(chip.selected).toBe(false);
    expect(chip.next).toEqual(['fruit', 'beef', 'lamb', 'pork', 'chicken']);
  });

  it('only stands for the meat that is offered', () => {
    const chip = meatChip(['beef', 'eggs'], []);
    expect(chip.next).toEqual(['beef']);
    expect(meatChip(['beef', 'eggs'], ['beef']).selected).toBe(true);
  });

  it('shows selected only when every offered meat is selected, and then clears them', () => {
    expect(meatChip(all, ['beef', 'lamb']).selected).toBe(false);
    expect(meatChip(all, ['beef', 'lamb']).next).toEqual(['beef', 'lamb', 'pork', 'chicken']);
    const chip = meatChip(all, ['beef', 'lamb', 'pork', 'chicken', 'eggs']);
    expect(chip.selected).toBe(true);
    expect(chip.next).toEqual(['eggs']);
  });

  it('has the spoken label the overrides ask for', () => {
    expect(MEAT_CHIP_ACCESSIBILITY_LABEL).toBe('Meat: beef, lamb, pork or chicken');
  });
});

describe('explainNoResults', () => {
  it('puts the search query first, with Clear filters only when other filters are on', () => {
    const plain = explainNoResults(makeFilters({ maxKm: 25 }), 'honey');
    expect(plain.title).toBe('No places match “honey”');
    expect(plain.message).toBe('Check the spelling, or try a town or something to buy.');
    expect(plain.action).toEqual({ label: 'Clear search', fix: 'clearSearch' });
    // Search ignores distance, so a distance limit alone does not offer "Clear filters".
    expect(plain.secondaryAction).toBeUndefined();

    const filtered = explainNoResults(makeFilters({ when: 'now' }), 'honey');
    expect(filtered.secondaryAction).toEqual({ label: 'Clear filters', fix: 'clearFilters' });
  });

  it('then Open now, then This weekend', () => {
    const now = explainNoResults(makeFilters({ when: 'now', maxKm: 10 }), '');
    expect(now.title).toBe('Nothing open right now');
    expect(now.action).toEqual({ label: 'Turn off Open now', fix: 'anyTime' });
    expect(now.message).toContain('within 10 km');

    const weekend = explainNoResults(makeFilters({ when: 'weekend' }), '');
    expect(weekend.title).toBe('Nothing on this weekend');
    expect(weekend.action).toEqual({ label: 'Any time', fix: 'anyTime' });
    expect(weekend.message).not.toContain('km');
  });

  it('then the distance limit, then everything else', () => {
    const near = explainNoResults(makeFilters({ maxKm: 25, products: ['milk'] }), '');
    expect(near.title).toBe('Nothing within 25 km');
    expect(near.action).toEqual({ label: 'Any distance', fix: 'anyDistance' });

    const other = explainNoResults(makeFilters({ products: ['milk'] }), '');
    expect(other.title).toBe('No places match these filters');
    expect(other.action).toEqual({ label: 'Clear filters', fix: 'clearFilters' });
    expect(other.message).not.toContain('km');
  });
});

describe('FarmCard', () => {
  it('shows the stale warning only for owner-managed listings', () => {
    const old = '2025-01-01';
    expect(showsStaleWarning(makeFarm({ isSample: false, updatedOn: old }), NOW)).toBe(true);
    expect(showsStaleWarning(makeFarm({ isSample: true, updatedOn: old }), NOW)).toBe(false);
    expect(showsStaleWarning(makeFarm({ isSample: false, unclaimed: true, updatedOn: old }), NOW)).toBe(false);
    expect(showsStaleWarning(makeFarm({ isSample: false, updatedOn: '2026-11-01' }), NOW)).toBe(false);
  });

  it('builds a full accessibility label', () => {
    const farm = makeFarm({
      name: 'Hill Farm',
      type: 'farm_shop',
      locality: 'Orange',
      state: 'NSW',
      isSample: false,
      unclaimed: true,
      updatedOn: '2025-01-01',
      tags: ['grass_fed'],
      products: (['beef', 'lamb', 'pork', 'chicken', 'eggs', 'honey', 'fruit'] as const).map((category) => ({
        category,
        name: category,
        inStock: true,
      })),
    });
    const label = farmCardLabel(result({ weekend: 'Sat 8:00 am – 12:00 pm' }, farm), { saved: true, now: NOW });
    expect(label).toBe(
      [
        'Hill Farm',
        'Farm shop',
        'Orange, NSW',
        '3.4 km away',
        'Open now',
        'This weekend: Sat 8:00 am – 12:00 pm',
        'Sells Beef, Lamb, Pork, Chicken, Eggs and 2 more',
        'Grass-fed',
        'Saved',
        'Unclaimed listing from public sources',
      ].join('. '),
    );
  });

  it('leaves out the distance from the default location and says "about" when approximate', () => {
    const farm = makeFarm({ locationApprox: true });
    expect(farmCardLabel(result({}, farm), { saved: false, distanceFromDefault: true, now: NOW })).not.toMatch(/km/);
    expect(farmCardLabel(result({}, farm), { saved: false, now: NOW })).toContain('about 3 km away');
  });

  it('adds the irregular hours note, licence and stale warning without doubled full stops', () => {
    const farm = makeFarm({
      isSample: false,
      updatedOn: '2025-01-01',
      hours: { kind: 'weekly', days: {}, irregular: true, note: 'Second Saturday of the month.' },
    });
    const label = farmCardLabel(
      result({ status: { isOpen: false, kind: 'irregular', label: 'Check dates' } }, farm),
      { saved: false, now: NOW },
    );
    expect(label).toContain('Check dates. Sells Honey. Second Saturday of the month. ');
    expect(label).toContain('Not updated for a while. Call ahead to check');
    expect(label).not.toContain('..');
  });

  it('memo comparator ignores new objects with the same content and notices real changes', () => {
    const onPress = jest.fn();
    const base: FarmCardProps = { result: result(), onPress, saved: false };
    expect(farmCardPropsEqual(base, { ...base, result: { ...result() } })).toBe(true);
    expect(farmCardPropsEqual(base, { ...base, saved: true })).toBe(false);
    expect(farmCardPropsEqual(base, { ...base, result: result({ distanceKm: 9 }) })).toBe(false);
    expect(farmCardPropsEqual(base, { ...base, result: result({ weekend: 'Sun' }) })).toBe(false);
    expect(
      farmCardPropsEqual(base, {
        ...base,
        result: result({ status: { isOpen: false, kind: 'closed', label: 'Opens today 9:00 am', opensToday: true } }),
      }),
    ).toBe(false);
    expect(farmCardPropsEqual(base, { ...base, onPress: jest.fn() })).toBe(false);
    expect(farmCardPropsEqual(base, { ...base, distanceFromDefault: true })).toBe(false);
    expect(farmCardPropsEqual(base, { ...base, showUnclaimedBadge: true })).toBe(false);
  });
});
