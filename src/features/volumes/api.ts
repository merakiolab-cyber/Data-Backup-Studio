import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { commands, events, type VolumeId } from '@/lib/bindings';
import { unwrap } from '@/lib/result';

const volumesKey = ['volumes'] as const;

/** Refreshes disks when Windows reports a USB change (`WM_DEVICECHANGE`). */
export function useVolumeChangeListener() {
  const queryClient = useQueryClient();
  useEffect(() => {
    let timer = 0;
    const unlisten = events.volumesChangedEvent.listen(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: volumesKey });
      }, 400);
    });
    return () => {
      window.clearTimeout(timer);
      void unlisten.then((stop) => stop());
    };
  }, [queryClient]);
}

/** Enumerates on focus; USB plug/unplug is pushed from the backend. */
export function useVolumes() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: volumesKey,
    queryFn: async () => {
      const data = unwrap(await commands.listVolumes());
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      return data;
    },
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

function useVolumeMutation<TArgs>(run: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: () => queryClient.invalidateQueries({ queryKey: volumesKey }),
  });
}

export function useRegisterVolume() {
  return useVolumeMutation(async ({ guidPath, name }: { guidPath: string; name: string }) =>
    unwrap(await commands.registerVolume(guidPath, name)),
  );
}

export function useRenameVolume() {
  return useVolumeMutation(async ({ id, name }: { id: VolumeId; name: string }) =>
    unwrap(await commands.renameVolume(id, name)),
  );
}

export function useUnregisterVolume() {
  return useVolumeMutation(async (id: VolumeId) => unwrap(await commands.unregisterVolume(id)));
}

export function useConfirmVolume() {
  return useVolumeMutation(async (id: VolumeId) => unwrap(await commands.confirmVolume(id)));
}

export function useReorderVolumes() {
  return useVolumeMutation(async (orderedIds: VolumeId[]) =>
    unwrap(await commands.reorderVolumes(orderedIds)),
  );
}
