import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '../theme';
import { Icon } from './ui/Icon';
import { selection } from './ui/haptics';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Overrides the spoken label (defaults to `label`). */
  accessibilityLabel?: string;
}

/** Capsule toggle. Selected = tint fill, onTint text and a checkmark; unselected = quiet `fill`. */
export function Chip({ label, selected, onPress, accessibilityLabel }: ChipProps) {
  return (
    <Pressable
      onPress={() => {
        selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      hitSlop={4}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
      <View style={styles.content}>
        {selected ? <Icon name="checkmark" size={13} weight="bold" color={colors.onTint} /> : null}
        <Text style={[type.subheadline, styles.label, selected && styles.labelSelected]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
    backgroundColor: colors.fill,
  },
  selected: { backgroundColor: colors.tint },
  pressed: { opacity: 0.6 },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  label: { color: colors.label, fontWeight: '500' },
  labelSelected: { color: colors.onTint },
});
