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
import { SAMPLE_FARMS } from '../data/sampleFarms';

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

  const results = useMemo(
    () => searchFarms(SAMPLE_FARMS, filters, location, new Date()),
    [filters, location],
  );

  const value = useMemo(
    () => ({ location, setLocation, filters, setFilters, results }),
    [location, setLocation, filters, results],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchState {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used inside <SearchProvider>');
  return ctx;
}
