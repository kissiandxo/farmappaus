import type { LatLng, MapRegion } from './geo';

/** Anything with an id and a position can be clustered. */
export interface ClusterInput extends LatLng {
  id: string;
}

export interface PinBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** One group of nearby pins. `count === 1` means a lone pin, shown as itself. */
export interface PinCluster<T extends ClusterInput = ClusterInput> {
  /**
   * A lone pin's own id, or `z<zoom>:<cx>:<cy>` for a group (the first of its cells on the fixed lattice).
   * Stable while the zoom level and the membership stay the same, so panning never re-keys a cluster.
   */
  id: string;
  /** Centroid of the members. */
  lat: number;
  lng: number;
  count: number;
  /** Members sorted by id. */
  members: T[];
  bounds: PinBounds;
}

/** Size of the map view in points (from onLayout). */
export interface MapSize {
  width: number;
  height: number;
}

/** Used until the map has been measured: an iPhone-sized view. */
export const DEFAULT_MAP_SIZE: MapSize = { width: 390, height: 700 };

/** Side of one square clustering cell, in screen points (a little more than a pin and its gap). */
export const CELL_PT = 56;

/** At this integer zoom and closer (about 0.005° of longitude across the map) nothing is clustered. */
export const NO_CLUSTER_ZOOM = 16;

/** Smallest region a cluster zoom goes to (about 450 m). Its zoom is past `NO_CLUSTER_ZOOM`, so stacked pins split. */
export const MIN_CLUSTER_ZOOM_DELTA = 0.004;

/** Integer zoom level for a region: 0 shows the whole world (360° of longitude) across the map. */
export function zoomForRegion(region: Pick<MapRegion, 'longitudeDelta'>): number {
  const delta = Math.min(360, Math.max(1e-6, region.longitudeDelta));
  return Math.max(0, Math.round(Math.log2(360 / delta)));
}

/**
 * Screen-point position of a point on a Web Mercator world `worldSize` points wide, measured from
 * lat/lng 0 (so the lattice is anchored there and never moves when the map pans).
 */
function project(p: LatLng, worldSize: number): { x: number; y: number } {
  const lat = Math.max(-85, Math.min(85, p.lat));
  const rad = (lat * Math.PI) / 180;
  const mercator = Math.log(Math.tan(Math.PI / 4 + rad / 2));
  return { x: (p.lng / 360) * worldSize, y: (-mercator / (2 * Math.PI)) * worldSize };
}

