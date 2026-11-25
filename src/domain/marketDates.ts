import { MARKET_CALENDARS, type MarketCalendar } from '../data/marketCalendars';
import { formatMinutes, formatRanges, openStatus, parseMinutes, type OpenStatus } from './hours';
import type { Farm } from './types';

const clocks = new Map<string, Intl.DateTimeFormat>();

/** Compare civil dates/times at the venue, even when the phone is in a different country. */
function localClock(now: Date, timeZone: string) {
  let clock = clocks.get(timeZone);
  if (!clock) {
    clock = new Intl.DateTimeFormat('en-AU', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    clocks.set(timeZone, clock);
  }
  const value = Object.fromEntries(clock.formatToParts(now).map(part => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, time: `${value.hour}:${value.minute}` };
}

export function nextMarketDate(calendar: MarketCalendar, now: Date, zone: string): string | undefined {
  const local = localClock(now, zone);
  return calendar.dates.find(date => date > local.date || (date === local.date && local.time < calendar.closes));
}

export function publishedDateLabel(date: string): string {
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(date + 'T12:00:00Z'));
}

export function marketTimeLabel(calendar: MarketCalendar): string {
  return formatRanges([[calendar.opens, calendar.closes]]);
}

export function placeOpenStatus(farm: Pick<Farm, 'id' | 'hours'>, now: Date, zone: string): OpenStatus {
  const calendar = MARKET_CALENDARS[farm.id];
  if (calendar) {
    const local = localClock(now, zone);
    if (calendar.dates.includes(local.date)) {
      if (local.time < calendar.opens) return {
        kind: 'closed', isOpen: false, opensToday: true, label: `Opens today ${formatMinutes(parseMinutes(calendar.opens))}`,
      };
      if (local.time < calendar.closes) return {
        kind: 'open', isOpen: true, label: `Open now · closes ${formatMinutes(parseMinutes(calendar.closes))}`,
      };
      return { kind: 'closed', isOpen: false, label: 'Closed for today' };
    }
  }
  return openStatus(farm.hours, zone, now);
}

export function publishedWeekend(calendar: MarketCalendar, now: Date, zone: string): string | null {
  const local = localClock(now, zone);
  // UTC arithmetic on a local calendar date keeps DST shifts out of the day calculation.
  const day = new Date(local.date + 'T12:00:00Z');
  const dayOfWeek = day.getUTCDay();
  const daysToSaturday = (6 - dayOfWeek + 7) % 7;
  const offset = dayOfWeek === 0 ? 0 : daysToSaturday;
  day.setUTCDate(day.getUTCDate() + offset);
  const start = day.toISOString().slice(0, 10);
  if (dayOfWeek !== 0) day.setUTCDate(day.getUTCDate() + 1);
  const end = day.toISOString().slice(0, 10);
  const dates = calendar.dates.filter(date => date >= start && date <= end && (date !== local.date || local.time < calendar.closes));
  if (!dates.length) return null;
  return dates.map(date => `${new Date(date + 'T12:00:00Z').getUTCDay() === 6 ? 'Sat' : 'Sun'} ${marketTimeLabel(calendar)}`).join(' · ');
}
