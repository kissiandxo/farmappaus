import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, type } from '../../theme';
import { Icon, type SFSymbol } from './Icon';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /** `filled` = main action (one per screen), `tinted` = tint on 15% tint, `plain` = tint text only. Default `filled`. */
  variant?: 'filled' | 'tinted' | 'plain';
  /** `'destructive'` swaps the tint for red. */
  role?: 'destructive';
  /** `large` = full width, 50 pt, radius 14. `small` = capsule that hugs its content. Default `large`. */
  size?: 'large' | 'small';
  /** Optional leading SF Symbol. */
  icon?: SFSymbol;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  /** Overrides the accessibility label (defaults to `label`). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Apple-style button. Pressed drops to 0.6 opacity; disabled to 0.4. */
export function Button({
  label,
  onPress,
  variant = 'filled',
  role,
  size = 'large',
  icon,
  loading,
  disabled,
  accessibilityHint,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const accent = role === 'destructive' ? colors.red : colors.tint;
  const accentFill = role === 'destructive' ? colors.redFill : colors.tintFill;
  const bg = variant === 'filled' ? accent : variant === 'tinted' ? accentFill : 'transparent';
  const fg = variant === 'filled' ? colors.onTint : accent;
  const inactive = !!disabled || !!loading;
  const small = size === 'small';

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      hitSlop={small ? 6 : 0}
      style={({ pressed }) => [
        styles.base,
        small ? styles.small : styles.large,
        { backgroundColor: bg },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={small ? 15 : 18} color={fg} weight="semibold" /> : null}
          <Text style={[small ? type.subheadline : type.headline, small && { fontWeight: '600' }, { color: fg }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  large: { minHeight: 50, borderRadius: 14, paddingHorizontal: 16, alignSelf: 'stretch' },
  small: { minHeight: 32, borderRadius: radius.capsule, paddingHorizontal: 14, alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
});
