import {
  copyDayTo,
  copyToWeekdays,
  normaliseRange,
  setDayRange,
  stepTime,
  formatMinutes,
  hoursLines,
  hoursSummary,
  weekendSummary,
  localDayAndMinutes,
  openStatus,
  parseMinutes,
  timezoneForState,
} from '../hours';
import type { OpeningHours, TimeRange } from '../types';

describe('hours editing helpers', () => {
  it('steps times by 30 minutes and stays inside the day', () => {
    expect(stepTime('09:00', 30)).toBe('09:30');
    expect(stepTime('09:00', -30)).toBe('08:30');
    expect(stepTime('00:00', -30)).toBe('00:00');
    expect(stepTime('23:30', 30)).toBe('23:30');
  });

  it('keeps closing time after opening time', () => {
    expect(normaliseRange(['09:00', '17:00'])).toEqual(['09:00', '17:00']);
    expect(normaliseRange(['10:00', '09:00'])).toEqual(['10:00', '10:30']);
    expect(normaliseRange(['10:00', '10:00'])).toEqual(['10:00', '10:30']);
    expect(normaliseRange(['23:30', '23:30'])).toEqual(['23:00', '23:30']);
  });

  it('sets and clears one day without touching the others', () => {
    const days = { mon: [['09:00', '17:00']] } as const;
    const withSat = setDayRange({ ...days } as never, 'sat', ['08:00', '12:00']);
    expect(withSat).toEqual({ mon: [['09:00', '17:00']], sat: [['08:00', '12:00']] });
    expect(setDayRange(withSat, 'mon', null)).toEqual({ sat: [['08:00', '12:00']] });
    expect(days).toEqual({ mon: [['09:00', '17:00']] }); // original untouched
  });

  it('copies one day onto others, or clears them when the source is closed', () => {
    const days = { mon: [['09:00', '17:00']], wed: [['10:00', '11:00']] } as never;
    expect(copyDayTo(days, 'mon', ['tue', 'wed'])).toEqual({
      mon: [['09:00', '17:00']],
      tue: [['09:00', '17:00']],
      wed: [['09:00', '17:00']],
    });
    expect(copyDayTo(days, 'thu', ['wed'])).toEqual({ mon: [['09:00', '17:00']] });
  });

  it('copies the first open weekday across Monday to Friday', () => {
    const result = copyToWeekdays({ tue: [['08:00', '16:00']], sat: [['09:00', '12:00']] } as never);
    expect(Object.keys(result).sort()).toEqual(['fri', 'mon', 'sat', 'thu', 'tue', 'wed']);
    expect(result.fri).toEqual([['08:00', '16:00']]);
    expect(result.sat).toEqual([['09:00', '12:00']]);
    expect(copyToWeekdays({ sat: [['09:00', '12:00']] } as never)).toEqual({ sat: [['09:00', '12:00']] });
  });
});

describe('hoursLines', () => {
  it('lists Monday to Sunday with closed days', () => {
    const lines = hoursLines({
      kind: 'weekly',
      days: { wed: [['09:00', '17:00']], sat: [['08:00', '12:00'], ['14:00', '16:30']] },
    });
    expect(lines.map((l) => l.label)).toEqual([
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    ]);
    expect(lines[0]).toMatchObject({ day: 'mon', text: 'Closed' });
    expect(lines[2].text).toBe('9:00 am – 5:00 pm');
    expect(lines[5].text).toBe('8:00 am – 12:00 pm, 2:00 pm – 4:30 pm');
  });

  it('summarises always-open and by-appointment listings in one row', () => {
    expect(hoursLines({ kind: 'always' })).toEqual([{ label: 'Every day', text: 'Open any time' }]);
    expect(hoursLines({ kind: 'appointment' })).toEqual([{ label: 'Visits', text: 'By appointment' }]);
  });
});

const SYDNEY = 'Australia/Sydney';

/** Wed 09:00-17:00, Sat 08:00-13:00 (local time). */
const hours: OpeningHours = {
  kind: 'weekly',
  days: { wed: [['09:00', '17:00']], sat: [['08:00', '13:00']] },
};

// 2026-11-14 is a Saturday. Sydney is on daylight saving (UTC+11) in November.
const satAtSydney = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(2026, 10, 13, h - 11 + 24, m)); // Fri UTC -> Sat local
};

