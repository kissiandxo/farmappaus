import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, hairline, MIN_TAP, space, type } from '../theme';
import { Icon, type SFSymbol } from './ui';

/** Padded block inside an inset group: 16 pt sides, 12 pt top and bottom. */
export function Pad({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.pad, style]}>{children}</View>;
}

/** Stacks blocks inside one group, with hairline separators inset to the text. */
export function Divided({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 ? <View style={styles.separator} /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

/** Quiet label above a field or chip group (subheadline, semibold, secondaryLabel). */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** One line of a list inside a Notice: a small dot (not a text glyph) and callout text. */
export function BulletLine({ children }: { children: ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.dot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

/** Icon-only button with a 44 pt target and a required accessibility label. */
export function IconButton({
  icon,
  label,
  color,
  onPress,
  disabled,
}: {
  icon: SFSymbol;
  label: string;
  color: ColorValue;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }, disabled && { opacity: 0.4 }]}
    >
      <Icon name={icon} size={24} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  separator: { height: hairline, backgroundColor: colors.separator, marginLeft: space.lg },
  label: { ...type.subheadline, fontWeight: '600', color: colors.secondaryLabel },
  iconButton: { minWidth: MIN_TAP, minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.label, marginTop: 8 },
  bulletText: { ...type.callout, color: colors.label, flex: 1 },
});
