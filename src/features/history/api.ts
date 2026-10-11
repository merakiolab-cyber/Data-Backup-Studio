import { useQuery } from '@tanstack/react-query';
import { commands, type RunId } from '@/lib/bindings';
import { catalogs } from '@/lib/i18n/catalog';
import { getActiveLocale } from '@/lib/i18n/locale';
import { unwrap } from '@/lib/result';

export const runsKey = ['runs'] as const;

export function useRuns() {
  return useQuery({
    queryKey: runsKey,
    queryFn: async () => unwrap(await commands.listRuns(null)),
  });
}

export function useRun(id: RunId | null) {
  return useQuery({
    queryKey: ['run', id],
    enabled: id !== null,
    queryFn: async () => {
      if (id === null) {
        throw new Error(catalogs[getActiveLocale()].common.missingRunId);
      }
      return unwrap(await commands.getRun(id));
    },
  });
}

export function useRunLog(id: RunId | null) {
  return useQuery({
    queryKey: ['run-log', id],
    enabled: id !== null,
    queryFn: async () => {
      if (id === null) {
        throw new Error(catalogs[getActiveLocale()].common.missingRunId);
      }
      return unwrap(await commands.getRunLog(id));
    },
  });
}

export async function openRunLog(id: RunId): Promise<void> {
  unwrap(await commands.openRunLog(id));
}
