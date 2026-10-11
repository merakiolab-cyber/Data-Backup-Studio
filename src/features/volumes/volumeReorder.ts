import type { VolumeId } from '@/lib/bindings';

/** Inserts `draggedId` immediately before `beforeId` in `ids`. */
export function reorderVolumeIds(
  ids: VolumeId[],
  draggedId: VolumeId,
  beforeId: VolumeId,
): VolumeId[] {
  if (draggedId === beforeId) {
    return ids;
  }
  const without = ids.filter((id) => id !== draggedId);
  const index = without.indexOf(beforeId);
  if (index === -1) {
    return ids;
  }
  without.splice(index, 0, draggedId);
  return without;
}
