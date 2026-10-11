import Box from '@mui/material/Box';
import { useRef, useState } from 'react';
import { cardGridSx } from '@/app/theme/layout';
import { duration, ease, stagger } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import type { RegisteredVolumeView, VolumeId } from '@/lib/bindings';
import { useReorderVolumes } from '../api';
import { reorderVolumeIds } from '../volumeReorder';
import { RegisteredVolumeCard } from './RegisteredVolumeCard';

export function RegisteredVolumeGrid({ views }: { views: RegisteredVolumeView[] }) {
  const reorder = useReorderVolumes();
  const [overId, setOverId] = useState<VolumeId | null>(null);
  const dragId = useRef<VolumeId | null>(null);
  const canDrag = views.length >= 2;
  const ids = views.map((view) => view.volume.id);

  const commit = (nextIds: VolumeId[]) => {
    if (nextIds.join('\0') === ids.join('\0')) {
      return;
    }
    reorder.mutate(nextIds);
  };

  return (
    <Box sx={{ ...cardGridSx('wide', 2), ...stagger() }}>
      {views.map((view) => {
        const id = view.volume.id;
        return (
          <Box
            key={id}
            draggable={canDrag}
            onDragStart={(event) => {
              dragId.current = id;
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', id);
            }}
            onDragEnd={() => {
              dragId.current = null;
              setOverId(null);
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              if (dragId.current && dragId.current !== id) {
                setOverId(id);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDragLeave={(event) => {
              const related = event.relatedTarget;
              if (related instanceof Node && event.currentTarget.contains(related)) {
                return;
              }
              setOverId((prev) => (prev === id ? null : prev));
            }}
            onDrop={(event) => {
              event.preventDefault();
              const from =
                dragId.current ?? (event.dataTransfer.getData('text/plain') as VolumeId | '');
              setOverId(null);
              if (!from || from === id) {
                return;
              }
              commit(reorderVolumeIds(ids, from, id));
            }}
            sx={(theme) => ({
              borderRadius: '28px',
              cursor: canDrag ? 'grab' : undefined,
              outline: overId === id ? `2px dashed ${ds(theme).ink}` : '2px solid transparent',
              transition: `outline-color ${duration.hover}ms ${ease.standard}`,
            })}
          >
            <RegisteredVolumeCard view={view} showDragHandle={canDrag} />
          </Box>
        );
      })}
    </Box>
  );
}
