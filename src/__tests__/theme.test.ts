import { colors } from '../theme';

/** WCAG 2.x relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text pairs actually used in the app. 4.5:1 is WCAG AA for normal text; we also aim for 7:1 (AAA)
// on the main reading text, because many of our users are older.
const AA_PAIRS: [string, string, string][] = [
  ['text on background', colors.text, colors.background],
  ['text on surface', colors.text, colors.surface],
  ['text on chip', colors.text, colors.chip],
  ['muted text on background', colors.textMuted, colors.background],
  ['muted text on surface', colors.textMuted, colors.surface],
  ['muted text on chip', colors.textMuted, colors.chip],
  ['white on primary green', colors.onPrimary, colors.primary],
  ['white on accent terracotta', colors.onPrimary, colors.accent],
  ['accent on surface (tags, links)', colors.accent, colors.surface],
  ['accent on background', colors.accent, colors.background],
  ['primary on surface (distance)', colors.primary, colors.surface],
  ['primary on background', colors.primary, colors.background],
  ['open status on surface', colors.open, colors.surface],
  ['closed status on surface', colors.closed, colors.surface],
  ['closed status on background', colors.closed, colors.background],
  ['sample banner text', colors.sampleText, colors.sampleBackground],
  ['text on error notice', colors.text, '#F6D9CF'],
  ['text on ok notice', colors.text, '#DDEBD2'],
];

describe('colour contrast', () => {
  it.each(AA_PAIRS)('%s meets WCAG AA (4.5:1)', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('main reading text meets AAA (7:1)', () => {
    expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(7);
    expect(contrast(colors.text, colors.surface)).toBeGreaterThanOrEqual(7);
  });
});
