import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, MIN_TAP, radius, space } from '../theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: MIN_TAP,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    borderRadius: radius.chip,
    backgroundColor: colors.chip,
    borderWidth: 2,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.7 },
  label: { fontSize: font.body, color: colors.text, fontWeight: '600' },
  labelSelected: { color: colors.onPrimary },
});
