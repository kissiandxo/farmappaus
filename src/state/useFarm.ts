import { useCallback, useEffect, useState } from 'react';

import { fetchFarmById } from '../data/mutations';
import type { Farm } from '../domain/types';
import { isBackendConfigured } from '../lib/supabase';
import { useSearch } from './SearchContext';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Finds one listing. Live listings come from the loaded list; anything else (a farmer's own draft,
 * or a pending listing an admin is reviewing) is fetched, which only works when allowed.
 */
export function useFarm(id: string | undefined) {
  const { farms } = useSearch();
  const known = farms.find((f) => f.id === id) ?? null;
  const [fetched, setFetched] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id || !isBackendConfigured || !UUID.test(id)) return;
    setLoading(true);
    try {
      setFetched(await fetchFarmById(id));
    } catch {
      setFetched(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!known) load();
  }, [known, load]);

  return { farm: known ?? fetched, loading, reload: load };
}
