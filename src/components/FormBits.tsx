import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { formatMinutes, parseMinutes, stepTime } from '../domain/hours';
import { colors, font, MIN_TAP, radius, space } from '../theme';
import { Chip } from './Chip';

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

export function Field({ label, value, onChangeText, hint, error, multiline, ...rest }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.multiline, !!error && styles.inputError]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Pick one (single) or several (multi) options as large chips. */
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

export function SwitchRow({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <View>
      <View style={styles.switchRow}>
        <Text style={[styles.label, { flex: 1 }]}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: colors.primary, false: colors.border }}
          accessibilityLabel={label}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

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
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        kind === 'primary' && styles.btnPrimary,
        kind === 'danger' && styles.btnDanger,
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.btnText, kind === 'primary' && { color: colors.onPrimary }, kind === 'danger' && { color: colors.closed }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Shows a time like "9:00 am" with big − and + buttons that move it by 30 minutes. */
export function TimeStepper({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  return (
    <View style={styles.stepper} accessible accessibilityRole="adjustable" accessibilityLabel={`${label} ${formatMinutes(parseMinutes(value))}`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(stepTime(value, e.nativeEvent.actionName === 'increment' ? 30 : -30))}
    >
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable onPress={() => onChange(stepTime(value, -30))} style={styles.stepBtn} accessibilityLabel={`${label} earlier`} accessibilityRole="button">
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{formatMinutes(parseMinutes(value))}</Text>
        <Pressable onPress={() => onChange(stepTime(value, 30))} style={styles.stepBtn} accessibilityLabel={`${label} later`} accessibilityRole="button">
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Notice({ kind, children }: { kind: 'info' | 'warn' | 'error' | 'ok'; children: ReactNode }) {
  const bg = { info: colors.chip, warn: colors.sampleBackground, error: '#F6D9CF', ok: '#DDEBD2' }[kind];
  return (
    <View style={[styles.notice, { backgroundColor: bg }]} accessibilityRole="alert">
      {typeof children === 'string' ? <Text style={styles.noticeText}>{children}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.md },
  cardTitle: { fontSize: font.title, fontWeight: '700', color: colors.text },
  field: { gap: 6 },
  label: { fontSize: font.body, fontWeight: '700', color: colors.text },
  hint: { fontSize: font.small, color: colors.textMuted },
  error: { fontSize: font.small, color: colors.closed, fontWeight: '700' },
  input: { minHeight: 56, fontSize: font.large, color: colors.text, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: space.lg, paddingVertical: space.sm },
  inputError: { borderColor: colors.closed },
  multiline: { minHeight: 130, textAlignVertical: 'top', paddingTop: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  switchRow: { minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center', gap: space.md },
  btn: { minHeight: MIN_TAP + 4, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnDanger: { borderColor: colors.closed },
  btnText: { fontSize: font.large, fontWeight: '700', color: colors.text, textAlign: 'center' },
  stepper: { gap: 4, flex: 1 },
  stepperLabel: { fontSize: font.small, fontWeight: '700', color: colors.textMuted },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepperValue: { fontSize: font.body, fontWeight: '700', color: colors.text, minWidth: 82, textAlign: 'center' },
  stepBtn: { width: MIN_TAP, height: MIN_TAP, borderRadius: MIN_TAP / 2, backgroundColor: colors.chip, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 28, fontWeight: '700', color: colors.text, lineHeight: 32 },
  notice: { borderRadius: radius.card, padding: space.lg, gap: space.xs },
  noticeText: { fontSize: font.body, color: colors.text },
});
