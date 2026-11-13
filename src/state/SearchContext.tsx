import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { SCREENSHOT_MODE } from '../config';
import { DEFAULT_FILTERS, matchesQuery, searchFarms, type FarmFilters, type FarmResult } from '../domain/filters';
import { parseFarmCache, serialiseFarmCache } from '../data/mappers';
import { bundledFarms, fetchLiveFarms } from '../data/repository';
import type { Farm } from '../domain/types';
import { withTimeout } from '../lib/async';
import { isBackendConfigured } from '../lib/supabase';

/** Where the listings on screen came from. */
export type DataStatus =
  /** No backend: real places from public sources, not yet confirmed by their owners. */
  | { kind: 'public' }
  | { kind: 'loading' }
  | { kind: 'live'; at: string }
  | { kind: 'cached'; at: string; failed: boolean }
  | { kind: 'error' };

const FARMS_CACHE_KEY = 'farmdirect.farms.v1';

export interface UserLocation {
  /** Shown to the user, e.g. "Toowoomba QLD 4350". */
  label: string;
  lat: number;
  lng: number;
  /** "default" means the user has not chosen a location yet. */
  source: 'default' | 'gps' | 'search';
}

export const DEFAULT_LOCATION: UserLocation = {
  label: 'Sydney NSW 2000',
  lat: -33.8688,
  lng: 151.2093,
  source: 'default',
};

const STORAGE_KEY = 'farmdirect.location.v1';

interface SearchState {
  /** All listings currently available (places from public sources until the backend is connected). */
  farms: Farm[];
  dataStatus: DataStatus;
  /** Reloads listings from the server (pull-to-refresh). */
  refresh: () => Promise<void>;
  refreshing: boolean;
  location: UserLocation;
  setLocation: (location: UserLocation) => void;
  filters: FarmFilters;
  setFilters: (filters: FarmFilters) => void;
  /** Free-text search on Explore. Kept in memory only (not saved between launches). */
  query: string;
  setQuery: (query: string) => void;
  /**
   * The Explore list, nearest first. While a search query is typed, the distance filter is ignored so a
   * traveller can find a town far away, and only places matching the query are included.
   */
  results: FarmResult[];
  /** True until the user picks a location (by GPS or search). */
  isDefaultLocation: boolean;
  /**
   * Every listing that passes the type, product, tag and time filters, nearest first, ignoring the
   * distance filter and the search query. The map pins these.
   */
  mapResults: FarmResult[];
  /** The clock used for "open now". Ticks every minute and when the app returns to the foreground. */
  now: Date;
}

const SearchContext = createContext<SearchState | null>(null);

function isLocation(value: unknown): value is UserLocation {
  const v = value as UserLocation;
  return (
    !!v &&
    typeof v.label === 'string' &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.lng) &&
    (v.source === 'gps' || v.source === 'search')
  );
}

export function SearchProvider({ children }: { children: ReactNode }) {
  // The screenshot build starts from a chosen location so screenshots don't show the "set location" prompt.
  const [location, setLocationState] = useState<UserLocation>(
    SCREENSHOT_MODE ? { ...DEFAULT_LOCATION, source: 'search' } : DEFAULT_LOCATION,
  );
  const [filters, setFilters] = useState<FarmFilters>(DEFAULT_FILTERS);
  const [query, setQuery] = useState('');

  // Restore the last location so the app works straight away, even offline.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved: unknown = JSON.parse(raw);
        if (isLocation(saved)) setLocationState(saved);
      })
      .catch(() => {});
  }, []);

  const setLocation = useCallback((next: UserLocation) => {
    setLocationState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const [farms, setFarms] = useState<Farm[]>(isBackendConfigured ? [] : bundledFarms());
  const [dataStatus, setDataStatus] = useState<DataStatus>(
    isBackendConfigured ? { kind: 'loading' } : { kind: 'public' },
  );
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!isBackendConfigured) return;
    setRefreshing(true);
    try {
      // On patchy reception a request can hang; give up after 20 s and keep the saved listings.
      const live = await withTimeout(fetchLiveFarms(), 20_000);
      const now = new Date();
      setFarms(live);
      setDataStatus({ kind: 'live', at: now.toISOString() });
      AsyncStorage.setItem(FARMS_CACHE_KEY, serialiseFarmCache(live, now)).catch(() => {});
    } catch {
      // Keep whatever we already have on screen; only say "error" if we have nothing.
      setDataStatus((prev) =>
        prev.kind === 'cached'
          ? { ...prev, failed: true }
          : prev.kind === 'live'
            ? { kind: 'cached', at: prev.at, failed: true }
            : { kind: 'error' },
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Show saved listings immediately (works with no reception), then refresh in the background.
  useEffect(() => {
    if (!isBackendConfigured) return;
    let cancelled = false;
    AsyncStorage.getItem(FARMS_CACHE_KEY)
      .then((raw) => {
        const cache = parseFarmCache(raw);
        if (!cache || cancelled) return;
        setFarms((prev) => (prev.length > 0 ? prev : cache.farms));
        setDataStatus((prev) => (prev.kind === 'live' ? prev : { kind: 'cached', at: cache.savedAt, failed: false }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) refresh();
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Keep "open now" honest: re-evaluate every minute and whenever the app comes back to the foreground.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  const results = useMemo(() => {
    if (query.trim() === '') return searchFarms(farms, filters, location, now);
    return searchFarms(farms, { ...filters, maxKm: null }, location, now).filter((r) => matchesQuery(r.farm, query));
  }, [farms, filters, location, now, query]);

  const isDefaultLocation = location.source === 'default';

  const mapResults = useMemo(
    () => searchFarms(farms, { ...filters, maxKm: null }, location, now),
    [farms, filters, location, now],
  );

  const value = useMemo(
    () => ({
      farms,
      dataStatus,
      refresh,
      refreshing,
      location,
      setLocation,
      filters,
      setFilters,
      query,
      setQuery,
      results,
      isDefaultLocation,
      mapResults,
      now,
    }),
    [farms, dataStatus, refresh, refreshing, location, setLocation, filters, query, results, isDefaultLocation, mapResults, now],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchState {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used inside <SearchProvider>');
  return ctx;
}
