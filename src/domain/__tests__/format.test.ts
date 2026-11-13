import { formatAud, formatPrice } from '../format';

describe('formatAud', () => {
  it('formats cents as dollars', () => {
    expect(formatAud(550)).toBe('$5.50');
    expect(formatAud(5)).toBe('$0.05');
    expect(formatAud(0)).toBe('$0.00');
  });

  it('adds thousands separators', () => {
    expect(formatAud(123456789)).toBe('$1,234,567.89');
  });

  it('handles negatives', () => {
    expect(formatAud(-250)).toBe('-$2.50');
  });
});

describe('formatPrice', () => {
  it('appends the unit when given', () => {
    expect(formatPrice(800, 'dozen')).toBe('$8.00 / dozen');
  });

  it('omits the unit when absent', () => {
    expect(formatPrice(800)).toBe('$8.00');
  });
});
