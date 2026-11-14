import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, MIN_TAP, radius, space, type } from '../theme';
import { Icon } from './ui';

/** iOS-style search field: `fill` background, magnifying glass, 40 pt high, radius 10. Pass any TextInput props. */
export function SearchField(props: TextInputProps) {
  return (
    <View style={styles.wrap}>
      <Icon name="magnifyingglass" size={16} weight="medium" color={colors.secondaryLabel} />
      <TextInput
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.tint}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    backgroundColor: colors.fill,
  },
  input: { ...type.body, flex: 1, minHeight: MIN_TAP - 4, color: colors.label, paddingVertical: 0 },
});
