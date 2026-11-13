import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { SCREENSHOT_MODE, SCREENSHOT_SAVED_IDS } from '../config';
import { toggle } from '../domain/filters';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
        if (!raw) {
          if (SCREENSHOT_MODE) setIds([...SCREENSHOT_SAVED_IDS]);
          return;
        }
        const saved: unknown = JSON.parse(raw);
        if (Array.isArray(saved) && saved.every((x) => typeof x === 'string')) setIds(saved);
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: string[]) => {
    setIds(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  // When signed in, favourites follow the account: merge this phone's list with the account's.
  const { userId } = useAuth();
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('favourites').select('farm_id');
      if (error || cancelled) return;
      const remote = (data ?? []).map((r) => r.farm_id as string);
      const missing = idsRef.current.filter((id) => UUID.test(id) && !remote.includes(id));
      if (missing.length > 0) {
        await supabase
          .from('favourites')
          .upsert(missing.map((farm_id) => ({ user_id: userId, farm_id })), { ignoreDuplicates: true });
      }
      if (!cancelled) persist([...new Set([...idsRef.current, ...remote])]);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, persist]);

  const value = useMemo<FavouritesState>(
    () => ({
      ids,
      isFavourite: (id) => ids.includes(id),
      toggleFavourite: (id) => {
        const adding = !ids.includes(id);
        persist(toggle(ids, id));
        if (supabase && userId && UUID.test(id)) {
          const request = adding
            ? supabase.from('favourites').upsert({ user_id: userId, farm_id: id }, { ignoreDuplicates: true })
            : supabase.from('favourites').delete().eq('user_id', userId).eq('farm_id', id);
          Promise.resolve(request).catch(() => {});
        }
      },
      setAll: persist,
    }),
    [ids, persist, userId],
  );

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavourites(): FavouritesState {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error('useFavourites must be used inside <FavouritesProvider>');
  return ctx;
}
