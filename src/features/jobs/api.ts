import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { open } from '@tauri-apps/plugin-dialog';
import { commands, type JobId, type JobInput, type LocatedFolder } from '@/lib/bindings';
import { unwrap } from '@/lib/result';

const jobsKey = ['jobs'] as const;

/** Polls like the volume list so connection state on the job cards stays current. */
export function useJobs() {
  return useQuery({
    queryKey: jobsKey,
    queryFn: async () => unwrap(await commands.listJobs()),
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
  });
}

function useJobMutation<TArgs, TResult>(run: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: jobsKey }),
        queryClient.invalidateQueries({ queryKey: ['volumes'] }),
      ]),
  });
}

export function useSaveJob() {
  return useJobMutation(async ({ id, input }: { id: JobId | null; input: JobInput }) =>
    unwrap(await (id ? commands.updateJob(id, input) : commands.createJob(input))),
  );
}

export function useDeleteJob() {
  return useJobMutation(async (id: JobId) => unwrap(await commands.deleteJob(id)));
}

/** Opens the system folder picker and resolves the choice to a volume + relative path. */
export async function pickFolder(defaultPath?: string): Promise<LocatedFolder | null> {
  const path = await open({
    directory: true,
    multiple: false,
    ...(defaultPath ? { defaultPath } : {}),
  });
  if (typeof path !== 'string') {
    return null;
  }
  return unwrap(await commands.locateFolder(path));
}