describe('time helpers', () => {
  it('parses and formats times', () => {
    expect(parseMinutes('16:30')).toBe(990);
    expect(formatMinutes(990)).toBe('4:30 pm');
    expect(formatMinutes(0)).toBe('12:00 am');
    expect(formatMinutes(12 * 60)).toBe('12:00 pm');
  });

  it('works out local day and time in each time zone', () => {
    const instant = new Date('2026-11-13T23:00:00Z');
    expect(localDayAndMinutes(instant, 'Australia/Sydney')).toEqual({ day: 'sat', minutes: 10 * 60 });
    expect(localDayAndMinutes(instant, 'Australia/Brisbane')).toEqual({ day: 'sat', minutes: 9 * 60 });
    expect(localDayAndMinutes(instant, 'Australia/Perth')).toEqual({ day: 'sat', minutes: 7 * 60 });
  });

  it('maps every state to a time zone', () => {
    expect(timezoneForState('QLD')).toBe('Australia/Brisbane');
    expect(timezoneForState('ACT')).toBe('Australia/Sydney');
    expect(timezoneForState('NT')).toBe('Australia/Darwin');
  });
});

describe('openStatus', () => {
  it('is open inside a range and says when it closes', () => {
    const status = openStatus(hours, SYDNEY, satAtSydney('10:00'));
    expect(status).toEqual({ isOpen: true, kind: 'open', label: 'Open now · closes 1:00 pm' });
    expect(status.opensToday).toBeUndefined();
  });

  it('treats the closing minute as closed', () => {
    expect(openStatus(hours, SYDNEY, satAtSydney('13:00')).isOpen).toBe(false);
  });

  it('says when it opens later today', () => {
    const status = openStatus(hours, SYDNEY, satAtSydney('06:00'));
    expect(status).toEqual({ isOpen: false, kind: 'closed', label: 'Opens today 8:00 am', opensToday: true });
  });

  it('names the next open day', () => {
    const status = openStatus(hours, SYDNEY, satAtSydney('14:00'));
    expect(status.label).toBe('Opens Wed 9:00 am');
    expect(status.opensToday).toBeUndefined();
  });

  it('says "tomorrow" when the next opening is the next day', () => {
    const friday4pm = new Date('2026-11-13T05:00:00Z'); // Fri 16:00 Sydney
    const status = openStatus(hours, SYDNEY, friday4pm);
    expect(status.label).toBe('Opens tomorrow 8:00 am');
    expect(status.opensToday).toBeUndefined();
  });

  it('uses the farm time zone, not the phone time zone', () => {
    const instant = new Date('2026-11-13T23:00:00Z'); // Sat 10:00 Sydney, 09:00 Brisbane
    const satLate: OpeningHours = { kind: 'weekly', days: { sat: [['09:30', '12:00']] } };
    expect(openStatus(satLate, 'Australia/Sydney', instant).isOpen).toBe(true);
    expect(openStatus(satLate, 'Australia/Brisbane', instant).isOpen).toBe(false);
  });

  it('handles always-open and by-appointment listings', () => {
    const now = new Date();
    expect(openStatus({ kind: 'always' }, SYDNEY, now)).toMatchObject({ isOpen: true, kind: 'always' });
    expect(openStatus({ kind: 'appointment' }, SYDNEY, now)).toMatchObject({
      isOpen: false,
      kind: 'appointment',
    });
  });

  it('reports plain "Closed" when there are no hours at all', () => {
    expect(openStatus({ kind: 'weekly', days: {} }, SYDNEY, new Date()).label).toBe('Closed');
  });
});

describe('irregular weekly hours (monthly, seasonal or unpublished times)', () => {
  const monthlySaturday: OpeningHours = {
    kind: 'weekly',
    days: { sat: [['08:30', '12:00']] },
    note: 'Second Saturday of each month only.',
    irregular: true,
  };
  // Saturday 14 Nov 2026, 10:00 in Sydney (UTC+11): inside the listed range.
  const saturdayMorning = new Date('2026-11-13T23:00:00Z');

  it('never says "Open now" or "opens ..." for a monthly market', () => {
    const status = openStatus(monthlySaturday, 'Australia/Sydney', saturdayMorning);
    expect(status).toEqual({ isOpen: false, kind: 'irregular', label: 'Check dates' });
    expect(openStatus(monthlySaturday, 'Australia/Sydney', new Date('2026-11-17T01:00:00Z')).label).toBe('Check dates');
  });

  it('still says "Open now" for the same times when the hours are plainly weekly', () => {
    const weekly: OpeningHours = { kind: 'weekly', days: monthlySaturday.kind === 'weekly' ? monthlySaturday.days : {} };
    expect(openStatus(weekly, 'Australia/Sydney', saturdayMorning).kind).toBe('open');
  });

  it('shows "Times: Not published" when an irregular listing has no times', () => {
    const lines = hoursLines({ kind: 'weekly', days: {}, irregular: true, note: 'Open Friday to Sunday.' });
    expect(lines).toEqual([{ label: 'Times', text: 'Not published' }]);
  });

  it('keeps the day rows when an irregular listing has some times', () => {
    expect(hoursLines(monthlySaturday)).toHaveLength(7);
  });
});

