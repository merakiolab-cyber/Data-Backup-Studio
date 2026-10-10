import type { BackupMode } from '@/lib/bindings';

export const modeLabels: Record<BackupMode, { title: string; description: string }> = {
  mirror: {
    title: 'Zrcadlo',
    description:
      'Záloha bude přesná kopie zdroje. Co ve zdroji smažeš, smaže se při příští záloze i v cíli.',
  },
  update: {
    title: 'Aktualizace',
    description: 'Kopíruje jen nové a změněné soubory. V záloze se nikdy nic nesmaže.',
  },
};

/** Common junk worth skipping, offered as one-click chips in the editor. */
export const suggestedExcludes = [
  '**/node_modules/**',
  '*.tmp',
  '~$*',
  'Thumbs.db',
  'desktop.ini',
] as const;

/** Last folder name of a relative path, e.g. `Fotky` for `Dokumenty\Fotky`. */
export function leafName(relPath: string): string {
  return relPath.split('\\').filter(Boolean).at(-1) ?? '';
}

/** `D:\Fotky` while connected, otherwise `\Fotky` (the volume name is shown next to it). */
export function displayLocation(relPath: string, path: string | null): string {
  return path ?? `\\${relPath}`;
}
