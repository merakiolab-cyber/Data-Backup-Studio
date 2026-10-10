import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commands, type VolumeId } from '@/lib/bindings';
import { unwrap } from '@/lib/result';

const volumesKey = ['volumes'] as const;

/** Polls while the window is focused so plugging in a USB disk shows up within seconds. */
export function useVolumes() {
  return useQuery({
    queryKey: volumesKey,
    queryFn: async () => unwrap(await commands.listVolumes()),
    refetchInterval: 4000,
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