describe('weekendSummary', () => {
  const market: OpeningHours = {
    kind: 'weekly',
    days: { wed: [['09:00', '17:00']], sat: [['07:00', '11:30']], sun: [['08:00', '12:00']] },
  };

  it('gives the coming weekend from a weekday (Friday 11 pm in Sydney)', () => {
    const friday11pm = new Date('2026-11-13T12:00:00Z'); // Fri 23:00 AEDT
    expect(weekendSummary(market, 'Australia/Sydney', friday11pm)).toBe(
      'Sat 7:00 am – 11:30 am · Sun 8:00 am – 12:00 pm',
    );
  });

  it('uses the place time zone: Saturday 0:30 in Sydney is Friday 9:30 pm in Perth', () => {
    const instant = new Date('2026-11-13T13:30:00Z');
    const lateFriday: OpeningHours = { kind: 'weekly', days: { sat: [['00:00', '00:15']], sun: [['08:00', '12:00']] } };
    // In Sydney the 12:00–12:15 am Saturday slot has ended; in Perth it is still to come.
    expect(weekendSummary(lateFriday, 'Australia/Sydney', instant)).toBe('Sun 8:00 am – 12:00 pm');
    expect(weekendSummary(lateFriday, 'Australia/Perth', instant)).toBe(
      'Sat 12:00 am – 12:15 am · Sun 8:00 am – 12:00 pm',
    );
  });

  it('on Saturday keeps today’s remaining times and Sunday', () => {
    expect(weekendSummary(market, 'Australia/Sydney', satAtSydney('09:00'))).toBe(
      'Sat 7:00 am – 11:30 am · Sun 8:00 am – 12:00 pm',
    );
    expect(weekendSummary(market, 'Australia/Sydney', satAtSydney('12:00'))).toBe('Sun 8:00 am – 12:00 pm');
  });

  it('returns null on Saturday after the last close when Sunday is closed', () => {
    const saturdayOnly: OpeningHours = { kind: 'weekly', days: { sat: [['07:00', '11:30']] } };
    expect(weekendSummary(saturdayOnly, 'Australia/Sydney', satAtSydney('12:00'))).toBeNull();
  });

  it('returns null on Sunday evening', () => {
    const sundayEvening = new Date('2026-11-15T07:00:00Z'); // Sun 18:00 AEDT
    expect(weekendSummary(market, 'Australia/Sydney', sundayEvening)).toBeNull();
  });

  it('handles the October daylight-saving change in NSW against QLD', () => {
    // Sunday 4 Oct 2026: clocks go forward in NSW. 00:30 UTC is 11:30 am in Sydney, 10:30 am in Brisbane.
    const instant = new Date('2026-10-04T00:30:00Z');
    const sundayMorning: OpeningHours = { kind: 'weekly', days: { sun: [['08:00', '11:00']] } };
    expect(weekendSummary(sundayMorning, 'Australia/Sydney', instant)).toBeNull();
    expect(weekendSummary(sundayMorning, 'Australia/Brisbane', instant)).toBe('Sun 8:00 am – 11:00 am');
  });

  it('handles the April daylight-saving change in NSW against QLD', () => {
    // 13:30 UTC on Sat 4 Apr 2026 is 12:30 am Sunday in Sydney (still AEDT) but 11:30 pm Saturday in Brisbane.
    const instant = new Date('2026-04-04T13:30:00Z');
    const nightMarket: OpeningHours = {
      kind: 'weekly',
      days: { sat: [['17:00', '23:45']], sun: [['08:00', '12:00']] },
    };
    expect(weekendSummary(nightMarket, 'Australia/Sydney', instant)).toBe('Sun 8:00 am – 12:00 pm');
    expect(weekendSummary(nightMarket, 'Australia/Brisbane', instant)).toBe(
      'Sat 5:00 pm – 11:45 pm · Sun 8:00 am – 12:00 pm',
    );
  });

  it('is null for irregular, by-appointment and weekday-only hours, and "Open any time" when always open', () => {
    const friday = new Date('2026-11-13T05:00:00Z');
    expect(weekendSummary({ ...market, irregular: true } as OpeningHours, SYDNEY, friday)).toBeNull();
    expect(weekendSummary({ kind: 'appointment' }, SYDNEY, friday)).toBeNull();
    expect(weekendSummary({ kind: 'weekly', days: { wed: [['09:00', '17:00']] } }, SYDNEY, friday)).toBeNull();
    expect(weekendSummary({ kind: 'always' }, SYDNEY, friday)).toBe('Open any time');
  });
});

