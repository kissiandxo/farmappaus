// bundledFarms() returns REAL_FARMS; imported directly so the test doesn't load the Supabase client.
import { REAL_FARMS } from '../../data/realFarms';
import { boundingRegion, type MapRegion } from '../geo';
import {
  CELL_PT,
  centreLatitudeFor,
  clusterPins,
  clusterRegion,
  hasMovedFar,
  MIN_CLUSTER_ZOOM_DELTA,
  NO_CLUSTER_ZOOM,
  regionCorners,
  zoomForRegion,
  type MapSize,
} from '../mapCluster';

const pin = (id: string, lat: number, lng: number) => ({ id, lat, lng });
const phone: MapSize = { width: 390, height: 700 };

const wide: MapRegion = { latitude: -33.9, longitude: 151.2, latitudeDelta: 2, longitudeDelta: 2 };
const close: MapRegion = { latitude: -33.9, longitude: 151.2, latitudeDelta: 0.05, longitudeDelta: 0.05 };
const zWide = zoomForRegion(wide);
const zClose = zoomForRegion(close);

const realPins = REAL_FARMS.map((f) => ({ id: f.id, lat: f.lat, lng: f.lng }));

/** Clusters as they would be drawn for a region: those whose centre is inside the view. */
function inView(region: MapRegion) {
  const z = zoomForRegion(region);
  return clusterPins(realPins, z, phone).filter(
    (c) =>
      Math.abs(c.lat - region.latitude) <= region.latitudeDelta / 2 &&
      Math.abs(c.lng - region.longitude) <= region.longitudeDelta / 2,
  );
}

describe('zoomForRegion', () => {
  it('rounds to an integer zoom level', () => {
    expect(zoomForRegion({ longitudeDelta: 360 })).toBe(0);
    expect(zoomForRegion({ longitudeDelta: 45 })).toBe(3);
    expect(zoomForRegion({ longitudeDelta: 45 * 1.03 })).toBe(3);
    expect(zoomForRegion({ longitudeDelta: 45 * 0.97 })).toBe(3);
  });
});

