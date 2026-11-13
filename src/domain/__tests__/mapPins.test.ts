import { PIN_STYLES, pinStyle } from '../mapPins';
import { VENUE_LABELS, type VenueType } from '../types';

const TYPES = Object.keys(VENUE_LABELS) as VenueType[];

describe('map pins', () => {
  it('maps every venue type', () => {
    for (const type of TYPES) {
      const style = pinStyle(type);
      expect(style.symbol).toMatch(/\.fill$/);
      expect(style.color).toMatch(/^(green|orange|blue|purple)$/);
      expect(style.label).toBe(VENUE_LABELS[type]);
    }
    expect(Object.keys(PIN_STYLES).sort()).toEqual([...TYPES].sort());
  });

  it('gives each type its own glyph and colour', () => {
    expect(new Set(TYPES.map((t) => PIN_STYLES[t].symbol)).size).toBe(TYPES.length);
    expect(new Set(TYPES.map((t) => PIN_STYLES[t].color)).size).toBe(TYPES.length);
  });
});
