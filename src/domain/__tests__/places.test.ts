import { formatPlace, nearestPlace, parseQuery, searchPlaces, type Place } from '../places';

const small: Place[] = [
  { postcode: '4350', locality: 'Toowoomba', state: 'QLD', lat: -27.56, lng: 151.95 },
  { postcode: '4350', locality: 'Toowoomba South', state: 'QLD', lat: -27.6, lng: 151.95 },
  { postcode: '3937', locality: 'Red Hill', state: 'VIC', lat: -38.38, lng: 145.03 },
  { postcode: '4169', locality: 'Red Hill', state: 'QLD', lat: -27.46, lng: 153.0 },
  { postcode: '2800', locality: 'Orange', state: 'NSW', lat: -33.28, lng: 149.1 },
  { postcode: '2000', locality: 'Sydney', state: 'NSW', lat: -33.87, lng: 151.21 },
];

describe('parseQuery', () => {
  it('splits name, postcode and state', () => {
    expect(parseQuery('Red Hill VIC 3937')).toEqual({ name: 'red hill', postcode: '3937', state: 'VIC' });
    expect(parseQuery('  toowoomba ')).toEqual({ name: 'toowoomba', postcode: '', state: null });
    expect(parseQuery('4350')).toEqual({ name: '', postcode: '4350', state: null });
  });

  it('does not treat a lone state-like word as a state', () => {
    expect(parseQuery('SA')).toEqual({ name: 'sa', postcode: '', state: null });
  });
});

describe('searchPlaces (small fixture)', () => {
  it('ranks exact name before prefix matches', () => {
    expect(searchPlaces('toowoomba', { places: small }).map((p) => p.locality)).toEqual([
      'Toowoomba',
      'Toowoomba South',
    ]);
  });

  it('finds by postcode, exact first', () => {
    const found = searchPlaces('4350', { places: small });
    expect(found.map((p) => p.locality)).toEqual(['Toowoomba', 'Toowoomba South']);
  });

  it('needs at least 3 digits for a postcode prefix and 2 letters for a name', () => {
    expect(searchPlaces('43', { places: small })).toEqual([]);
    expect(searchPlaces('t', { places: small })).toEqual([]);
    expect(searchPlaces('435', { places: small })).toHaveLength(2);
  });

  it('uses state and postcode to separate same-named suburbs', () => {
    expect(searchPlaces('red hill', { places: small })).toHaveLength(2);
    expect(searchPlaces('red hill vic', { places: small }).map((p) => p.state)).toEqual(['VIC']);
    expect(searchPlaces('red hill 4169', { places: small }).map((p) => p.state)).toEqual(['QLD']);
  });

  it('matches the start of later words and respects the limit', () => {
    expect(searchPlaces('south', { places: small }).map((p) => p.locality)).toEqual(['Toowoomba South']);
    expect(searchPlaces('red hill', { places: small, limit: 1 })).toHaveLength(1);
  });

  it('is case-insensitive and returns nothing for unknown places', () => {
    expect(searchPlaces('ORANGE', { places: small })).toHaveLength(1);
    expect(searchPlaces('nowheresville', { places: small })).toEqual([]);
  });
});

describe('formatPlace and nearestPlace', () => {
  it('formats in Australian order', () => {
    expect(formatPlace(small[0])).toBe('Toowoomba QLD 4350');
  });

  it('finds the closest suburb to a point', () => {
    expect(nearestPlace({ lat: -33.3, lng: 149.1 }, small)?.locality).toBe('Orange');
    expect(nearestPlace({ lat: 0, lng: 0 }, [])).toBeNull();
  });
});

describe('bundled Australian postcode data', () => {
  it('finds well-known places in every state and territory', () => {
    const cases: [string, string][] = [
      ['sydney nsw', 'NSW'],
      ['melbourne vic', 'VIC'],
      ['brisbane city', 'QLD'],
      ['adelaide sa', 'SA'],
      ['perth wa', 'WA'],
      ['hobart tas', 'TAS'],
      ['darwin city', 'NT'],
      ['canberra', 'ACT'],
    ];
    for (const [query, state] of cases) {
      const found = searchPlaces(query);
      expect({ query, states: found.map((p) => p.state) }).toEqual({
        query,
        states: expect.arrayContaining([state]),
      });
    }
  });

  it('finds Toowoomba by name and by postcode, with Australian coordinates', () => {
    const byName = searchPlaces('toowoomba');
    expect(byName[0]).toMatchObject({ locality: 'Toowoomba', state: 'QLD' });
    expect(byName[0].lat).toBeLessThan(-27);
    // A postcode covers many suburbs, so look through more than the default 8.
    expect(searchPlaces('4350', { limit: 100 }).some((p) => p.locality === 'Toowoomba')).toBe(true);
  });

  it('names a GPS fix without the network', () => {
    const near = nearestPlace({ lat: -27.5598, lng: 151.9507 });
    expect(near?.state).toBe('QLD');
  });
});
