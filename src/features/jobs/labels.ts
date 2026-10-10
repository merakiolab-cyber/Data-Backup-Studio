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

/** Czech plural after a count: 1 úloha, 2 úlohy, 5 úloh. */
export function jobsLabel(count: number): string {
  if (count === 1) {
    return 'úloha';
  }
  return count >= 2 && count <= 4 ? 'úlohy' : 'úloh';
}

/** Last folder name of a relative path, e.g. `Fotky` for `Dokumenty\Fotky`. */
export function leafName(relPath: string): string {
  return relPath.split('\\').filter(Boolean).at(-1) ?? '';
}

/** `D:\Fotky` while connected, otherwise `\Fotky` (the volume name is shown next to it). */
export function displayLocation(relPath: string, path: string | null): string {
  return path ?? `\\${relPath}`;
}