describe('clusterPins', () => {
  it('returns nothing for no pins', () => {
    expect(clusterPins([], zWide, phone)).toEqual([]);
  });

  it('returns a lone pin as itself', () => {
    const [only] = clusterPins([pin('a', -33.9, 151.2)], zWide, phone);
    expect(only).toMatchObject({ id: 'a', count: 1, lat: -33.9, lng: 151.2 });
  });

  it('merges nearby pins when zoomed out and splits them when zoomed in', () => {
    const pins = [pin('a', -33.9, 151.2), pin('b', -33.905, 151.205), pin('c', -33.91, 151.21)];
    expect(clusterPins(pins, zWide, phone)).toHaveLength(1);
    expect(clusterPins(pins, zClose, phone).length).toBeGreaterThan(1);
  });

  it('never clusters at street level', () => {
    const pins = [pin('a', -33.9, 151.2), pin('b', -33.9, 151.2)];
    expect(clusterPins(pins, NO_CLUSTER_ZOOM, phone).map((c) => c.count)).toEqual([1, 1]);
  });

  it('keeps far-apart pins separate', () => {
    const pins = [pin('syd', -33.87, 151.21), pin('per', -31.95, 115.86)];
    expect(clusterPins(pins, zoomForRegion({ longitudeDelta: 60 }), phone)).toHaveLength(2);
  });

  it('gives groups a lattice key and lone pins their own id', () => {
    const pins = [pin('a', -33.9, 151.2), pin('b', -33.9001, 151.2001), pin('far', -12.4, 130.8)];
    const clusters = clusterPins(pins, 5, phone);
    expect(clusters.map((c) => c.id).sort()).toEqual(expect.arrayContaining(['far']));
    const group = clusters.find((c) => c.count === 2);
    expect(group?.id).toMatch(/^z5:-?\d+:-?\d+$/);
  });

  it('counts always add up to the number of pins', () => {
    const pins = Array.from({ length: 40 }, (_, i) => pin(`p${i}`, -33 - (i % 7) * 0.13, 151 + (i % 5) * 0.17));
    for (const z of [zWide, zClose, 3, 0]) {
      const total = clusterPins(pins, z, phone).reduce((sum, c) => sum + c.count, 0);
      expect(total).toBe(pins.length);
    }
    for (const z of [0, 3, 5, 8, 12]) {
      expect(clusterPins(realPins, z, phone).reduce((sum, c) => sum + c.count, 0)).toBe(realPins.length);
    }
  });

  it('has bounds that contain every member and a centroid inside them', () => {
    const pins = Array.from({ length: 25 }, (_, i) => pin(`p${i}`, -33.5 - (i % 5) * 0.02, 151 + Math.floor(i / 5) * 0.02));
    for (const c of clusterPins(pins, zWide, phone)) {
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
    const a = clusterPins(realPins, 5, phone);
    const b = clusterPins([...realPins].reverse(), 5, phone);
    expect(b).toEqual(a);
    expect(clusterPins(realPins, 5, phone)).toEqual(a);
  });

  it('keeps every key through a ±3% zoom (real listings)', () => {
    for (const delta of [45, 12, 3, 0.7]) {
      const region: MapRegion = { latitude: -33.5, longitude: 150.5, latitudeDelta: delta, longitudeDelta: delta };
      const keys = (r: MapRegion) => clusterPins(realPins, zoomForRegion(r), phone).map((c) => c.id);
      const base = keys(region);
      expect(keys({ ...region, latitudeDelta: delta * 1.03, longitudeDelta: delta * 1.03 })).toEqual(base);
      expect(keys({ ...region, latitudeDelta: delta * 0.97, longitudeDelta: delta * 0.97 })).toEqual(base);
    }
  });

  it('keeps the key of every cluster still in view after a pan (real listings)', () => {
    for (const delta of [12, 3, 1]) {
      const start: MapRegion = { latitude: -33.7, longitude: 151.0, latitudeDelta: delta, longitudeDelta: delta };
      const panned: MapRegion = { ...start, latitude: start.latitude - delta * 0.3, longitude: start.longitude + delta * 0.25 };
      const before = new Map(inView(start).map((c) => [c.id, c.members.map((m) => m.id).join(',')]));
      const after = inView(panned);
      for (const c of after) {
        const sameMembers = [...before.entries()].find(([, members]) => members === c.members.map((m) => m.id).join(','));
        if (sameMembers) expect(c.id).toBe(sameMembers[0]);
      }
    }
  });

  it('merges two pins either side of a cell edge at continental zoom', () => {
    const z = 3;
    const worldSize = 2 ** z * phone.width;
    const edgeLng = (CELL_PT * 3 * 360) / worldSize; // a vertical cell edge on the fixed lattice
    const left = pin('left', -30, edgeLng - 0.05);
    const right = pin('right', -30, edgeLng + 0.05);
    const clusters = clusterPins([left, right], z, phone);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].count).toBe(2);
  });
});

