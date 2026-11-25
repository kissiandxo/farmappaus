import type { Farm } from './types';

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** Smallest map region containing all points, with 40% padding and a minimum zoom-out. */
export function boundingRegion(points: LatLng[], minDelta = 0.2): MapRegion {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, minDelta),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, minDelta),
  };
}

/**
 * "850 m" under 1 km, "3.4 km" under 10 km, then whole kilometres. With `approx` (the place's pin is only
 * the suburb centre), "about 3 km" in whole kilometres, never less than 1.
 */
export function formatDistance(km: number, approx = false): string {
  if (approx) return `about ${Math.max(1, Math.round(km)).toLocaleString('en-AU')} km`;
  if (km < 1) {
    const metres = Math.max(50, Math.round((km * 1000) / 50) * 50);
    if (metres < 1000) return `${metres} m`;
  }
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString('en-AU')} km`;
}

/**
 * Other places near a place (measured from that place, not from the user), nearest first then by name.
 * Excludes the place itself. Defaults: up to 3 places within 60 km.
 */
export function nearbyPlaces(
  farm: Farm,
  farms: Farm[],
  opts: { limit?: number; maxKm?: number } = {},
): { farm: Farm; distanceKm: number }[] {
  const { limit = 3, maxKm = 60 } = opts;
  return farms
    .filter((other) => other.id !== farm.id)
    .map((other) => ({ farm: other, distanceKm: haversineKm(farm, other) }))
    .filter((r) => r.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm || a.farm.name.localeCompare(b.farm.name))
    .slice(0, limit);
}

/** Rough box around mainland Australia and Tasmania (latitude −44.5 to −9, longitude 112 to 154.5). */
export function isInAustralia(p: LatLng): boolean {
  return p.lat >= -44.5 && p.lat <= -9 && p.lng >= 112 && p.lng <= 154.5;
}
