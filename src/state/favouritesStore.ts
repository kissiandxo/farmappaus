/**
 * Pure helpers for the saved-places list. Kept free of React and storage so the merge rules are testable.
 */

/** A save or unsave made before the stored list finished loading. */
export interface PendingFavouriteOp {
  id: string;
  op: 'add' | 'remove';
}

/** Adds the id at the end when absent, removes it when present. Never duplicates. */
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/**
 * The list once storage has loaded: the stored ids with every change the person made while it was loading
 * replayed in order on top. A later op on the same id wins. The result has no duplicates.
 */
export function mergeHydrated(stored: string[], pending: PendingFavouriteOp[]): string[] {
  let ids = [...new Set(stored)];
  for (const { id, op } of pending) {
    if (op === 'add') {
      if (!ids.includes(id)) ids = [...ids, id];
    } else {
      ids = ids.filter((x) => x !== id);
    }
  }
  return ids;
}

/** Parses the stored JSON. Anything that is not an array of strings counts as nothing saved. */
export function parseStoredIds(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value) && value.every((x) => typeof x === 'string')) return [...new Set(value as string[])];
  } catch {
    // corrupt value: treat as empty
  }
  return null;
}
