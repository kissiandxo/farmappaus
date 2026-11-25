import { MARKET_CALENDARS } from '../../data/marketCalendars';
import { REAL_FARMS } from '../../data/realFarms';
import { DEFAULT_FILTERS, searchFarms } from '../filters';
import { nextMarketDate, publishedDateLabel, publishedWeekend } from '../marketDates';

const bream = MARKET_CALENDARS['real-tas-bream-creek-farmers-market']!;
const bellingen = MARKET_CALENDARS['real-nsw-bellingen-growers-market']!;
const perthMarket = 'real-wa-mundaring-garden-and-farmers-market';
const origin = { lat: -33, lng: 151 };

it('keeps source-linked, ordered dates for real places in the shipped directory', () => {
  for (const [id, calendar] of Object.entries(MARKET_CALENDARS)) {
    expect(REAL_FARMS.find(farm => farm.id === id)?.type).toBe('farmers_market');
    expect(calendar!.source).toMatch(/^https:\/\//);
    expect(calendar!.dates).toEqual([...new Set(calendar!.dates)].sort());
    for (const date of calendar!.dates) expect(new Date(date).toISOString().slice(0, 10)).toBe(date);
  }
});

it('uses venue-local closing times for Open now and This weekend', () => {
  const now = new Date('2026-11-28T01:30:00Z');
  for (const when of ['now', 'weekend'] as const) {
    const ids = searchFarms(REAL_FARMS, { ...DEFAULT_FILTERS, when }, origin, now).map(result => result.farm.id);
    expect(ids).toContain(perthMarket);
    expect(ids).not.toContain('real-nsw-bellingen-growers-market');
  }
});

it('includes a special Sunday until closing, then leaves the organiser link as the source', () => {
  const morning = new Date('2026-12-05T23:00:00Z');
  const close = new Date('2026-12-06T02:00:00Z');
  expect(nextMarketDate(bream, morning, 'Australia/Hobart')).toBe('2026-12-06');
  expect(publishedWeekend(bream, morning, 'Australia/Hobart')).toBe('Sun 9:00 am – 1:00 pm');
  expect(publishedWeekend(bream, close, 'Australia/Hobart')).toBeNull();
  expect(nextMarketDate(bream, close, 'Australia/Hobart')).toBeUndefined();
  expect(bream.specials?.['2026-12-06']).toBe('Christmas Special Market');
  expect(publishedDateLabel('2026-12-06')).toMatch(/Sun.*6 Dec.*2026/);
});

it('skips the unpublished third Saturday and dates beyond the published calendar', () => {
  const thursday = new Date('2026-12-17T02:00:00Z');
  expect(publishedWeekend(bellingen, thursday, 'Australia/Sydney')).toBeNull();
  expect(nextMarketDate(bellingen, thursday, 'Australia/Sydney')).toBe('2026-12-26');
  expect(nextMarketDate(bellingen, new Date('2027-06-30T00:00:00Z'), 'Australia/Sydney')).toBeUndefined();
});
