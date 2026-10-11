import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { open } from '@tauri-apps/plugin-dialog';
import { useEffect, useState } from 'react';
import { runsKey } from '@/features/history/api';
import {
  commands,
  events,
  type JobGroupId,
  type JobId,
  type JobInput,
  type LocatedFolder,
  type Location,
  type PlanView,
  type RunProgress,
  type RunResult,
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

export function usePreviewJob() {
  return useMutation({
    mutationFn: async (id: JobId): Promise<PlanView> => unwrap(await commands.previewJob(id)),
  });
}

export function useRunJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      confirmDeleteOverThreshold,
    }: {
      id: JobId;
      confirmDeleteOverThreshold: boolean;
    }): Promise<RunResult> => unwrap(await commands.runJob(id, confirmDeleteOverThreshold)),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: jobsKey }),
        queryClient.invalidateQueries({ queryKey: runsKey }),
      ]),
  });
}

export function useCancelRun() {
  return useMutation({
    mutationFn: async () => unwrap(await commands.cancelRun()),
  });
}

/** Live progress while a backup runs (null when idle). */
export function useRunProgress(active: boolean): RunProgress | null {
  const [progress, setProgress] = useState<RunProgress | null>(null);
  useEffect(() => {
    if (!active) {
      setProgress(null);
      return;
    }
    let cancelled = false;
    const unlisten = events.runProgressEvent.listen((event) => {
      if (!cancelled) {
        setProgress(event.payload.progress);
      }
    });
    return () => {
      cancelled = true;
      void unlisten.then((stop) => stop());
    };
  }, [active]);
  return progress;
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
