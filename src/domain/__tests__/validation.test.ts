import {
  centsToInput,
  draftIssues,
  hasRegulatedProducts,
  isValidAbn,
  normaliseAuPhone,
  priceToCents,
  validateEmail,
  validatePassword,
} from '../validation';
import { makeFarm } from './fixtures';

const NOW = new Date('2026-11-13T00:00:00Z');

describe('validateEmail / validatePassword', () => {
  it('accepts normal addresses and rejects junk', () => {
    expect(validateEmail('sam@example.com.au')).toBeNull();
    expect(validateEmail('  sam@example.com ')).toBeNull();
    expect(validateEmail('')).toMatch(/Enter/);
    expect(validateEmail('sam@')).toMatch(/email/);
    expect(validateEmail('sam example.com')).toMatch(/email/);
  });

  it('wants 8+ characters and not digits only', () => {
    expect(validatePassword('short1')).toMatch(/8/);
    expect(validatePassword('12345678')).toMatch(/letters/);
    expect(validatePassword('paddock-gate-9')).toBeNull();
  });
});

describe('normaliseAuPhone', () => {
  it('formats mobiles and landlines', () => {
    expect(normaliseAuPhone('0412345678')).toBe('0412 345 678');
    expect(normaliseAuPhone('(07) 4123 4567')).toBe('07 4123 4567');
    expect(normaliseAuPhone('02 9999 0000')).toBe('02 9999 0000');
  });

  it('converts +61 and 61 prefixes', () => {
    expect(normaliseAuPhone('+61 412 345 678')).toBe('0412 345 678');
    expect(normaliseAuPhone('61412345678')).toBe('0412 345 678');
  });

  it('rejects the wrong length or area code', () => {
    expect(normaliseAuPhone('12345')).toBeNull();
    expect(normaliseAuPhone('0112345678')).toBeNull();
    expect(normaliseAuPhone('call me')).toBeNull();
    expect(normaliseAuPhone('')).toBeNull();
  });
});

describe('isValidAbn', () => {
  it('accepts a valid ABN, with or without spaces', () => {
    expect(isValidAbn('51 824 753 556')).toBe(true);
    expect(isValidAbn('51824753556')).toBe(true);
  });

  it('rejects bad checksums and wrong lengths', () => {
    expect(isValidAbn('51 824 753 557')).toBe(false);
    expect(isValidAbn('1234567890')).toBe(false);
    expect(isValidAbn('abcdefghijk')).toBe(false);
  });
});

describe('prices', () => {
  it('parses dollars to cents', () => {
    expect(priceToCents('7.50')).toBe(750);
    expect(priceToCents('$7.5')).toBe(750);
    expect(priceToCents('7')).toBe(700);
    expect(priceToCents('1,200.00')).toBe(120000);
  });

  it('rejects negatives, text and extra decimals', () => {
    expect(priceToCents('-1')).toBeNull();
    expect(priceToCents('free')).toBeNull();
    expect(priceToCents('1.999')).toBeNull();
    expect(priceToCents('')).toBeNull();
  });

  it('shows cents as an editable string', () => {
    expect(centsToInput(750)).toBe('7.50');
    expect(centsToInput(undefined)).toBe('');
  });
});

describe('draftIssues', () => {
  const good = () =>
    makeFarm({
      name: 'Sample Paddock',
      story: 'A small family farm selling honey from our own hives.',
      phone: '0412 345 678',
      hours: { kind: 'appointment' },
    });

  it('has no issues for a complete listing', () => {
    expect(draftIssues(good(), NOW)).toEqual([]);
  });

  it('lists what is missing in plain words', () => {
    const issues = draftIssues(
      makeFarm({ name: 'A', story: 'short', products: [], phone: undefined, website: undefined, paymentTypes: [], fulfilment: [] }),
      NOW,
    );
    expect(issues.map((i) => i.field).sort()).toEqual(['contact', 'hours', 'name', 'payment', 'products', 'story']);
  });

  it('needs weekly hours to have at least one open day', () => {
    const farm = { ...good(), hours: { kind: 'weekly' as const, days: {} } };
    expect(draftIssues(farm, NOW).map((i) => i.field)).toContain('hours');
  });

  it('checks the phone number and website', () => {
    expect(draftIssues({ ...good(), phone: '123' }, NOW).map((i) => i.field)).toContain('contact');
    expect(draftIssues({ ...good(), website: 'javascript:alert(1)' }, NOW).map((i) => i.field)).toContain('contact');
  });

  it('includes food-safety problems from the compliance rules', () => {
    const farm = { ...good(), products: [{ category: 'milk' as const, name: 'Milk', inStock: true }] };
    const messages = draftIssues(farm, NOW).map((i) => i.message).join(' ');
    expect(messages).toMatch(/pasteurised/);
    expect(messages).toMatch(/dairy licence/);
  });
});

describe('hasRegulatedProducts', () => {
  it('is true only for milk, eggs and meat', () => {
    expect(hasRegulatedProducts({ products: [{ category: 'eggs', name: 'e', inStock: true }] })).toBe(true);
    expect(hasRegulatedProducts({ products: [{ category: 'honey', name: 'h', inStock: true }] })).toBe(false);
  });
});