function boundsOf(points: LatLng[]): PinBounds {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function makeCluster<T extends ClusterInput>(members: T[], groupId: string): PinCluster<T> {
  const sorted = [...members].sort(byId);
  const count = sorted.length;
  const lat = sorted.reduce((sum, m) => sum + m.lat, 0) / count;
  const lng = sorted.reduce((sum, m) => sum + m.lng, 0) / count;
  return {
    id: count === 1 ? sorted[0].id : groupId,
    lat,
    lng,
    count,
    members: sorted,
    bounds: boundsOf(sorted),
  };
}

interface Cell<T> {
  key: string;
  members: T[];
  x: number;
  y: number;
}

/**
 * Groups pins that would overlap on screen. Works at an integer zoom level on a fixed lattice of square
 * `CELL_PT` cells anchored at lat/lng 0, so panning never moves a cell edge and small zoom changes (within
 * the same integer level) change nothing. One merge pass then joins groups whose centres are less than a
 * cell apart, so two pins either side of a cell edge still merge.
 *
 * Pure and deterministic: the same pins in any order give the same result, sorted by id. Only the map
 * width matters (it sets how many degrees a point covers); the height is accepted for symmetry.
 */
export function clusterPins<T extends ClusterInput>(
  pins: T[],
  zoom: number,
  size: MapSize = DEFAULT_MAP_SIZE,
): PinCluster<T>[] {
  if (pins.length === 0) return [];
  const z = Math.max(0, Math.round(zoom));

  if (z >= NO_CLUSTER_ZOOM) {
    return pins.map((p) => makeCluster([p], p.id)).sort(byId);
  }

  const worldSize = Math.pow(2, z) * Math.max(1, size.width);
  const cells = new Map<string, Cell<T>>();
  for (const pin of pins) {
    const { x, y } = project(pin, worldSize);
    const key = `z${z}:${Math.floor(x / CELL_PT)}:${Math.floor(y / CELL_PT)}`;
    const cell = cells.get(key);
    if (cell) cell.members.push(pin);
    else cells.set(key, { key, members: [pin], x: 0, y: 0 });
  }

  // Centre of each cell's members, in screen points.
  const list = [...cells.values()];
  for (const cell of list) {
    let sx = 0;
    let sy = 0;
    for (const m of cell.members) {
      const p = project(m, worldSize);
      sx += p.x;
      sy += p.y;
    }
    cell.x = sx / cell.members.length;
    cell.y = sy / cell.members.length;
  }

  // One merge pass: biggest cells first (ties by key), each absorbing unclaimed cells within one cell width.
  list.sort((a, b) => b.members.length - a.members.length || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const taken = new Set<string>();
  const groups: { key: string; members: T[] }[] = [];
  for (const cell of list) {
    if (taken.has(cell.key)) continue;
    taken.add(cell.key);
    const keys = [cell.key];
    const members = [...cell.members];
    for (const other of list) {
      if (taken.has(other.key)) continue;
      if (Math.hypot(other.x - cell.x, other.y - cell.y) < CELL_PT) {
        taken.add(other.key);
        keys.push(other.key);
        members.push(...other.members);
      }
    }
    keys.sort();
    groups.push({ key: keys[0], members });
  }

  return groups.map((g) => makeCluster(g.members, g.key)).sort(byId);
}

/** Region that frames a cluster's members with some breathing room. Used when a cluster is tapped. */
export function clusterRegion(cluster: { bounds: PinBounds }): MapRegion {
  const { minLat, maxLat, minLng, maxLng } = cluster.bounds;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, MIN_CLUSTER_ZOOM_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, MIN_CLUSTER_ZOOM_DELTA),
  };
}

/** The two opposite corners of a region, for `fitToCoordinates`. */
export function regionCorners(region: MapRegion): LatLng[] {
  return [
    { lat: region.latitude - region.latitudeDelta / 2, lng: region.longitude - region.longitudeDelta / 2 },
    { lat: region.latitude + region.latitudeDelta / 2, lng: region.longitude + region.longitudeDelta / 2 },
  ];
}

/**
 * True when the map has moved far enough from where the location was last set to offer "Set location
 * here": the centre moved more than `fraction` of the smaller of the two views (so zooming in then panning
 * a little still counts), or the zoom changed more than 4× either way.
 */
export function hasMovedFar(anchor: MapRegion, current: MapRegion, fraction = 0.4): boolean {
  const latSpan = Math.min(anchor.latitudeDelta, current.latitudeDelta);
  const lngSpan = Math.min(anchor.longitudeDelta, current.longitudeDelta);
  const dLat = Math.abs(current.latitude - anchor.latitude) / latSpan;
  const dLng = Math.abs(current.longitude - anchor.longitude) / lngSpan;
  const zoomRatio = current.longitudeDelta / anchor.longitudeDelta;
  return dLat > fraction || dLng > fraction || zoomRatio > 4 || zoomRatio < 1 / 4;
}

/**
 * Latitude to centre the map on so a point at `lat` sits in the middle of the uncovered part of the map,
 * given how much of the map's height is covered at the top and bottom (in points).
 */
export function centreLatitudeFor(
  lat: number,
  latitudeDelta: number,
  covered: { top: number; bottom: number },
  mapHeight: number,
): number {
  if (mapHeight <= 0) return lat;
  return lat - (latitudeDelta * ((covered.bottom - covered.top) / 2)) / mapHeight;
}
