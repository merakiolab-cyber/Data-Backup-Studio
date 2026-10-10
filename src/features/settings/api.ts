import { useQuery } from '@tanstack/react-query';
import { commands } from '@/lib/bindings';
import { unwrap } from '@/lib/result';

export function useAppInfo() {
  return useQuery({
    queryKey: ['app-info'],
    queryFn: async () => unwrap(await commands.appInfo()),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
