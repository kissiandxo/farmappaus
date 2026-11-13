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

import { toggle } from '../domain/filters';

const STORAGE_KEY = 'farmdirect.favourites.v1';

interface FavouritesState {
  ids: string[];
  isFavourite: (id: string) => boolean;
  toggleFavourite: (id: string) => void;
  /** Replaces the whole list (used when syncing with the account). */
  setAll: (ids: string[]) => void;
}

const FavouritesContext = createContext<FavouritesState | null>(null);

export function FavouritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved: unknown = JSON.parse(raw);
        if (Array.isArray(saved) && saved.every((x) => typeof x === 'string')) setIds(saved);
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: string[]) => {
    setIds(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const value = useMemo<FavouritesState>(
    () => ({
      ids,
      isFavourite: (id) => ids.includes(id),
      toggleFavourite: (id) => persist(toggle(ids, id)),
      setAll: persist,
    }),
    [ids, persist],
  );

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavourites(): FavouritesState {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error('useFavourites must be used inside <FavouritesProvider>');
  return ctx;
}
