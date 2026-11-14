/**
 * Farm Direct design tokens (Apple style). See docs/DESIGN.md.
 *
 * Rules: never write a hex value in a screen; use `colors`, `type`, `space`, `radius`.
 *
 * `colors` adapt to dark mode by themselves on iOS (system `PlatformColor`s and
 * `DynamicColorIOS` for brand colours and `secondaryLabel`), so they work inside static
 * `StyleSheet.create`. `secondaryLabel` also follows Increase Contrast (`highContrastPalette`).
 * On web, Android and Jest they fall back to the light hex values.
 * `lightPalette` / `darkPalette` are the plain hex versions (tests, React Navigation theme).
 */
import { DynamicColorIOS, PlatformColor, Platform, StyleSheet, type ColorValue, type TextStyle } from 'react-native';

/** Hex strings; 8-digit values (#RRGGBBAA) carry alpha. */
export interface Palette {
  /** Primary text. */
  label: string;
  /**
   * Secondary text (meta, captions, footnotes, values). Meets AA (4.5:1) on background,
   * groupedBackground and cell in both modes. On iOS this is an opaque `DynamicColorIOS`
   * (not the system `secondaryLabel`, whose 60% alpha is only ~3.3:1 on groupedBackground),
   * with darker / lighter values when Increase Contrast is on (`highContrastPalette`).
   */
  secondaryLabel: string;
  /** Decorative / disabled text and large empty-state symbols. Not for essential text. */
  tertiaryLabel: string;
  /** TextInput placeholder. */
  placeholder: string;
  /** Page background for plain (non-grouped) screens. */
  background: string;
  /** Page background for inset grouped lists and forms (behind `cell`s). */
  groupedBackground: string;
  /** Grouped row / card surface (secondarySystemGroupedBackground). */
  cell: string;
  /** Hairline separators. */
  separator: string;
  /** Pressed rows, quiet capsules, unselected chips, inactive tracks. */
  fill: string;
  /** Brand green; buttons, links, selected state. AA as text on background/cell. */
  tint: string;
  /** Tint at ~10% (light) / ~22% (dark) for tinted buttons and soft badges. */
  tintFill: string;
  /** Content on a solid `tint` surface. */
  onTint: string;
  /** Status green (open now). AA as text. */
  green: string;
  /** Warnings, sample data. AA as text. */
  orange: string;
  /** Destructive / errors. AA as text. */
  red: string;
  /** Green at ~15% (badge background). */
  greenFill: string;
  /** Orange at ~15% (badge / notice background). */
  orangeFill: string;
  /** Red at ~10% (light) / ~15% (dark) (badge / notice background, destructive tinted button). */
  redFill: string;
  /** Map pin: shop. AA as a fill under `onPin` glyphs and as text on cell. */
  blue: string;
  /** Map pin: market. AA as a fill under `onPin` glyphs and as text on cell. */
  purple: string;
  /** Map pin: butcher. AA as a fill under `onPin` glyphs and as text on cell. */
  pink: string;
  /** Glyph on a pin fill (`green`, `orange`, `blue`, `purple`, `pink`). */
  onPin: string;
  /** Shadow colour for things floating over a map. Black in both modes (never a white glow). */
  shadow: string;
}

export const lightPalette: Palette = {
  label: '#000000',
  secondaryLabel: '#6C6C70',
  tertiaryLabel: '#C4C4C7',
  placeholder: '#C4C4C7',
  background: '#FFFFFF',
  groupedBackground: '#F2F2F7',
  cell: '#FFFFFF',
  separator: '#C6C6C8',
  fill: '#7676801F',
  tint: '#1B7335',
  tintFill: '#1B73351A',
  onTint: '#FFFFFF',
  green: '#1B7335',
  orange: '#9C4A00',
  red: '#C40012',
  greenFill: '#1B733526',
  orangeFill: '#9C4A0026',
  redFill: '#C400121A',
  blue: '#0A5AC8',
  purple: '#8944AB',
  pink: '#B0275E',
  onPin: '#FFFFFF',
  shadow: '#000000',
};

