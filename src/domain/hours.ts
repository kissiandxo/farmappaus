import type { DayKey, OpeningHours, StateCode, TimeRange } from './types';

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
  kind: 'open' | 'closed' | 'always' | 'appointment' | 'irregular';
  /** Plain-English summary, e.g. "Open now · closes 4:00 pm" or "Opens today 8:00 am". */
  label: string;
  /** True when the place is closed now but opens later today (the Explore card colours this). */
  opensToday?: boolean;
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

export const WEEK_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

type WeeklyDays = Partial<Record<DayKey, TimeRange[]>>;

export const DEFAULT_RANGE: TimeRange = ['09:00', '17:00'];
const LAST_START = 23 * 60 + 30; // latest allowed closing time is 11:30 pm

const toHhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Moves a "HH:mm" time by whole minutes, staying between 12:00 am and 11:30 pm. */
export function stepTime(hhmm: string, deltaMinutes: number): string {
  return toHhmm(Math.min(LAST_START, Math.max(0, parseMinutes(hhmm) + deltaMinutes)));
}

/** Makes sure a range closes at least 30 minutes after it opens. */
export function normaliseRange([open, close]: TimeRange): TimeRange {
  let o = parseMinutes(open);
  let c = parseMinutes(close);
  if (c <= o) c = o + 30;
  if (c > LAST_START) {
    c = LAST_START;
    o = Math.min(o, c - 30);
  }
  return [toHhmm(o), toHhmm(c)];
}

/** Sets (or, with null, clears) one day's single opening range. Returns a new object. */
export function setDayRange(days: WeeklyDays, day: DayKey, range: TimeRange | null): WeeklyDays {
  const next: WeeklyDays = { ...days };
  if (range === null) delete next[day];
  else next[day] = [normaliseRange(range)];
  return next;
}

/** Copies one day's hours onto other days (clearing them if the source day is closed). */
export function copyDayTo(days: WeeklyDays, from: DayKey, targets: DayKey[]): WeeklyDays {
  const next: WeeklyDays = { ...days };
  for (const day of targets) {
    if (day === from) continue;
    const source = days[from];
    if (source) next[day] = source.map(([o, c]) => [o, c] as TimeRange);
    else delete next[day];
  }
  return next;
}

/** First open weekday (Mon–Fri) to use as the template for "same hours every weekday". */
export function copyToWeekdays(days: WeeklyDays): WeeklyDays {
  const source = WEEKDAYS.find((d) => (days[d]?.length ?? 0) > 0);
  return source ? copyDayTo(days, source, WEEKDAYS) : days;
}

export interface HoursLine {
  label: string;
  text: string;
  /** Set for single-day weekly rows so the current day can be highlighted. */
  day?: DayKey;
  /** The days a (possibly merged) summary row covers, so today can be highlighted on "Mon – Fri". */
  days?: DayKey[];
}

const SHORT_DAY = (day: DayKey) => DAY_LABELS[day].slice(0, 3);

function formatRanges(ranges: readonly TimeRange[]): string {
  return ranges
    .map(([open, close]) => `${formatMinutes(parseMinutes(open))} – ${formatMinutes(parseMinutes(close))}`)
    .join(', ');
}

function runLabel(run: DayKey[]): string {
  if (run.length === 7) return 'Every day';
  if (run.length === 1) return DAY_LABELS[run[0]];
  return `${SHORT_DAY(run[0])} – ${SHORT_DAY(run[run.length - 1])}`;
}

/**
 * Compact opening-hours rows for the place page: consecutive days (Monday first) with the same times are
 * merged ("Mon – Fri", "Sat – Sun", "Every day"). With only one or two open days, those days are listed and
 * the rest become one "Other days · Closed" row. Use `hoursLines` for the full seven-day table.
 */
export function hoursSummary(hours: OpeningHours): HoursLine[] {
  if (hours.kind !== 'weekly') return hoursLines(hours);
  const textFor = (day: DayKey) => {
    const ranges = hours.days[day] ?? [];
    return ranges.length === 0 ? 'Closed' : formatRanges(ranges);
  };
  const openDays = WEEK_ORDER.filter((day) => (hours.days[day] ?? []).length > 0);
  if (openDays.length === 0) return hoursLines(hours);

  // Runs of consecutive days with identical text.
  const runs: { days: DayKey[]; text: string }[] = [];
  for (const day of WEEK_ORDER) {
    const text = textFor(day);
    const last = runs[runs.length - 1];
    if (last && last.text === text) last.days.push(day);
    else runs.push({ days: [day], text });
  }

  const toLine = (run: { days: DayKey[]; text: string }): HoursLine => ({
    label: runLabel(run.days),
    text: run.text,
    days: run.days,
    ...(run.days.length === 1 ? { day: run.days[0] } : {}),
  });

  if (openDays.length <= 2) {
    const closedDays = WEEK_ORDER.filter((day) => !openDays.includes(day));
    const lines = runs.filter((run) => run.text !== 'Closed').map(toLine);
    if (closedDays.length > 0) lines.push({ label: 'Other days', text: 'Closed', days: closedDays });
    return lines;
  }
  return runs.map(toLine);
}

/** Display rows for an opening-hours table, Monday first. */
export function hoursLines(hours: OpeningHours): HoursLine[] {
  if (hours.kind === 'always') return [{ label: 'Every day', text: 'Open any time' }];
  if (hours.kind === 'appointment') return [{ label: 'Visits', text: 'By appointment' }];
  if (hours.irregular && WEEK_ORDER.every((day) => (hours.days[day] ?? []).length === 0)) {
    return [{ label: 'Times', text: 'Not published' }];
  }
  return WEEK_ORDER.map((day) => {
    const ranges = hours.days[day] ?? [];
    return {
      label: DAY_LABELS[day],
      day,
      text: ranges.length === 0 ? 'Closed' : formatRanges(ranges),
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

  // Monthly, seasonal or unpublished times: never claim "Open now" or "opens Saturday".
  if (hours.irregular) {
    return { isOpen: false, kind: 'irregular', label: 'Check dates' };
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
      const dayWord = offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : SHORT_DAY(dayKey);
      return {
        isOpen: false,
        kind: 'closed',
        label: `Opens ${dayWord} ${when}`,
        ...(offset === 0 ? { opensToday: true } : {}),
      };
    }
  }

  return { isOpen: false, kind: 'closed', label: 'Closed' };
}

/**
 * This weekend's opening times in the place's own time zone, e.g.
 * "Sat 7:00 am – 11:30 am · Sun 8:00 am – 12:00 pm". Monday to Friday: the coming Saturday and Sunday.
 * Saturday: today's times that have not ended yet, plus Sunday. Sunday: today's times that have not ended.
 * "Open any time" for always-open places; null for by-appointment, irregular (monthly, seasonal or
 * unpublished) times, or when nothing is left this weekend.
 */
export function weekendSummary(hours: OpeningHours, timeZone: string, now: Date): string | null {
  if (hours.kind === 'always') return 'Open any time';
  if (hours.kind === 'appointment' || hours.irregular) return null;

  const { day, minutes } = localDayAndMinutes(now, timeZone);
  const wanted: DayKey[] = day === 'sun' ? ['sun'] : ['sat', 'sun'];
  const parts: string[] = [];
  for (const d of wanted) {
    let ranges = hours.days[d] ?? [];
    if (d === day) ranges = ranges.filter(([, end]) => parseMinutes(end) > minutes);
    if (ranges.length > 0) parts.push(`${SHORT_DAY(d)} ${formatRanges(ranges)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
