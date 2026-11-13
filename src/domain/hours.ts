import type { DayKey, OpeningHours, StateCode } from './types';

const DAYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const DAY_LABELS: Record<DayKey, string> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
};

/** Main time zone per state/territory (Broken Hill and other edge cases ignored in v1). */
const STATE_TIMEZONE: Record<StateCode, string> = {
  NSW: 'Australia/Sydney',
  ACT: 'Australia/Sydney',
  VIC: 'Australia/Melbourne',
  QLD: 'Australia/Brisbane',
  SA: 'Australia/Adelaide',
  WA: 'Australia/Perth',
  TAS: 'Australia/Hobart',
  NT: 'Australia/Darwin',
};

export function timezoneForState(state: StateCode): string {
  return STATE_TIMEZONE[state];
}

export interface OpenStatus {
  isOpen: boolean;
  kind: 'open' | 'closed' | 'always' | 'appointment';
  /** Plain-English summary, e.g. "Open now · closes 4:00 pm". */
  label: string;
}

/** Current weekday and minutes since midnight in the given IANA time zone. */
export function localDayAndMinutes(now: Date, timeZone: string): { day: DayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = get('weekday').slice(0, 3).toLowerCase() as DayKey;
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  return { day, minutes: hour * 60 + minute };
}

export function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** 960 -> "4:00 pm", 0 -> "12:00 am". */
export function formatMinutes(total: number): string {
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const suffix = h24 >= 12 ? 'pm' : 'am';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

const WEEK_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export interface HoursLine {
  label: string;
  text: string;
  /** Set for weekly rows so the current day can be highlighted. */
  day?: DayKey;
}

/** Display rows for an opening-hours table, Monday first. */
export function hoursLines(hours: OpeningHours): HoursLine[] {
  if (hours.kind === 'always') return [{ label: 'Every day', text: 'Open any time' }];
  if (hours.kind === 'appointment') return [{ label: 'Visits', text: 'By appointment' }];
  return WEEK_ORDER.map((day) => {
    const ranges = hours.days[day] ?? [];
    return {
      label: DAY_LABELS[day],
      day,
      text:
        ranges.length === 0
          ? 'Closed'
          : ranges
              .map(([open, close]) => `${formatMinutes(parseMinutes(open))} – ${formatMinutes(parseMinutes(close))}`)
              .join(', '),
    };
  });
}

export function openStatus(hours: OpeningHours, timeZone: string, now: Date): OpenStatus {
  if (hours.kind === 'always') {
    return { isOpen: true, kind: 'always', label: 'Open any time' };
  }
  if (hours.kind === 'appointment') {
    return { isOpen: false, kind: 'appointment', label: 'By appointment' };
  }

  const { day, minutes } = localDayAndMinutes(now, timeZone);
  const todayIndex = DAYS.indexOf(day);

  const todayRanges = hours.days[day] ?? [];
  for (const [start, end] of todayRanges) {
    if (minutes >= parseMinutes(start) && minutes < parseMinutes(end)) {
      return {
        isOpen: true,
        kind: 'open',
        label: `Open now · closes ${formatMinutes(parseMinutes(end))}`,
      };
    }
  }

  for (let offset = 0; offset <= 7; offset++) {
    const dayKey = DAYS[(todayIndex + offset) % 7];
    const starts = (hours.days[dayKey] ?? [])
      .map(([start]) => parseMinutes(start))
      .filter((start) => offset > 0 || start > minutes)
      .sort((a, b) => a - b);
    if (starts.length > 0) {
      const when = formatMinutes(starts[0]);
      const prefix =
        offset === 0 ? '' : offset === 1 ? 'tomorrow ' : `${DAY_LABELS[dayKey].slice(0, 3)} `;
      return { isOpen: false, kind: 'closed', label: `Closed · opens ${prefix}${when}` };
    }
  }

  return { isOpen: false, kind: 'closed', label: 'Closed' };
}
