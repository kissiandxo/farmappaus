import { formatAud, formatDateAu, formatPrice } from '../format';

describe('formatDateAu', () => {
  it('writes dates the Australian way', () => {
    expect(formatDateAu('2026-11-01')).toBe('1 Nov 2026');
    expect(formatDateAu('2030-12-31')).toBe('31 Dec 2030');
  });

  it('leaves anything else alone', () => {
    expect(formatDateAu('soon')).toBe('soon');
    expect(formatDateAu('2026-13-01')).toBe('2026-13-01');
  });
});

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
