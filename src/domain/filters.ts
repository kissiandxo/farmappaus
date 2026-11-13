import { haversineKm, type LatLng } from './geo';
import { openStatus, timezoneForState, type OpenStatus } from './hours';
import type { Farm, FarmTag, ProductCategory } from './types';

export interface FarmFilters {
  /** Show places selling ANY of these (in stock). Empty = no product filter. */
  products: ProductCategory[];
  /** Maximum distance in km. null = any distance. */
  maxKm: number | null;
  openNow: boolean;
  /** Places must have ALL of these tags. */
  tags: FarmTag[];
}

export const DEFAULT_FILTERS: FarmFilters = {
  products: [],
  maxKm: null,
  openNow: false,
  tags: [],
};

export const DISTANCE_OPTIONS_KM = [10, 25, 50, 100, 250] as const;

export interface FarmResult {
  farm: Farm;
  distanceKm: number;
  status: OpenStatus;
}

export function activeFilterCount(filters: FarmFilters): number {
  return (
    (filters.products.length > 0 ? 1 : 0) +
    (filters.maxKm !== null ? 1 : 0) +
    (filters.openNow ? 1 : 0) +
    (filters.tags.length > 0 ? 1 : 0)
  );
}

export function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Applies filters, attaches distance and open status, sorts nearest first. */
export function searchFarms(
  farms: Farm[],
  filters: FarmFilters,
  origin: LatLng,
  now: Date,
): FarmResult[] {
  const results: FarmResult[] = [];

  for (const farm of farms) {
    if (
      filters.products.length > 0 &&
      !farm.products.some((p) => p.inStock && filters.products.includes(p.category))
    ) {
      continue;
    }
    if (filters.tags.length > 0 && !filters.tags.every((t) => farm.tags.includes(t))) {
      continue;
    }

    const distanceKm = haversineKm(origin, farm);
    if (filters.maxKm !== null && distanceKm > filters.maxKm) continue;

    const status = openStatus(farm.hours, timezoneForState(farm.state), now);
    if (filters.openNow && !status.isOpen) continue;

    results.push({ farm, distanceKm, status });
  }

  return results.sort((a, b) => a.distanceKm - b.distanceKm || a.farm.name.localeCompare(b.farm.name));
}
