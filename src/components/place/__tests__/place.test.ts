import { hoursSummary, WEEK_ORDER } from '../../../domain/hours';
import type { OpeningHours, TimeRange } from '../../../domain/types';
import { actionTilesLayout } from '../ActionTiles';
import {
  firstSentence,
  hoursRowLabel,
  IRREGULAR_STATUS_FALLBACK,
  irregularNoteRest,
  irregularStatusLabel,
  lineIsToday,
} from '../HoursSection';

describe('irregularStatusLabel', () => {
  it('uses a short first sentence without its full stop', () => {
    expect(irregularStatusLabel('Second Saturday of the month. Rain, hail or shine.')).toBe('Second Saturday of the month');
  });

  it('falls back when the first sentence is 40 characters or more', () => {
    expect(irregularStatusLabel('Open on selected weekends through the cherry season, check the website first.')).toBe(
      IRREGULAR_STATUS_FALLBACK,
    );
  });

  it('keeps a short date or season pattern', () => {
    expect(irregularStatusLabel('Second Sunday of each month only.')).toBe('Second Sunday of each month only');
    expect(irregularStatusLabel('Saturdays 8am to noon. Dates are confirmed only to 19 December 2026.')).toBe(
      'Saturdays 8am to noon',
    );
  });

  it('falls back when the first sentence is not a date or season pattern', () => {
    expect(irregularStatusLabel('Closed Tuesday and Wednesday. Kitchen last orders 3pm; seasonal October to May.')).toBe(
      IRREGULAR_STATUS_FALLBACK,
    );
  });

  it('falls back when there is no note', () => {
    expect(irregularStatusLabel(undefined)).toBe(IRREGULAR_STATUS_FALLBACK);
    expect(irregularStatusLabel('   ')).toBe(IRREGULAR_STATUS_FALLBACK);
  });
});

describe('irregularNoteRest', () => {
  it('drops the first sentence when the status line already shows it', () => {
    expect(irregularNoteRest('Third Sunday of each month only.')).toBeNull();
    expect(irregularNoteRest('Second Saturday of the month. Rain, hail or shine.')).toBe('Rain, hail or shine.');
  });

  it('keeps the whole note when the status line falls back', () => {
    const note = 'Closed Tuesday and Wednesday. Kitchen last orders 3pm; seasonal October to May.';
    expect(irregularNoteRest(note)).toBe(note);
    expect(irregularNoteRest(undefined)).toBeNull();
  });
});

describe('firstSentence', () => {
  it('keeps a note with no full stop whole', () => {
    expect(firstSentence('Seasonal, December to March')).toBe('Seasonal, December to March');
  });

  it('does not split on a decimal or time', () => {
    expect(firstSentence('Opens 7.30 am. Closed in winter.')).toBe('Opens 7.30 am');
  });
});

describe('hours rows', () => {
  const weekdays: OpeningHours = {
    kind: 'weekly',
    days: {
      mon: [['09:00', '17:00']],
      tue: [['09:00', '17:00']],
      wed: [['09:00', '17:00']],
      thu: [['09:00', '17:00']],
      fri: [['09:00', '17:00']],
      sat: [['08:00', '12:00']],
    },
  };

  it('highlights a merged row that covers today', () => {
    const [monFri] = hoursSummary(weekdays);
    expect(lineIsToday(monFri, 'wed')).toBe(true);
    expect(lineIsToday(monFri, 'sat')).toBe(false);
  });

  it('summary covers every day exactly once, so there is no fuller table to offer', () => {
    const covered = hoursSummary(weekdays).flatMap((line) => line.days ?? (line.day ? [line.day] : []));
    expect([...covered].sort()).toEqual([...WEEK_ORDER].sort());
  });

  it('labels rows for VoiceOver', () => {
    expect(hoursRowLabel('Mon – Fri', '9:00 am – 5:00 pm', true)).toBe('Today, Mon – Fri, 9:00 am – 5:00 pm');
    expect(hoursRowLabel('Sunday', 'Closed', false)).toBe('Sunday, Closed');
  });
});

describe('actionTilesLayout', () => {
  it('keeps one row at normal sizes, wraps 2×2 above 1.3 and stacks rows above 2', () => {
    expect(actionTilesLayout(1)).toBe('row');
    expect(actionTilesLayout(1.3)).toBe('row');
    expect(actionTilesLayout(1.35)).toBe('grid');
    expect(actionTilesLayout(2)).toBe('grid');
    expect(actionTilesLayout(2.4)).toBe('list');
  });
});
