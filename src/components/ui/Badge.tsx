import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, type } from '../../theme';

export type BadgeTone = 'neutral' | 'tint' | 'green' | 'orange' | 'red';

export interface BadgeProps {
  label: string;
  /** Default `neutral`. */
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

const TONES = {
  neutral: { bg: colors.fill, fg: colors.secondaryLabel },
  tint: { bg: colors.tintFill, fg: colors.tint },
  green: { bg: colors.greenFill, fg: colors.green },
  orange: { bg: colors.orangeFill, fg: colors.orange },
  red: { bg: colors.redFill, fg: colors.red },
} as const;

/** Small quiet capsule label (produce tags, "Sample data", counts). Not interactive. */
export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const t = TONES[tone];
  return (
    <View style={[styles.capsule, { backgroundColor: t.bg }, style]}>
      <Text style={[type.footnote, styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/** Alias: a Badge is a Capsule. */
export const Capsule = Badge;

const styles = StyleSheet.create({
  capsule: { alignSelf: 'flex-start', borderRadius: radius.capsule, paddingHorizontal: 10, paddingVertical: 3, borderCurve: 'continuous' },
  text: { fontWeight: '500' },
});