describe('hoursSummary', () => {
  it('lists a single Saturday market with one "Other days" row', () => {
    expect(hoursSummary({ kind: 'weekly', days: { sat: [['07:00', '11:30']] } })).toEqual([
      { label: 'Saturday', text: '7:00 am – 11:30 am', day: 'sat', days: ['sat'] },
      { label: 'Other days', text: 'Closed', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sun'] },
    ]);
  });

  it('merges Monday to Friday and keeps Saturday and Sunday separate', () => {
    const w: TimeRange[] = [['09:00', '17:00']];
    const lines = hoursSummary({ kind: 'weekly', days: { mon: w, tue: w, wed: w, thu: w, fri: w, sat: [['08:00', '12:00']] } });
    expect(lines).toEqual([
      { label: 'Mon – Fri', text: '9:00 am – 5:00 pm', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
      { label: 'Saturday', text: '8:00 am – 12:00 pm', day: 'sat', days: ['sat'] },
      { label: 'Sunday', text: 'Closed', day: 'sun', days: ['sun'] },
    ]);
  });

  it('says "Every day" when all seven days are the same', () => {
    const r: TimeRange[] = [['08:00', '18:00']];
    expect(hoursSummary({ kind: 'weekly', days: { mon: r, tue: r, wed: r, thu: r, fri: r, sat: r, sun: r } })).toEqual([
      { label: 'Every day', text: '8:00 am – 6:00 pm', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
    ]);
  });

  it('keeps two non-consecutive days as separate rows (Castlemaine shape)', () => {
    const lines = hoursSummary({ kind: 'weekly', days: { wed: [['14:30', '17:30']], sun: [['09:00', '13:00']] } });
    expect(lines.map((l) => [l.label, l.text])).toEqual([
      ['Wednesday', '2:30 pm – 5:30 pm'],
      ['Sunday', '9:00 am – 1:00 pm'],
      ['Other days', 'Closed'],
    ]);
  });

  it('merges two consecutive identical days', () => {
    const r: TimeRange[] = [['08:00', '12:00']];
    expect(hoursSummary({ kind: 'weekly', days: { sat: r, sun: r } })[0]).toMatchObject({
      label: 'Sat – Sun',
      days: ['sat', 'sun'],
    });
  });

  it('merges closed runs when more than two days are open', () => {
    const r: TimeRange[] = [['09:00', '15:00']];
    const lines = hoursSummary({ kind: 'weekly', days: { mon: r, fri: r, sat: [['08:00', '12:00']] } });
    expect(lines.map((l) => [l.label, l.text])).toEqual([
      ['Monday', '9:00 am – 3:00 pm'],
      ['Tue – Thu', 'Closed'],
      ['Friday', '9:00 am – 3:00 pm'],
      ['Saturday', '8:00 am – 12:00 pm'],
      ['Sunday', 'Closed'],
    ]);
  });

  it('shows "Times: Not published" for an irregular listing with no times (Bendigo shape)', () => {
    expect(
      hoursSummary({ kind: 'weekly', days: {}, irregular: true, note: 'Second Saturday of each month.' }),
    ).toEqual([{ label: 'Times', text: 'Not published' }]);
  });

  it('matches hoursLines for always-open and by-appointment places', () => {
    expect(hoursSummary({ kind: 'always' })).toEqual(hoursLines({ kind: 'always' }));
    expect(hoursSummary({ kind: 'appointment' })).toEqual(hoursLines({ kind: 'appointment' }));
  });
});
