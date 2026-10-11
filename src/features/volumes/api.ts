import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commands, type VolumeId } from '@/lib/bindings';
import { unwrap } from '@/lib/result';

const volumesKey = ['volumes'] as const;

/** Polls only while the window is focused so a USB disk appears within seconds. */
export function useVolumes() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: volumesKey,
    queryFn: async () => {
      const data = unwrap(await commands.listVolumes());
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      return data;
    },
    refetchInterval: () => (document.hasFocus() ? 4000 : false),
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
