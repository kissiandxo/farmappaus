import { boundingRegion, formatDistance, haversineKm } from '../geo';

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
