import { View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import { SymbolView, type SFSymbol, type SymbolWeight } from 'expo-symbols';

import { colors } from '../../theme';

export type { SFSymbol };

export interface IconProps {
  /** SF Symbol name, e.g. `'leaf'`, `'heart.fill'`. Typed against the full SF Symbols list. */
  name: SFSymbol;
  /** Point size. Default 22. */
  size?: number;
  /** Colour; defaults to `colors.tint`. */
  color?: ColorValue;
  /** Symbol weight. Default `'regular'`. */
  weight?: SymbolWeight;
  /** Set to describe the icon to screen readers. By default icons are decorative and hidden. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * SF Symbol via expo-symbols. On iOS it renders the real symbol. Off iOS (web, Android, Jest)
 * expo-symbols has no mapping for a bare SF name, so we render an empty box of the same size:
 * layout is preserved and nothing crashes. Always pair icons with a text label or accessibilityLabel
 * on the parent control, since the fallback is blank.
 */
export function Icon({ name, size = 22, color = colors.tint, weight = 'regular', accessibilityLabel, style }: IconProps) {
  const hidden = !accessibilityLabel;
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={[{ width: size, height: size }, style]}
      fallback={<View style={[{ width: size, height: size }, style]} />}
      accessible={!hidden}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'yes'}
    />
  );
}
