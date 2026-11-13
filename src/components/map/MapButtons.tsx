import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, hairline, MIN_TAP, radius, space } from '../../theme';
import { Icon, type SFSymbol } from '../ui';

interface RoundButtonProps {
  icon: SFSymbol;
  label: string;
  hint?: string;
  busy?: boolean;
  onPress: () => void;
}

function RoundButton({ icon, label, hint, busy, onPress }: RoundButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {busy ? <ActivityIndicator color={colors.tint} /> : <Icon name={icon} size={20} weight="medium" color={colors.tint} />}
    </Pressable>
  );
}

interface MapButtonsProps {
  onLocate: () => void;
  onFitAll: () => void;
  locating?: boolean;
}

/** Floating round controls, bottom right: find me, show every place. */
export function MapButtons({ onLocate, onFitAll, locating }: MapButtonsProps) {
  return (
    <View style={styles.column}>
      <RoundButton
        icon="location"
        label="Show my location"
        hint="Centres the map on where you are"
        busy={locating}
        onPress={onLocate}
      />
      <RoundButton
        icon="arrow.up.left.and.arrow.down.right"
        label="Show all places"
        hint="Zooms out to fit every pin"
        onPress={onFitAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: space.sm },
  button: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cell,
    // A hairline keeps the edge visible on a dark map, where the shadow disappears.
    borderWidth: hairline,
    borderColor: colors.separator,
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pressed: { opacity: 0.6 },
});
