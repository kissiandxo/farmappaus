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
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { mergeHydrated, parseStoredIds, toggleId, type PendingFavouriteOp } from './favouritesStore';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STORAGE_KEY = 'farmdirect.favourites.v1';

interface FavouritesState {
  ids: string[];
  isFavourite: (id: string) => boolean;
  toggleFavourite: (id: string) => void;
  /** Replaces the whole list (used when syncing with the account). */
  setAll: (ids: string[]) => void;
  /** False until the list saved on this phone has been read. Saves made before then are kept and merged. */
  hydrated: boolean;
}

const FavouritesContext = createContext<FavouritesState | null>(null);

export function FavouritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  /** The latest list, updated synchronously so quick repeated taps never act on a stale copy. */
  const idsRef = useRef<string[]>([]);
  /** Saves and unsaves made before storage was read; replayed on top of the stored list. */
  const pendingRef = useRef<PendingFavouriteOp[]>([]);
  const hydratedRef = useRef(false);

  const commit = useCallback((next: string[]) => {
    idsRef.current = next;
    setIds(() => next);
  }, []);

  useEffect(() => {
    let stored: string[] = [];
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const parsed = parseStoredIds(raw);
        if (parsed) stored = parsed;
        else if (!raw && SCREENSHOT_MODE) stored = [...SCREENSHOT_SAVED_IDS];
      })
      .catch(() => {})
      .finally(() => {
        commit(mergeHydrated(stored, pendingRef.current));
        pendingRef.current = [];
        hydratedRef.current = true;
        setHydrated(true);
      });
  }, [commit]);

  // Write to storage only once the stored list has been read, so an early save never overwrites it.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids)).catch(() => {});
  }, [ids, hydrated]);

  // When signed in, favourites follow the account: merge this phone's list with the account's.
  // Waits for the phone's list so the merge never starts from an empty list.
  const { userId } = useAuth();

  useEffect(() => {
    if (!supabase || !userId || !hydrated) return;
    const client = supabase;
    let cancelled = false;
    (async () => {
      const { data, error } = await client.from('favourites').select('farm_id');
      if (error || cancelled) return;
      const remote = (data ?? []).map((r) => r.farm_id as string);
      const missing = idsRef.current.filter((id) => UUID.test(id) && !remote.includes(id));
      if (missing.length > 0) {
        await client
          .from('favourites')
          .upsert(missing.map((farm_id) => ({ user_id: userId, farm_id })), { ignoreDuplicates: true });
      }
      if (!cancelled) commit([...new Set([...idsRef.current, ...remote])]);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, hydrated, commit]);

  const toggleFavourite = useCallback(
    (id: string) => {
      const adding = !idsRef.current.includes(id);
      if (!hydratedRef.current) pendingRef.current.push({ id, op: adding ? 'add' : 'remove' });
      commit(toggleId(idsRef.current, id));
      if (supabase && userId && UUID.test(id)) {
        const request = adding
          ? supabase.from('favourites').upsert({ user_id: userId, farm_id: id }, { ignoreDuplicates: true })
          : supabase.from('favourites').delete().eq('user_id', userId).eq('farm_id', id);
        Promise.resolve(request).catch(() => {});
      }
    },
    [commit, userId],
  );

  const setAll = useCallback((next: string[]) => commit([...new Set(next)]), [commit]);

  const value = useMemo<FavouritesState>(
    () => ({
      ids,
      isFavourite: (id) => ids.includes(id),
      toggleFavourite,
      setAll,
      hydrated,
    }),
    [ids, toggleFavourite, setAll, hydrated],
  );

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavourites(): FavouritesState {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error('useFavourites must be used inside <FavouritesProvider>');
  return ctx;
}
