import type { BackupMode, JobView } from '@/lib/bindings';
import type { Messages } from '@/lib/i18n';

export function modeLabels(
  t: Messages,
): Record<BackupMode, { title: string; description: string }> {
  return {
    mirror: { title: t.mode.mirror, description: t.mode.mirrorHint },
    update: { title: t.mode.update, description: t.mode.updateHint },
  };
}

/** Common junk worth skipping, offered as one-click chips in the editor. */
export const suggestedExcludes = [
  '**/node_modules/**',
  '*.tmp',
  '~$*',
  'Thumbs.db',
  'desktop.ini',
] as const;

/** Source and target disks are connected – the job can run. */
export function isJobReady(view: JobView): boolean {
  return view.source.status.state === 'connected' && view.target.status.state === 'connected';
}

/** Last folder name of a relative path, e.g. `Fotky` for `Dokumenty\Fotky`. */
export function leafName(relPath: string): string {
  return relPath.split('\\').filter(Boolean).at(-1) ?? '';
}

/** `D:\Fotky` while connected, otherwise `\Fotky` (the volume name is shown next to it). */
export function displayLocation(relPath: string, path: string | null): string {
  return path ?? `\\${relPath}`;
}

/** Source files already on the target with matching size and mtime — Mirror and Update skip them. */
export function unchangedFiles(sourceFiles: number, copy: number, update: number): number {
  return Math.max(0, sourceFiles - copy - update);
}
