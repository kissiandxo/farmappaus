import { supabase } from '../lib/supabase';
import type { Farm } from '../domain/types';
import { groupFarms, type FarmRow, type LicenceRow, type ProductRow } from './mappers';

const PAGE_SIZE = 1000; // Supabase returns at most 1000 rows per request

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Filter = (query: any) => any;

/** Reads every row of a table, page by page. */
async function fetchAll<T>(table: string, filter?: Filter): Promise<T[]> {
  if (!supabase) throw new Error('Backend is not configured');
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select('*').order('id').range(from, from + PAGE_SIZE - 1);
    if (filter) query = filter(query);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

/** All live (reviewed and approved) listings with their products and licences. */
export async function fetchLiveFarms(): Promise<Farm[]> {
  const [farms, products, licences] = await Promise.all([
    fetchAll<FarmRow>('farms', (q) => q.eq('status', 'live')),
    fetchAll<ProductRow>('products'),
    fetchAll<LicenceRow>('licences'),
  ]);
  return groupFarms(farms, products, licences);
}
