import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { open } from '@tauri-apps/plugin-dialog';
import { useEffect, useState } from 'react';
import {
  commands,
  type JobGroupId,
  type JobId,
  type JobInput,
  type LocatedFolder,
  type Location,
} from '@/lib/bindings';
import { unwrap } from '@/lib/result';

const jobsKey = ['jobs'] as const;

/** Connection state is refreshed when the volume list polls, not on a second timer. */
export function useJobs() {
  return useQuery({
    queryKey: jobsKey,
    queryFn: async () => unwrap(await commands.listJobs()),
    refetchOnWindowFocus: true,
  });
}

/** Source folder size; a full scan, so it is cached and only fetched while the source is connected. */
export function jobSizeQuery(id: JobId, enabled: boolean) {
  return {
    queryKey: ['job-size', id],
    queryFn: async () => unwrap(await commands.getJobSize(id)),
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  } as const;
}

export function useJobSize(id: JobId, enabled: boolean) {
  return useQuery(jobSizeQuery(id, enabled));
}

/** Size of a folder not yet saved as a job (editor "does it fit" check). `path` is null until picked. */
export function useFolderSize(path: string | null, excludes: string[]) {
  const key = JSON.stringify(excludes);
  const [debounced, setDebounced] = useState(key);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(key), 600);
    return () => clearTimeout(timer);
  }, [key]);
  return useQuery({
    queryKey: ['folder-size', path, debounced],
    queryFn: async () =>
      unwrap(await commands.measureFolder(path ?? '', JSON.parse(debounced) as string[])),
    enabled: path !== null,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
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

export function useCreateJobGroup() {
  return useJobMutation(async ({ name, jobIds }: { name: string; jobIds: JobId[] }) =>
    unwrap(await commands.createJobGroup(name, jobIds)),
  );
}

export function useRenameJobGroup() {
  return useJobMutation(async ({ id, name }: { id: JobGroupId; name: string }) =>
    unwrap(await commands.renameJobGroup(id, name)),
  );
}

export function useDeleteJobGroup() {
  return useJobMutation(async (id: JobGroupId) => unwrap(await commands.deleteJobGroup(id)));
}

export function useSetJobsGroup() {
  return useJobMutation(
    async ({ jobIds, groupId }: { jobIds: JobId[]; groupId: JobGroupId | null }) =>
      unwrap(await commands.setJobsGroup(jobIds, groupId)),
  );
}

/** Opens a job folder in Explorer. The backend resolves `Location` to the current mount. */
export async function openLocation(location: Location): Promise<void> {
  unwrap(await commands.openLocation(location));
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
