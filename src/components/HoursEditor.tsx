import { StyleSheet, Text, View } from 'react-native';

import { copyToWeekdays, DAY_LABELS, DEFAULT_RANGE, setDayRange, WEEK_ORDER } from '../domain/hours';
import type { OpeningHours } from '../domain/types';
import { colors, font, space } from '../theme';
import { Btn, ChipGroup, Field, SwitchRow, TimeStepper } from './FormBits';

type Mode = OpeningHours['kind'];

const MODES: { value: Mode; label: string }[] = [
  { value: 'weekly', label: 'Set weekly hours' },
  { value: 'always', label: 'Open any time' },
  { value: 'appointment', label: 'By appointment' },
];

export function HoursEditor({ hours, onChange }: { hours: OpeningHours; onChange: (next: OpeningHours) => void }) {
  const note = hours.note ?? '';
  const setMode = (kind: Mode) => {
    if (kind === hours.kind) return;
    onChange(kind === 'weekly' ? { kind, days: { sat: [DEFAULT_RANGE] }, note: hours.note } : { kind, note: hours.note });
  };

  return (
    <View style={styles.wrap}>
      <ChipGroup options={MODES} value={hours.kind} onChange={setMode} />
      {hours.kind === 'always' && (
        <Text style={styles.hint}>Good for an honesty-box stall that is always stocked.</Text>
      )}

      {hours.kind === 'weekly' &&
        WEEK_ORDER.map((day) => {
          const range = hours.days[day]?.[0];
          return (
            <View key={day} style={styles.day}>
              <SwitchRow
                label={DAY_LABELS[day]}
                value={!!range}
                onChange={(open) => onChange({ ...hours, days: setDayRange(hours.days, day, open ? DEFAULT_RANGE : null) })}
                hint={range ? undefined : 'Closed'}
              />
              {range && (
                <View style={styles.times}>
                  <TimeStepper
                    label="Opens"
                    value={range[0]}
                    onChange={(open) => onChange({ ...hours, days: setDayRange(hours.days, day, [open, range[1]]) })}
                  />
                  <TimeStepper
                    label="Closes"
                    value={range[1]}
                    onChange={(close) => onChange({ ...hours, days: setDayRange(hours.days, day, [range[0], close]) })}
                  />
                </View>
              )}
            </View>
          );
        })}

      {hours.kind === 'weekly' && (
        <Btn label="Use the first weekday’s hours for Monday to Friday" onPress={() => onChange({ ...hours, days: copyToWeekdays(hours.days) })} />
      )}

      <Field
        label="Note for customers (optional)"
        value={note}
        onChangeText={(text) => onChange({ ...hours, note: text || undefined })}
        placeholder="e.g. Closed on public holidays"
        maxLength={140}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  hint: { fontSize: font.small, color: colors.textMuted },
  day: { gap: space.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm },
  // Stacked, not side by side: each stepper needs about 200 pt, and phones are 320–430 pt wide.
  times: { gap: space.md },
});