describe('clusterRegion', () => {
  it('frames all members with room to spare', () => {
    const pins = [pin('a', -33.9, 151.2), pin('b', -33.85, 151.3)];
    const [cluster] = clusterPins(pins, zWide, phone);
    expect(cluster.count).toBe(2);
    const region = clusterRegion(cluster);
    expect(region.latitude).toBeCloseTo(-33.875);
    expect(region.longitude).toBeCloseTo(151.25);
    expect(region.latitudeDelta).toBeCloseTo(0.08);
    expect(region.longitudeDelta).toBeCloseTo(0.16);
  });

  it('has a minimum zoom so stacked pins still split', () => {
    const [cluster] = clusterPins([pin('a', -33.9, 151.2), pin('b', -33.9, 151.2)], zWide, phone);
    const region = clusterRegion(cluster);
    expect(zoomForRegion(region)).toBeGreaterThanOrEqual(NO_CLUSTER_ZOOM);
    expect(clusterPins(cluster.members, zoomForRegion(region), phone).map((c) => c.count)).toEqual([1, 1]);
  });

  it('zooming to a cluster splits it', () => {
    const pins = [pin('a', -33.9, 151.2), pin('b', -33.8, 151.3), pin('c', -33.85, 151.25)];
    const [cluster] = clusterPins(pins, zWide, phone);
    expect(cluster.count).toBe(3);
    expect(clusterPins(cluster.members, zoomForRegion(clusterRegion(cluster)), phone).length).toBeGreaterThan(1);
  });

  it('gives two corners spanning the region', () => {
    const [sw, ne] = regionCorners(close);
    expect(ne.lat - sw.lat).toBeCloseTo(close.latitudeDelta);
    expect(ne.lng - sw.lng).toBeCloseTo(close.longitudeDelta);
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

  it('measures against the smaller of the two views', () => {
    expect(hasMovedFar(close, { ...close, latitude: close.latitude + 0.03 })).toBe(true);
    // Zoomed in 3× and panned 0.3°: small next to the anchor view, but most of the current one.
    const zoomedIn: MapRegion = { ...wide, latitude: wide.latitude + 0.3, latitudeDelta: 0.7, longitudeDelta: 0.7 };
    expect(hasMovedFar(wide, zoomedIn)).toBe(true);
  });

  it('flags a zoom change of more than 4×', () => {
    expect(hasMovedFar(wide, { ...wide, latitudeDelta: 10, longitudeDelta: 10 })).toBe(true);
    expect(hasMovedFar(wide, { ...wide, latitudeDelta: 0.4, longitudeDelta: 0.4 })).toBe(true);
    expect(hasMovedFar(wide, { ...wide, latitudeDelta: 3, longitudeDelta: 3 })).toBe(false);
  });
});

describe('centreLatitudeFor', () => {
  it('moves the centre south when more of the bottom is covered, so the pin sits higher', () => {
    const lat = centreLatitudeFor(-33, 1, { top: 100, bottom: 300 }, 800);
    expect(lat).toBeCloseTo(-33 - 100 / 800);
  });

  it('leaves the latitude alone when the map is unmeasured or evenly covered', () => {
    expect(centreLatitudeFor(-33, 1, { top: 100, bottom: 300 }, 0)).toBe(-33);
    expect(centreLatitudeFor(-33, 1, { top: 200, bottom: 200 }, 800)).toBe(-33);
  });
});

describe('tapping a cluster', () => {
  // FarmMap frames a tapped cluster with boundingRegion(regionCorners(clusterRegion(c)), MIN_CLUSTER_ZOOM_DELTA)
  // inside 24 pt side padding and roughly 150 pt of top and bottom chrome.
  const SIDE = 24;
  const CHROME_V = 150;
  const zoomAfterTap = (c: Parameters<typeof clusterRegion>[0]) => {
    const r = boundingRegion(regionCorners(clusterRegion(c)), MIN_CLUSTER_ZOOM_DELTA);
    const lngFromWidth = (r.longitudeDelta * phone.width) / (phone.width - 2 * SIDE);
    // Express the latitude span as an equivalent longitude span (Mercator) and scale it to the map width.
    const latAsLng = r.latitudeDelta / Math.cos((r.latitude * Math.PI) / 180);
    const lngFromHeight = (latAsLng * phone.width) / (phone.height - CHROME_V);
    return zoomForRegion({ longitudeDelta: Math.max(lngFromWidth, lngFromHeight) });
  };

  it.each([8, 9, 10, 11, 12])('splits every bundled cluster at zoom %i', (z) => {
    const stuck = clusterPins(REAL_FARMS, z, phone)
      .filter((c) => c.count > 1)
      .filter((c) => clusterPins(c.members, zoomAfterTap(c), phone).length <= 1)
      .map((c) => c.members.map((m) => m.name).join(' | '));
    expect(stuck).toEqual([]);
  });
});
