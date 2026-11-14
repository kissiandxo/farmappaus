import { darkPalette, highContrastPalette, lightPalette, MIN_TAP, type, type Palette } from '../theme';

type RGB = [number, number, number];

function parse(hex: string): { rgb: RGB; a: number } {
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return { rgb: [n(1), n(3), n(5)], a: hex.length === 9 ? n(7) / 255 : 1 };
}

/** Flatten a (possibly translucent) colour over an opaque backdrop. */
function over(fg: string, bg: string): RGB {
  const f = parse(fg);
  const b = parse(bg).rgb;
  return f.rgb.map((c, i) => c * f.a + b[i] * (1 - f.a)) as RGB;
}

/** WCAG 2.x relative luminance. */
function luminance([r, g, b]: RGB): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** Contrast of `fg` drawn on `bg`, where `base` is what `bg` itself sits on (for translucent fills). */
function contrast(fg: string, bg: string, base: string): number {
  const bgFlat = over(bg, base);
  const bgHex = '#' + bgFlat.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
  const fgFlat = over(fg, bgHex);
  const [hi, lo] = [luminance(fgFlat), luminance(bgFlat)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Pair = [name: string, fg: keyof Palette, bg: keyof Palette, base: keyof Palette];

// Text/background pairs actually used. 4.5:1 is WCAG AA for normal text.
const TEXT_PAIRS: Pair[] = [
  ['label on background', 'label', 'background', 'background'],
  ['label on groupedBackground', 'label', 'groupedBackground', 'groupedBackground'],
  ['label on cell', 'label', 'cell', 'cell'],
  ['secondaryLabel on background', 'secondaryLabel', 'background', 'background'],
  ['secondaryLabel on groupedBackground', 'secondaryLabel', 'groupedBackground', 'groupedBackground'],
  ['secondaryLabel on cell', 'secondaryLabel', 'cell', 'cell'],
  ['secondaryLabel on fill (capsules)', 'secondaryLabel', 'fill', 'cell'],
  ['label on fill (unselected chip)', 'label', 'fill', 'groupedBackground'],
  ['tint on background', 'tint', 'background', 'background'],
  ['tint on groupedBackground', 'tint', 'groupedBackground', 'groupedBackground'],
  ['tint on cell', 'tint', 'cell', 'cell'],
  ['tint on tintFill (tinted button)', 'tint', 'tintFill', 'cell'],
  ['onTint on tint (filled button)', 'onTint', 'tint', 'background'],
  ['green on cell (open)', 'green', 'cell', 'cell'],
  ['green on greenFill', 'green', 'greenFill', 'cell'],
  ['orange on cell', 'orange', 'cell', 'cell'],
  ['orange on orangeFill (sample data)', 'orange', 'orangeFill', 'cell'],
  ['red on cell (destructive)', 'red', 'cell', 'cell'],
  ['red on groupedBackground', 'red', 'groupedBackground', 'groupedBackground'],
  ['red on redFill', 'red', 'redFill', 'cell'],
  ['onPin on green (farm pin)', 'onPin', 'green', 'cell'],
  ['onPin on orange (stall pin)', 'onPin', 'orange', 'cell'],
  ['onPin on blue (shop pin)', 'onPin', 'blue', 'cell'],
  ['onPin on purple (market pin)', 'onPin', 'purple', 'cell'],
  ['onPin on pink (butcher pin)', 'onPin', 'pink', 'cell'],
  ['pink on cell (hollow butcher pin)', 'pink', 'cell', 'cell'],
  ['blue on cell', 'blue', 'cell', 'cell'],
];

describe.each([
  ['light', lightPalette],
  ['dark', darkPalette],
] as const)('colour contrast (%s)', (_mode, palette) => {
  it.each(TEXT_PAIRS)('%s meets WCAG AA (4.5:1)', (_name, fg, bg, base) => {
    expect(contrast(palette[fg], palette[bg], palette[base])).toBeGreaterThanOrEqual(4.5);
  });

  it('main reading text meets AAA (7:1)', () => {
    expect(contrast(palette.label, palette.background, palette.background)).toBeGreaterThanOrEqual(7);
    expect(contrast(palette.label, palette.cell, palette.cell)).toBeGreaterThanOrEqual(7);
  });

  it('every palette key is a hex colour', () => {
    for (const v of Object.values(palette)) expect(v).toMatch(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/);
  });
});

describe.each([
  ['light', lightPalette],
  ['dark', darkPalette],
] as const)('footnote text (%s)', (_mode, palette) => {
  // Section headers and footers are footnote-size secondaryLabel on groupedBackground.
  it('secondaryLabel footnotes on groupedBackground meet AA (4.5:1)', () => {
    expect(contrast(palette.secondaryLabel, palette.groupedBackground, palette.groupedBackground)).toBeGreaterThanOrEqual(4.5);
  });
});

describe.each([
  ['light', lightPalette, highContrastPalette.light],
  ['dark', darkPalette, highContrastPalette.dark],
] as const)('Increase Contrast (%s)', (_mode, palette, hc) => {
  it('only overrides existing keys with hex colours', () => {
    for (const [k, v] of Object.entries(hc)) {
      expect(Object.keys(palette)).toContain(k);
      expect(v).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('secondaryLabel is at least as strong as the normal value and meets AAA (7:1) on cell and groupedBackground', () => {
    const hcSecondary = hc.secondaryLabel!;
    for (const bg of ['cell', 'groupedBackground', 'background'] as const) {
      const normal = contrast(palette.secondaryLabel, palette[bg], palette[bg]);
      const high = contrast(hcSecondary, palette[bg], palette[bg]);
      expect(high).toBeGreaterThan(normal);
      expect(high).toBeGreaterThanOrEqual(7);
    }
  });
});

describe('palettes', () => {
  it('have identical keys', () => {
    expect(Object.keys(darkPalette).sort()).toEqual(Object.keys(lightPalette).sort());
  });
});

describe('scale', () => {
  it('uses Apple text style sizes', () => {
    expect(type.largeTitle).toMatchObject({ fontSize: 34, lineHeight: 41 });
    expect(type.body).toMatchObject({ fontSize: 17, lineHeight: 22 });
    expect(type.caption).toMatchObject({ fontSize: 12, lineHeight: 16 });
  });
  it('keeps the 44 pt minimum tap target', () => {
    expect(MIN_TAP).toBe(44);
  });
});
