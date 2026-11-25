import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchFarmById } from '../data/mutations';
import type { Farm } from '../domain/types';
import { isBackendConfigured } from '../lib/supabase';
import { useSearch } from './SearchContext';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Live listings come from the directory. Drafts can be fetched if the signed-in user has access. */
export function useFarm(id: string | undefined) {
  const { farms, dataStatus } = useSearch();
  const known = farms.find((f) => f.id === id) ?? null;
  const remoteId = !known && id && isBackendConfigured && UUID.test(id) ? id : null;
  const [result, setResult] = useState<{ id: string; farm: Farm | null } | null>(null);
  const [refreshId, setRefreshId] = useState<string | null>(null);
  const generation = useRef<symbol | null>(null);

  const fetchOne = useCallback(async (requestedId: string) => {
    const request = Symbol('farm');
    generation.current = request;
    const farm = await fetchFarmById(requestedId).catch(() => null);
    if (request === generation.current) {
      setResult({ id: requestedId, farm });
      setRefreshId(null);
    }
  }, []);

  useEffect(() => {
    if (remoteId) void fetchOne(remoteId);
    return () => { generation.current = null; };
  }, [remoteId, fetchOne]);

  const reload = useCallback(async () => {
    if (!id || !isBackendConfigured || !UUID.test(id)) return;
    setRefreshId(id);
    await fetchOne(id);
  }, [id, fetchOne]);

  return {
    farm: known ?? (result?.id === remoteId ? result?.farm ?? null : null),
    loading: (!!id && id === refreshId) || (!!remoteId && result?.id !== remoteId) || (!known && dataStatus.kind === 'loading'),
    reload,
  };
}
