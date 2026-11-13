/** Earthy palette. Text/background pairs meet WCAG AA (4.5:1) or better. */
export const colors = {
  background: '#F7F1E5', // cream
  surface: '#FFFDF7',
  text: '#2A2118', // dark soil
  textMuted: '#5B4F42',
  primary: '#3E5C2A', // paddock green
  onPrimary: '#FFFFFF',
  accent: '#A04A22', // terracotta
  border: '#D9CDB6',
  chip: '#EDE3CE',
  open: '#2E6B2E',
  closed: '#8A3B1F',
  sampleBackground: '#FFE9A8',
  sampleText: '#5A4300',
} as const;

/** Base text is 18 pt (larger than the usual 16–17) and scales with Dynamic Type. */
export const font = {
  small: 16,
  body: 18,
  large: 20,
  title: 22,
  heading: 26,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { chip: 26, card: 16 } as const;

/** Minimum touch target height (Apple recommends 44 pt; we go bigger). */
export const MIN_TAP = 52;
