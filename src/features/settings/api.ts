import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { open, save } from '@tauri-apps/plugin-dialog';
import { type AppSettings, commands } from '@/lib/bindings';
import { unwrap } from '@/lib/result';

const settingsKey = ['settings'] as const;

export function useAppInfo() {
  return useQuery({
    queryKey: ['app-info'],
    queryFn: async () => unwrap(await commands.appInfo()),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: settingsKey,
    queryFn: async () => unwrap(await commands.getSettings()),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: AppSettings) => unwrap(await commands.updateSettings(settings)),
    onSuccess: (settings) => queryClient.setQueryData(settingsKey, settings),
  });
}

export async function openDataDir(): Promise<void> {
  unwrap(await commands.openDataDir());
}

export async function exportConfigFile(): Promise<boolean> {
  const path = await save({
    defaultPath: 'data-backup-studio.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (typeof path !== 'string') {
    return false;
  }
  unwrap(await commands.exportConfig(path));
  return true;
}

export async function importConfigFile(): Promise<boolean> {
  const path = await open({
    multiple: false,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (typeof path !== 'string') {
    return false;
  }
  unwrap(await commands.importConfig(path));
  return true;
}
