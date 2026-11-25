import { boundingRegion, formatDistance, haversineKm, isInAustralia, nearbyPlaces } from '../geo';
import { makeFarm } from './fixtures';

describe('boundingRegion', () => {
  it('centres on the points and pads them', () => {
    const r = boundingRegion([{ lat: -34, lng: 150 }, { lat: -32, lng: 152 }]);
    expect(r.latitude).toBeCloseTo(-33);
    expect(r.longitude).toBeCloseTo(151);
    expect(r.latitudeDelta).toBeCloseTo(2.8);
    expect(r.longitudeDelta).toBeCloseTo(2.8);
  });

  it('never zooms in closer than the minimum, even for a single point', () => {
    const r = boundingRegion([{ lat: -27.5, lng: 152 }], 0.3);
    expect(r.latitudeDelta).toBe(0.3);
    expect(r.longitudeDelta).toBe(0.3);
  });
});

const SYDNEY = { lat: -33.8688, lng: 151.2093 };
const MELBOURNE = { lat: -37.8136, lng: 144.9631 };

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(SYDNEY, SYDNEY)).toBe(0);
  });

  it('gives roughly 714 km between Sydney and Melbourne', () => {
    const km = haversineKm(SYDNEY, MELBOURNE);
    expect(km).toBeGreaterThan(700);
    expect(km).toBeLessThan(725);
  });

  it('is symmetric', () => {
    expect(haversineKm(SYDNEY, MELBOURNE)).toBeCloseTo(haversineKm(MELBOURNE, SYDNEY), 6);
  });
});

describe('formatDistance', () => {
  it('uses metres under 1 km, rounded to 50 m', () => {
    expect(formatDistance(0.4)).toBe('400 m');
    expect(formatDistance(0.97)).toBe('950 m');
  });

  it('never prints 1000 m', () => {
    expect(formatDistance(0.99)).toBe('1.0 km');
  });

  it('uses one decimal under 10 km', () => {
    expect(formatDistance(3.44)).toBe('3.4 km');
  });

  it('uses whole kilometres from 10 km, with thousands separators', () => {
    expect(formatDistance(12.6)).toBe('13 km');
    expect(formatDistance(1234)).toBe('1,234 km');
  });
});

describe('approximate distances', () => {
  it('rounds to whole kilometres with "about", never below 1 km', () => {
    expect(formatDistance(3.4, true)).toBe('about 3 km');
    expect(formatDistance(0.2, true)).toBe('about 1 km');
    expect(formatDistance(1234.4, true)).toBe('about 1,234 km');
    expect(formatDistance(3.4)).toBe('3.4 km');
  });
});

describe('nearbyPlaces', () => {
  const here = makeFarm({ id: 'here', name: 'Here', lat: -33.9, lng: 151.2 });
  const close = makeFarm({ id: 'close', name: 'Close', lat: -33.95, lng: 151.2 }); // ~5.6 km
  const alsoClose = makeFarm({ id: 'also', name: 'Also close', lat: -33.85, lng: 151.2 }); // ~5.6 km
  const far = makeFarm({ id: 'far', name: 'Far', lat: -34.9, lng: 151.2 }); // ~111 km

  it('excludes the place itself and sorts by distance then name', () => {
    const result = nearbyPlaces(here, [far, close, here, alsoClose]);
    expect(result.map((r) => r.farm.id)).toEqual(['also', 'close']);
    expect(result[0].distanceKm).toBeGreaterThan(5);
  });

  it('honours maxKm and limit, and returns [] when nothing is near', () => {
    expect(nearbyPlaces(here, [far, close, alsoClose], { maxKm: 200 }).map((r) => r.farm.id)).toEqual(['also', 'close', 'far']);
    expect(nearbyPlaces(here, [far, close, alsoClose], { limit: 1 })).toHaveLength(1);
    expect(nearbyPlaces(here, [here, far])).toEqual([]);
  });

  it('does not confuse Red Hill VIC with Red Hill QLD', () => {
    const redHillVic = makeFarm({ id: 'rh-vic', name: 'Red Hill', state: 'VIC', lat: -38.38, lng: 145.01 });
    const redHillQld = makeFarm({ id: 'rh-qld', name: 'Red Hill', state: 'QLD', lat: -27.45, lng: 153.0 });
    const mainRidge = makeFarm({ id: 'mr', name: 'Main Ridge', state: 'VIC', lat: -38.4, lng: 144.97 });
    expect(nearbyPlaces(redHillVic, [redHillQld, mainRidge]).map((r) => r.farm.id)).toEqual(['mr']);
  });
});

describe('isInAustralia', () => {
  it.each([
    ['Hobart', -42.88, 147.33, true],
    ['Darwin', -12.46, 130.84, true],
    ['Perth', -31.95, 115.86, true],
    ['Apple Park', 37.33, -122.01, false],
  ])('%s', (_name, lat, lng, expected) => {
    expect(isInAustralia({ lat: lat as number, lng: lng as number })).toBe(expected);
  });
});
