import { licenceBadge, validateListing } from '../compliance';
import type { Licence } from '../types';
import { makeFarm } from './fixtures';

const NOW = new Date('2026-11-13T00:00:00Z');

const licence = (overrides: Partial<Licence> = {}): Licence => ({
  category: 'meat',
  regulator: 'Test Regulator',
  licenceNumber: 'T-1',
  status: 'self_declared',
  ...overrides,
});

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe('validateListing', () => {
  it('needs no licence for honey, fruit or vegetables', () => {
    const farm = makeFarm({
      products: [
        { category: 'honey', name: 'Honey', inStock: true },
        { category: 'fruit', name: 'Apples', inStock: true },
        { category: 'veg', name: 'Carrots', inStock: true },
      ],
    });
    expect(validateListing(farm, NOW)).toEqual([]);
  });

  it('blocks milk that is not declared pasteurised', () => {
    const farm = makeFarm({
      products: [{ category: 'milk', name: 'Milk', inStock: true }],
      licences: [licence({ category: 'dairy' })],
    });
    expect(codes(validateListing(farm, NOW))).toEqual(['raw_milk_not_allowed']);
  });

  it('accepts pasteurised milk with a dairy licence', () => {
    const farm = makeFarm({
      products: [{ category: 'milk', name: 'Milk', inStock: true, pasteurised: true }],
      licences: [licence({ category: 'dairy' })],
    });
    expect(validateListing(farm, NOW)).toEqual([]);
  });

  it.each([
    ['eggs', 'eggs'],
    ['chicken', 'poultry'],
    ['beef', 'meat'],
    ['lamb', 'meat'],
    ['pork', 'meat'],
  ] as const)('requires a %s licence category of "%s"', (product, category) => {
    const farm = makeFarm({ products: [{ category: product, name: product, inStock: true }] });
    expect(validateListing(farm, NOW)).toEqual([
      expect.objectContaining({ code: 'licence_missing', category }),
    ]);
  });

  it('asks only once when several meats need the same licence', () => {
    const farm = makeFarm({
      products: [
        { category: 'beef', name: 'Beef', inStock: true },
        { category: 'lamb', name: 'Lamb', inStock: true },
      ],
    });
    expect(codes(validateListing(farm, NOW))).toEqual(['licence_missing']);
  });

  it('flags licences that have expired', () => {
    const farm = makeFarm({
      products: [{ category: 'beef', name: 'Beef', inStock: true }],
      licences: [licence({ expiresOn: '2026-11-12' })],
    });
    expect(codes(validateListing(farm, NOW))).toEqual(['licence_expired']);
  });

  it('accepts a licence that has not expired, or has no expiry', () => {
    const products = [{ category: 'beef' as const, name: 'Beef', inStock: true }];
    expect(validateListing(makeFarm({ products, licences: [licence({ expiresOn: '2026-11-13' })] }), NOW)).toEqual([]);
    expect(validateListing(makeFarm({ products, licences: [licence()] }), NOW)).toEqual([]);
  });
});

describe('licenceBadge', () => {
  it('is "none" with no licences', () => {
    expect(licenceBadge(makeFarm())).toBe('none');
  });

  it('is "declared" when any licence is self-declared', () => {
    const farm = makeFarm({ licences: [licence({ status: 'admin_checked' }), licence()] });
    expect(licenceBadge(farm)).toBe('declared');
  });

  it('is "checked" only when every licence is admin-checked', () => {
    const farm = makeFarm({ licences: [licence({ status: 'admin_checked' })] });
    expect(licenceBadge(farm)).toBe('checked');
  });
});
