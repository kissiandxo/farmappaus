import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { hoursSummary, type HoursLine } from '../../domain/hours';
import type { DayKey, OpeningHours } from '../../domain/types';
import { colors, MIN_TAP, space, type } from '../../theme';
import { Section } from '../ui';
import { ROW_PADDING } from '../ui/Row';

/** Above this text scale the day is stacked above its times so neither is squeezed. */
const STACK_FONT_SCALE = 1.5;

/** Status-line text used for irregular hours when the note is missing or too long to read at a glance. */
export const IRREGULAR_STATUS_FALLBACK = 'Check dates · see opening hours';

/** The first sentence of a note, without its closing full stop. */
export function firstSentence(note: string): string {
  const trimmed = note.trim();
  const match = trimmed.match(/^(.+?[.!?])(\s|$)/);
  const sentence = match ? match[1] : trimmed;
  return sentence.replace(/\.$/, '').trim();
}

/** Words that make a sentence read as a date or season pattern ("Third Sunday of each month only"). */
const PATTERN_WORDS =
  /\b(month|monthly|fortnight\w*|season\w*|weekly|week|every|only|runs|january|february|march|april|may|june|july|august|september|october|november|december|first|second|third|fourth|last|mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|sundays)\b/i;

/**
 * Status line for a place with irregular hours (monthly, seasonal or unpublished): the note's first sentence
 * when it is under 40 characters and reads as a date or season pattern ("Second Saturday of the month"),
 * otherwise a pointer to the hours section (so "Closed Tuesday and Wednesday" is never shown as a status).
 */
export function irregularStatusLabel(note: string | undefined): string {
  if (!note?.trim()) return IRREGULAR_STATUS_FALLBACK;
  const sentence = firstSentence(note);
  return sentence.length > 0 && sentence.length < 40 && PATTERN_WORDS.test(sentence) ? sentence : IRREGULAR_STATUS_FALLBACK;
}

/**
 * The note row under "Opening hours" for irregular hours. When the status line already shows the note's first
 * sentence, only the rest is shown here (null when there is no rest), so the same words are not repeated.
 */
export function irregularNoteRest(note: string | undefined): string | null {
  const trimmed = note?.trim();
  if (!trimmed) return null;
  if (irregularStatusLabel(trimmed) === IRREGULAR_STATUS_FALLBACK) return trimmed;
  const match = trimmed.match(/^(.+?[.!?])(\s|$)/);
  const rest = match ? trimmed.slice(match[0].length).trim() : '';
  return rest || null;
}

/** True when a summary row covers the given day. */
export function lineIsToday(line: HoursLine, today: DayKey): boolean {
  return line.day === today || !!line.days?.includes(today);
}

/** VoiceOver label for one hours row. */
export function hoursRowLabel(label: string, text: string, isToday: boolean): string {
  return `${isToday ? 'Today, ' : ''}${label}, ${text}`;
}

function HoursRow({ label, text, isToday, stacked }: { label: string; text: string; isToday: boolean; stacked: boolean }) {
  const weight = isToday ? styles.today : null;
  return (
    <View
      style={[styles.row, stacked && styles.rowStacked]}
      accessible
      accessibilityLabel={hoursRowLabel(label, text, isToday)}
    >
      <Text style={[type.body, styles.day, weight]}>{label}</Text>
      <Text style={[type.body, styles.time, stacked && styles.timeStacked, weight]}>{text}</Text>
    </View>
  );
}

export interface HoursSectionProps {
  hours: OpeningHours;
  /** The place's suburb, for "Times are local to …". */
  locality: string;
  /** Today in the place's own time zone. */
  today: DayKey;
}

/**
 * "Opening hours" group for the place page. Shows the compact summary ("Mon – Fri", "Sat – Sun") with today
 * in semibold; the summary covers every day, so there is no seven-day table to expand. Irregular hours lead with
 * the published note (minus the first sentence when the status line already shows it) and highlight no day,
 * because the weekly times may not apply this week.
 */
export function HoursSection({ hours, locality, today }: HoursSectionProps) {
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale > STACK_FONT_SCALE;

  const irregular = hours.kind === 'weekly' && !!hours.irregular;
  const note = hours.note?.trim();
  const noteRest = irregular ? irregularNoteRest(note) : null;
  let lines = hoursSummary(hours);
  // With irregular hours and a note row, "Times · Not published" says nothing the note does not.
  if (irregular && noteRest) lines = lines.filter((l) => !(l.label === 'Times' && l.text === 'Not published'));

  const localNote = `Times are local to ${locality}.`;
  const footer = irregular || !note ? localNote : `${note}\n${localNote}`;

  return (
    <Section header="Opening hours" footer={footer}>
      {irregular && note && noteRest ? (
        <View style={styles.noteRow} accessible accessibilityLabel={note}>
          <Text style={[type.body, { color: colors.label }]}>{noteRest}</Text>
        </View>
      ) : null}
      {lines.map((line) => (
        <HoursRow
          key={line.label}
          label={line.label}
          text={line.text}
          isToday={!irregular && lineIsToday(line, today)}
          stacked={stacked}
        />
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TAP,
    paddingHorizontal: ROW_PADDING,
    paddingVertical: space.sm + 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  rowStacked: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2 },
  day: { color: colors.label, flexShrink: 0 },
  time: { color: colors.secondaryLabel, flexShrink: 1, textAlign: 'right' },
  timeStacked: { textAlign: 'left' },
  today: { fontWeight: '600', color: colors.label },
  noteRow: { paddingHorizontal: ROW_PADDING, paddingVertical: space.md },
});
