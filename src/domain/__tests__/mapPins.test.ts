import { PIN_STYLES, pinAccessibilityLabel, pinStyle } from '../mapPins';
import { VENUE_LABELS, type VenueType } from '../types';

const TYPES = Object.keys(VENUE_LABELS) as VenueType[];

describe('map pins', () => {
  it('maps every venue type', () => {
    for (const type of TYPES) {
      const style = pinStyle(type);
      expect(style.symbol).toMatch(/\.fill$/);
      expect(style.color).toMatch(/^(green|orange|blue|purple|pink)$/);
      expect(style.label).toBe(VENUE_LABELS[type]);
    }
    expect(Object.keys(PIN_STYLES).sort()).toEqual([...TYPES].sort());
  });

  it('gives each type its own glyph and colour', () => {
    expect(new Set(TYPES.map((t) => PIN_STYLES[t].symbol)).size).toBe(TYPES.length);
    expect(new Set(TYPES.map((t) => PIN_STYLES[t].color)).size).toBe(TYPES.length);
  });

  it('covers all five venue types', () => {
    expect([...TYPES].sort()).toEqual(['butcher', 'farm', 'farm_gate_stall', 'farm_shop', 'farmers_market']);
  });

  it('draws butchers as a pink storefront', () => {
    expect(pinStyle('butcher')).toEqual({ symbol: 'storefront.fill', color: 'pink', label: 'Butcher' });
    expect(pinAccessibilityLabel({ name: 'Smith St Butchery', type: 'butcher' }, 'Open now')).toBe(
      'Smith St Butchery, Butcher, Open now',
    );
  });

  it('labels a pin with name, kind and status, and flags approximate locations', () => {
    expect(pinAccessibilityLabel({ name: 'Bilpin Fruit Bowl', type: 'farm_shop' }, 'Open now · closes 5:00 pm')).toBe(
      'Bilpin Fruit Bowl, Farm shop, Open now · closes 5:00 pm',
    );
    expect(pinAccessibilityLabel({ name: 'Hill Farm', type: 'farm', locationApprox: true }, 'Closed')).toBe(
      `Hill Farm, ${VENUE_LABELS.farm}, Closed, approximate location`,
    );
  });
});
