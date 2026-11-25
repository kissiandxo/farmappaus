import { mergeHydrated, parseStoredIds, toggleId } from '../favouritesStore';

describe('toggleId', () => {
  it('adds a missing id at the end', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes a present id', () => {
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('does not mutate the input', () => {
    const ids = ['a'];
    toggleId(ids, 'b');
    expect(ids).toEqual(['a']);
  });
});

describe('mergeHydrated', () => {
  it('returns the stored list when nothing happened while loading', () => {
    expect(mergeHydrated(['a', 'b'], [])).toEqual(['a', 'b']);
  });

  it('keeps a save made before storage loaded', () => {
    expect(mergeHydrated(['a'], [{ id: 'b', op: 'add' }])).toEqual(['a', 'b']);
  });

  it('keeps an unsave made before storage loaded', () => {
    expect(mergeHydrated(['a', 'b'], [{ id: 'a', op: 'remove' }])).toEqual(['b']);
  });

  it('does not duplicate an id that was already stored', () => {
    expect(mergeHydrated(['a'], [{ id: 'a', op: 'add' }])).toEqual(['a']);
  });

  it('replays ops in order so the last one wins', () => {
    expect(
      mergeHydrated(
        [],
        [
          { id: 'a', op: 'add' },
          { id: 'a', op: 'remove' },
          { id: 'a', op: 'add' },
        ],
      ),
    ).toEqual(['a']);
    expect(
      mergeHydrated(
        ['a'],
        [
          { id: 'a', op: 'remove' },
          { id: 'a', op: 'add' },
          { id: 'a', op: 'remove' },
        ],
      ),
    ).toEqual([]);
  });

  it('removes duplicates in the stored list', () => {
    expect(mergeHydrated(['a', 'a', 'b'], [])).toEqual(['a', 'b']);
  });

  it('ignores removing an id that was never saved', () => {
    expect(mergeHydrated(['a'], [{ id: 'z', op: 'remove' }])).toEqual(['a']);
  });
});

describe('parseStoredIds', () => {
  it('returns null for nothing stored', () => {
    expect(parseStoredIds(null)).toBeNull();
    expect(parseStoredIds('')).toBeNull();
  });

  it('parses an array of strings', () => {
    expect(parseStoredIds('["a","b","a"]')).toEqual(['a', 'b']);
  });

  it('rejects corrupt or wrongly shaped values', () => {
    expect(parseStoredIds('{not json')).toBeNull();
    expect(parseStoredIds('[1,2]')).toBeNull();
    expect(parseStoredIds('{"a":1}')).toBeNull();
  });
});
