import { ageInDays, describeAge, formatAud, formatDateAu, formatPrice, isStale } from '../format';

describe('listing age', () => {
  const now = new Date('2026-11-13T05:00:00Z');

  it('counts whole days and never goes negative', () => {
    expect(ageInDays('2026-11-13', now)).toBe(0);
    expect(ageInDays('2026-11-12', now)).toBe(1);
    expect(ageInDays('2026-08-15', now)).toBe(90);
    expect(ageInDays('2027-01-01', now)).toBe(0);
    expect(ageInDays('garbage', now)).toBe(0);
  });

  it('flags listings from 90 days on as stale', () => {
    expect(isStale('2026-08-16', now)).toBe(false); // 89 days
    expect(isStale('2026-08-15', now)).toBe(true); // 90 days
  });

  it('describes age in plain words', () => {
    expect(describeAge('2026-11-13', now)).toBe('today');
    expect(describeAge('2026-11-12', now)).toBe('yesterday');
    expect(describeAge('2026-11-01', now)).toBe('12 days ago');
    expect(describeAge('2026-08-15', now)).toBe('3 months ago');
    expect(describeAge('2024-11-13', now)).toBe('2 years ago');
  });
});

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
