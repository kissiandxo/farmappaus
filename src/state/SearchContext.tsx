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

import { DEFAULT_FILTERS, searchFarms, type FarmFilters, type FarmResult } from '../domain/filters';
import { parseFarmCache, serialiseFarmCache } from '../data/mappers';
import { fetchLiveFarms } from '../data/repository';
import { SAMPLE_FARMS } from '../data/sampleFarms';
import type { Farm } from '../domain/types';
import { withTimeout } from '../lib/async';
import { isBackendConfigured } from '../lib/supabase';

/** Where the listings on screen came from. */
export type DataStatus =
  | { kind: 'sample' }
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
  /** All listings currently available (sample data until the backend is connected). */
  farms: Farm[];
  dataStatus: DataStatus;
  /** Reloads listings from the server (pull-to-refresh). */
  refresh: () => Promise<void>;
  refreshing: boolean;
  location: UserLocation;
  setLocation: (location: UserLocation) => void;
  filters: FarmFilters;
  setFilters: (filters: FarmFilters) => void;
  results: FarmResult[];
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
  const [location, setLocationState] = useState<UserLocation>(DEFAULT_LOCATION);
  const [filters, setFilters] = useState<FarmFilters>(DEFAULT_FILTERS);

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

  const [farms, setFarms] = useState<Farm[]>(isBackendConfigured ? [] : SAMPLE_FARMS);
  const [dataStatus, setDataStatus] = useState<DataStatus>(
    isBackendConfigured ? { kind: 'loading' } : { kind: 'sample' },
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

  const results = useMemo(
    () => searchFarms(farms, filters, location, new Date()),
    [farms, filters, location],
  );

  const value = useMemo(
    () => ({ farms, dataStatus, refresh, refreshing, location, setLocation, filters, setFilters, results }),
    [farms, dataStatus, refresh, refreshing, location, setLocation, filters, results],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchState {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used inside <SearchProvider>');
  return ctx;
}
