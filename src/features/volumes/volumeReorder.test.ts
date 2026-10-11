import { describe, expect, it } from 'vitest';
import { reorderVolumeIds } from './volumeReorder';

describe('reorderVolumeIds', () => {
  const ids = ['a', 'b', 'c'] as const;

  it('moves an id before another', () => {
    expect(reorderVolumeIds([...ids], 'c', 'a')).toEqual(['c', 'a', 'b']);
    expect(reorderVolumeIds([...ids], 'a', 'c')).toEqual(['b', 'a', 'c']);
  });

  it('returns the same array when nothing changes', () => {
    expect(reorderVolumeIds([...ids], 'b', 'b')).toEqual(['a', 'b', 'c']);
  });
});