export const darkPalette: Palette = {
  label: '#FFFFFF',
  secondaryLabel: '#A1A1A8',
  tertiaryLabel: '#48484A',
  placeholder: '#5C5C60',
  background: '#000000',
  groupedBackground: '#000000',
  cell: '#1C1C1E',
  separator: '#38383A',
  fill: '#7676803D',
  tint: '#30D158',
  tintFill: '#30D15838',
  // Bright dark-mode green needs dark content (white on #30D158 is ~2:1).
  onTint: '#000000',
  green: '#30D158',
  orange: '#FF9F0A',
  red: '#FF6961',
  greenFill: '#30D15838',
  orangeFill: '#FF9F0A38',
  redFill: '#FF696126',
  blue: '#409CFF',
  purple: '#BF5AF2',
  pink: '#FF7AA8',
  // Bright dark-mode pin fills need dark glyphs, as with `onTint`.
  onPin: '#000000',
  shadow: '#000000',
};

/**
 * Values used on iOS when the user turns on Settings > Accessibility > Increase Contrast.
 * Only the keys listed here change; everything else keeps its normal value.
 */
export const highContrastPalette: { light: Partial<Palette>; dark: Partial<Palette> } = {
  light: { secondaryLabel: '#48484A' },
  dark: { secondaryLabel: '#C7C7CC' },
};

/** True when native iOS dynamic colours can be used (not web, Android or Jest). */
const useNativeColors = Platform.OS === 'ios' && typeof process !== 'undefined' && !process.env?.JEST_WORKER_ID;

const dyn = (key: keyof Palette): ColorValue => {
  if (!useNativeColors) return lightPalette[key];
  const hcLight = highContrastPalette.light[key];
  const hcDark = highContrastPalette.dark[key];
  return DynamicColorIOS({
    light: lightPalette[key],
    dark: darkPalette[key],
    ...(hcLight ? { highContrastLight: hcLight } : null),
    ...(hcDark ? { highContrastDark: hcDark } : null),
  });
};

const sys = (key: keyof Palette, systemName: string): ColorValue =>
  useNativeColors ? PlatformColor(systemName) : lightPalette[key];

const base = {
  label: sys('label', 'label'),
  // Opaque brand value, not PlatformColor('secondaryLabel') (translucent, ~3.3:1 on groupedBackground).
  secondaryLabel: dyn('secondaryLabel'),
  tertiaryLabel: sys('tertiaryLabel', 'tertiaryLabel'),
  placeholder: sys('placeholder', 'placeholderText'),
  background: sys('background', 'systemBackground'),
  groupedBackground: sys('groupedBackground', 'systemGroupedBackground'),
  cell: sys('cell', 'secondarySystemGroupedBackground'),
  separator: sys('separator', 'separator'),
  fill: sys('fill', 'tertiarySystemFill'),
  tint: dyn('tint'),
  tintFill: dyn('tintFill'),
  onTint: dyn('onTint'),
  green: dyn('green'),
  orange: dyn('orange'),
  red: dyn('red'),
  greenFill: dyn('greenFill'),
  orangeFill: dyn('orangeFill'),
  redFill: dyn('redFill'),
  blue: dyn('blue'),
  purple: dyn('purple'),
  pink: dyn('pink'),
  onPin: dyn('onPin'),
  shadow: dyn('shadow'),
};

/**
 * Semantic colours (`ColorValue`s that follow light/dark on iOS).
 * Use these everywhere; do not compute with them (they are opaque objects on iOS).
 */
export const colors = {
  ...base,
};

/** Apple text styles as ready-to-spread style objects: `<Text style={type.headline} />`. */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '400' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '400' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '400' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
} satisfies Record<string, TextStyle>;

/** 4 pt grid. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = {
  /** Small controls (fields, small buttons). */
  control: 10,
  /** Inset grouped lists. */
  group: 12,
  /** Cards. */
  card: 16,
  /** Large hero cards and images. */
  hero: 22,
  /** Pills / chips / badges. */
  capsule: 999,
} as const;

/** Minimum touch target (Apple HIG: 44 pt). */
export const MIN_TAP = 44;

/** Hairline width for separators. */
export const hairline = StyleSheet.hairlineWidth;
