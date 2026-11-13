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

/** One grid cell's worth of pins. `count === 1` means a lone pin, shown as itself. */
export interface PinCluster<T extends ClusterInput = ClusterInput> {
  /** Stable for the same members: the lone pin's id, or `cluster:<first member id>:<count>`. */
  id: string;
  /** Centroid of the members. */
  lat: number;
  lng: number;
  count: number;
  /** Members sorted by id. */
  members: T[];
  bounds: PinBounds;
}

/** The grid has this many columns and rows across the visible map (cells are ~40 pt on a phone). */
export const GRID_CELLS = 9;

/** Below this zoom (degrees of latitude visible) nothing is clustered, so stacked pins stay visible. */
export const NO_CLUSTER_BELOW_DELTA = 0.005;

/** Smallest region a cluster zoom goes to (about 450 m). Below `NO_CLUSTER_BELOW_DELTA`, so stacked pins split. */
export const MIN_CLUSTER_ZOOM_DELTA = 0.004;

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

function makeCluster<T extends ClusterInput>(members: T[]): PinCluster<T> {
  const sorted = [...members].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const count = sorted.length;
  const lat = sorted.reduce((sum, m) => sum + m.lat, 0) / count;
  const lng = sorted.reduce((sum, m) => sum + m.lng, 0) / count;
  return {
    id: count === 1 ? sorted[0].id : `cluster:${sorted[0].id}:${count}`,
    lat,
    lng,
    count,
    members: sorted,
    bounds: boundsOf(sorted),
  };
}

/**
 * Groups pins into a grid that scales with the zoom: the further out the map, the bigger the cells.
 * Pure and deterministic (same pins and region in any order give the same result, sorted by id).
 */
export function clusterPins<T extends ClusterInput>(pins: T[], region: MapRegion): PinCluster<T>[] {
  if (pins.length === 0) return [];

  if (region.latitudeDelta < NO_CLUSTER_BELOW_DELTA) {
    return pins.map((p) => makeCluster([p])).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  const cellLat = region.latitudeDelta / GRID_CELLS;
  const cellLng = region.longitudeDelta / GRID_CELLS;
  const cells = new Map<string, T[]>();
  for (const pin of pins) {
    const key = `${Math.floor(pin.lat / cellLat)}:${Math.floor(pin.lng / cellLng)}`;
    const cell = cells.get(key);
    if (cell) cell.push(pin);
    else cells.set(key, [pin]);
  }

  return [...cells.values()]
    .map(makeCluster)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
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

/**
 * True when the map centre has moved more than `fraction` of the visible span away from where the
 * last search was anchored. Used to offer "Search this area".
 */
export function hasMovedFar(anchor: MapRegion, current: MapRegion, fraction = 0.4): boolean {
  const dLat = Math.abs(current.latitude - anchor.latitude) / anchor.latitudeDelta;
  const dLng = Math.abs(current.longitude - anchor.longitude) / anchor.longitudeDelta;
  return dLat > fraction || dLng > fraction;
}
