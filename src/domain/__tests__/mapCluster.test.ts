import { clusterPins, clusterRegion, hasMovedFar, NO_CLUSTER_BELOW_DELTA } from '../mapCluster';
import type { MapRegion } from '../geo';

const pin = (id: string, lat: number, lng: number) => ({ id, lat, lng });

const wide: MapRegion = { latitude: -33.9, longitude: 151.2, latitudeDelta: 2, longitudeDelta: 2 };
const close: MapRegion = { latitude: -33.9, longitude: 151.2, latitudeDelta: 0.05, longitudeDelta: 0.05 };

describe('clusterPins', () => {
  it('returns nothing for no pins', () => {
    expect(clusterPins([], wide)).toEqual([]);
  });

  it('returns a lone pin as itself', () => {
    const [only] = clusterPins([pin('a', -33.9, 151.2)], wide);
    expect(only).toMatchObject({ id: 'a', count: 1, lat: -33.9, lng: 151.2 });
  });

  it('merges nearby pins when zoomed out and splits them when zoomed in', () => {
    const pins = [pin('a', -33.9, 151.2), pin('b', -33.905, 151.205), pin('c', -33.91, 151.21)];
    expect(clusterPins(pins, wide)).toHaveLength(1);
    expect(clusterPins(pins, close).length).toBeGreaterThan(1);
  });

  it('never clusters at street level', () => {
    const tight: MapRegion = { ...close, latitudeDelta: NO_CLUSTER_BELOW_DELTA / 2, longitudeDelta: 0.001 };
    const pins = [pin('a', -33.9, 151.2), pin('b', -33.9, 151.2)];
    expect(clusterPins(pins, tight).map((c) => c.count)).toEqual([1, 1]);
  });

  it('keeps far-apart pins separate', () => {
    const pins = [pin('syd', -33.87, 151.21), pin('per', -31.95, 115.86)];
    const world: MapRegion = { latitude: -30, longitude: 133, latitudeDelta: 40, longitudeDelta: 60 };
    expect(clusterPins(pins, world)).toHaveLength(2);
  });

  it('counts always add up to the number of pins', () => {
    const pins = Array.from({ length: 40 }, (_, i) => pin(`p${i}`, -33 - (i % 7) * 0.13, 151 + (i % 5) * 0.17));
    for (const region of [wide, close, { ...wide, latitudeDelta: 8, longitudeDelta: 8 }]) {
      const total = clusterPins(pins, region).reduce((sum, c) => sum + c.count, 0);
      expect(total).toBe(pins.length);
    }
  });

  it('has bounds that contain every member and a centroid inside them', () => {
    const pins = Array.from({ length: 25 }, (_, i) => pin(`p${i}`, -33.5 - (i % 5) * 0.02, 151 + Math.floor(i / 5) * 0.02));
    for (const c of clusterPins(pins, wide)) {
      for (const m of c.members) {
        expect(m.lat).toBeGreaterThanOrEqual(c.bounds.minLat);
        expect(m.lat).toBeLessThanOrEqual(c.bounds.maxLat);
        expect(m.lng).toBeGreaterThanOrEqual(c.bounds.minLng);
        expect(m.lng).toBeLessThanOrEqual(c.bounds.maxLng);
      }
      expect(c.lat).toBeGreaterThanOrEqual(c.bounds.minLat);
      expect(c.lat).toBeLessThanOrEqual(c.bounds.maxLat);
      expect(c.members).toHaveLength(c.count);
    }
  });

  it('is deterministic regardless of input order', () => {
    const pins = Array.from({ length: 20 }, (_, i) => pin(`p${i}`, -33.5 - (i % 4) * 0.05, 151 + (i % 3) * 0.06));
    const a = clusterPins(pins, wide);
    const b = clusterPins([...pins].reverse(), wide);
    expect(b).toEqual(a);
    expect(clusterPins(pins, wide)).toEqual(a);
  });
});

describe('clusterRegion', () => {
  it('frames all members with room to spare', () => {
    const pins = [pin('a', -33.9, 151.2), pin('b', -33.85, 151.3)];
    const [cluster] = clusterPins(pins, wide);
    expect(cluster.count).toBe(2);
    const region = clusterRegion(cluster);
    expect(region.latitude).toBeCloseTo(-33.875);
    expect(region.longitude).toBeCloseTo(151.25);
    expect(region.latitudeDelta).toBeCloseTo(0.08);
    expect(region.longitudeDelta).toBeCloseTo(0.16);
  });

  it('has a minimum zoom so stacked pins still split', () => {
    const [cluster] = clusterPins([pin('a', -33.9, 151.2), pin('b', -33.9, 151.2)], wide);
    const region = clusterRegion(cluster);
    expect(region.latitudeDelta).toBeLessThan(NO_CLUSTER_BELOW_DELTA);
    expect(clusterPins(cluster.members, region).map((c) => c.count)).toEqual([1, 1]);
  });

  it('zooming to a cluster splits it', () => {
    const pins = [pin('a', -33.9, 151.2), pin('b', -33.8, 151.3), pin('c', -33.85, 151.25)];
    const [cluster] = clusterPins(pins, wide);
    expect(cluster.count).toBe(3);
    expect(clusterPins(cluster.members, clusterRegion(cluster)).length).toBeGreaterThan(1);
  });
});

describe('hasMovedFar', () => {
  it('ignores small pans', () => {
    expect(hasMovedFar(wide, { ...wide, latitude: wide.latitude + 0.1 })).toBe(false);
  });

  it('flags a pan of more than 40% of the view', () => {
    expect(hasMovedFar(wide, { ...wide, longitude: wide.longitude + 1 })).toBe(true);
    expect(hasMovedFar(wide, { ...wide, latitude: wide.latitude - 1 })).toBe(true);
  });

  it('measures against the anchor view size', () => {
    expect(hasMovedFar(close, { ...close, latitude: close.latitude + 0.03 })).toBe(true);
  });
});
