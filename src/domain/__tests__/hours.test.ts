import {
  formatMinutes,
  hoursLines,
  localDayAndMinutes,
  openStatus,
  parseMinutes,
  timezoneForState,
} from '../hours';
import type { OpeningHours } from '../types';

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
  });

  it('treats the closing minute as closed', () => {
    expect(openStatus(hours, SYDNEY, satAtSydney('13:00')).isOpen).toBe(false);
  });

  it('says when it opens later today', () => {
    expect(openStatus(hours, SYDNEY, satAtSydney('06:00')).label).toBe('Closed · opens 8:00 am');
  });

  it('names the next open day', () => {
    expect(openStatus(hours, SYDNEY, satAtSydney('14:00')).label).toBe('Closed · opens Wed 9:00 am');
  });

  it('says "tomorrow" when the next opening is the next day', () => {
    const friday4pm = new Date('2026-11-13T05:00:00Z'); // Fri 16:00 Sydney
    expect(openStatus(hours, SYDNEY, friday4pm).label).toBe('Closed · opens tomorrow 8:00 am');
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
