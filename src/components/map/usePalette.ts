import { useColorScheme } from 'react-native';

import { darkPalette, lightPalette, type Palette } from '../../theme';

/**
 * Plain-hex palette for the current appearance. Map markers are rendered into native annotation
 * views, so they use these strings instead of the dynamic `colors` tokens.
 */
export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? darkPalette : lightPalette;
}
