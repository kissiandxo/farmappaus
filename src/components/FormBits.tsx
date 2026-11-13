import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { formatMinutes, parseMinutes, stepTime } from '../domain/hours';
import { colors, MIN_TAP, radius, space, type } from '../theme';
import { Chip } from './Chip';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { selection } from './ui/haptics';

/** Inset grouped group: `cell` surface, radius 12, no border. Optional headline title and footnote hint. */
export function Card({ title, children, hint }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      {title ? (
        <Text style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
  error?: string | null;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  maxLength?: number;
}

/** Labelled text field: subheadline label over a quiet rounded input. */
export function Field({ label, value, onChangeText, hint, error, multiline, ...rest }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.tint}
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.multiline, !!error && styles.inputError]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Pick one (single) or several (multi) options as capsule chips. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | T[];
  onChange: (next: T) => void;
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={selected(o.value)} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

/** Label on the left, system switch (tint) on the right, optional footnote hint underneath. */
export function SwitchRow({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <View>
      <View style={styles.switchRow}>
        <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
        <Switch
          value={value}
          onValueChange={(v) => {
            selection();
            onChange(v);
          }}
          trackColor={{ true: colors.tint, false: colors.fill }}
          accessibilityLabel={label}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Full-width button. `primary` = filled, `secondary` = tinted, `danger` = tinted red. Prefer `ui/Button` in new code. */
export function Btn({
  label,
  onPress,
  kind = 'secondary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Button
      label={label}
      onPress={onPress}
      disabled={disabled}
      variant={kind === 'primary' ? 'filled' : 'tinted'}
      role={kind === 'danger' ? 'destructive' : undefined}
    />
  );
}

/** Shows a time like "9:00 am" with minus and plus buttons that move it by 30 minutes. */
export function TimeStepper({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  return (
    <View style={styles.stepper} accessible accessibilityRole="adjustable" accessibilityLabel={`${label} ${formatMinutes(parseMinutes(value))}`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(stepTime(value, e.nativeEvent.actionName === 'increment' ? 30 : -30))}
    >
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable onPress={() => onChange(stepTime(value, -30))} style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.6 }]} accessibilityLabel={`${label} earlier`} accessibilityRole="button">
          <Icon name="minus" size={16} weight="semibold" color={colors.tint} />
        </Pressable>
        <Text style={styles.stepperValue}>{formatMinutes(parseMinutes(value))}</Text>
        <Pressable onPress={() => onChange(stepTime(value, 30))} style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.6 }]} accessibilityLabel={`${label} later`} accessibilityRole="button">
          <Icon name="plus" size={16} weight="semibold" color={colors.tint} />
        </Pressable>
      </View>
    </View>
  );
}

/** Inline message block. info = quiet fill, warn = orange, error = red, ok = green. */
export function Notice({ kind, children }: { kind: 'info' | 'warn' | 'error' | 'ok'; children: ReactNode }) {
  const bg = { info: colors.fill, warn: colors.orangeFill, error: colors.redFill, ok: colors.greenFill }[kind];
  return (
    <View style={[styles.notice, { backgroundColor: bg }]} accessibilityRole="alert">
      {typeof children === 'string' ? <Text style={styles.noticeText}>{children}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cell, borderRadius: radius.group, borderCurve: 'continuous', padding: space.lg, gap: space.md },
  cardTitle: { ...type.headline, color: colors.label },
  field: { gap: 6 },
  label: { ...type.subheadline, fontWeight: '600', color: colors.secondaryLabel },
  rowLabel: { ...type.body, color: colors.label },
  hint: { ...type.footnote, color: colors.secondaryLabel },
  error: { ...type.footnote, color: colors.red, fontWeight: '600' },
  input: { ...type.body, minHeight: MIN_TAP, color: colors.label, backgroundColor: colors.fill, borderRadius: radius.control, borderCurve: 'continuous', paddingHorizontal: space.md, paddingVertical: space.sm },
  inputError: { borderWidth: 1, borderColor: colors.red },
  multiline: { minHeight: 110, textAlignVertical: 'top', paddingTop: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  switchRow: { minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepper: { gap: 4, flex: 1 },
  stepperLabel: { ...type.footnote, fontWeight: '600', color: colors.secondaryLabel },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepperValue: { ...type.body, fontWeight: '600', color: colors.label, minWidth: 82, textAlign: 'center' },
  stepBtn: { width: MIN_TAP, height: MIN_TAP, borderRadius: MIN_TAP / 2, backgroundColor: colors.tintFill, alignItems: 'center', justifyContent: 'center' },
  notice: { borderRadius: radius.group, borderCurve: 'continuous', padding: space.lg, gap: space.xs },
  noticeText: { ...type.callout, color: colors.label },
});
