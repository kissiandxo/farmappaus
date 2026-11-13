import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, MIN_TAP, space, type } from '../../theme';
import { Icon, type SFSymbol } from './Icon';

/** Width of the Settings-style icon tile. Section uses it to inset separators. */
export const ROW_ICON_SIZE = 30;
/** Horizontal padding inside a row. */
export const ROW_PADDING = space.lg;
/** Gap between the leading icon and the text. */
export const ROW_ICON_GAP = space.md;

export interface RowProps {
  title: string;
  /** Second line under the title (secondaryLabel, subheadline). */
  subtitle?: string;
  /** Right-aligned secondary text, e.g. a setting's current value. */
  value?: string;
  /** Leading SF Symbol. */
  icon?: SFSymbol;
  /** With `icon`: colour of the rounded-square tile behind the symbol (glyph turns white), like Settings. Omit for a bare tinted symbol. */
  iconBackground?: ColorValue;
  /** With `icon` and no `iconBackground`: symbol colour. Defaults to `colors.tint`. */
  iconColor?: ColorValue;
  /** Right-edge decoration. `'chevron'` for rows that push a screen, `'checkmark'` for the selected option, or any node (e.g. a Switch). Default `'none'`. */
  accessory?: 'chevron' | 'checkmark' | 'none' | ReactNode;
  /** Makes the row tappable with a `fill` pressed highlight. Without it the row is static. */
  onPress?: () => void;
  /** Red title (for delete / sign out rows). */
  destructive?: boolean;
  /** Free-form content shown under the title line, e.g. a text field or a chip group. */
  children?: ReactNode;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * One row of an inset grouped list. Put rows inside a `Section`, which draws the separators.
 * Min height 44. Add `onPress` to make it tappable.
 */
export function Row({
  title,
  subtitle,
  value,
  icon,
  iconBackground,
  iconColor,
  accessory = 'none',
  onPress,
  destructive,
  children,
  accessibilityHint,
  accessibilityLabel,
  style,
}: RowProps) {
  const body = (
    <>
      <View style={styles.line}>
        {icon ? (
          iconBackground ? (
            <View style={[styles.tile, { backgroundColor: iconBackground }]}>
              <Icon name={icon} size={17} color="white" weight="medium" />
            </View>
          ) : (
            <View style={styles.tile}>
              <Icon name={icon} size={22} color={iconColor ?? colors.tint} />
            </View>
          )
        ) : null}
        <View style={styles.text}>
          <Text style={[type.body, { color: destructive ? colors.red : colors.label }]}>{title}</Text>
          {subtitle ? <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>{subtitle}</Text> : null}
        </View>
        {value ? (
          <Text style={[type.body, styles.value]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        <Accessory accessory={accessory} />
      </View>
      {children ? <View style={styles.children}>{children}</View> : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, style]}>{body}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.fill }, style]}
    >
      {body}
    </Pressable>
  );
}

function Accessory({ accessory }: { accessory: RowProps['accessory'] }) {
  if (accessory === 'chevron') return <Icon name="chevron.right" size={14} weight="semibold" color={colors.tertiaryLabel} />;
  if (accessory === 'checkmark') return <Icon name="checkmark" size={17} weight="semibold" color={colors.tint} />;
  if (accessory === 'none' || accessory == null || accessory === false) return null;
  return <>{accessory}</>;
}

const styles = StyleSheet.create({
  row: { minHeight: MIN_TAP, paddingHorizontal: ROW_PADDING, paddingVertical: space.sm + 1, justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: ROW_ICON_GAP },
  tile: { width: ROW_ICON_SIZE, height: ROW_ICON_SIZE, borderRadius: 7, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  value: { color: colors.secondaryLabel, flexShrink: 1, textAlign: 'right' },
  children: { marginTop: space.sm },
});
