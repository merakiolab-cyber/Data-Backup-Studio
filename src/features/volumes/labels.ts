import type { BusKind, ConfirmReason, LiveVolume } from '@/lib/bindings';
import { formatBytes } from '@/lib/format';

const busLabels: Record<BusKind, string> = {
  usb: 'USB',
  sata: 'SATA',
  nvme: 'NVMe',
  sd: 'SD karta',
  other: 'Jiné připojení',
  unknown: 'Neznámé připojení',
};

export function busLabel(bus: BusKind): string {
  return busLabels[bus];
}

export const confirmReasonText: Record<ConfirmReason, string> = {
  serialChanged:
    'Disk má naši značku, ale jiné sériové číslo. Mohl být naklonovaný nebo přeformátovaný. Potvrď, že jde o správný disk.',
  markerMissing:
    'Sériové číslo sedí, ale chybí identifikační složka .databackupstudio. Potvrď, že jde o správný disk, a značka se obnoví.',
  duplicate:
    'Jsou připojené dva disky se stejnou identitou (třeba klon). Odpoj jeden z nich, ať je jasné, kam zálohovat.',
};

/** Suggested name for a new registration, e.g. `Záloha 1,8 TB`. */
export function suggestName(volume: LiveVolume): string {
  const base = volume.label.trim() || volume.model?.trim() || 'Disk';
  return `${base} ${formatBytes(volume.totalBytes)}`.slice(0, 64);
}

/** One-line technical description: `WD Elements 25A2 · USB · NTFS`. */
export function describeVolume(volume: Pick<LiveVolume, 'model' | 'bus' | 'fileSystem'>): string {
  return [volume.model, busLabel(volume.bus), volume.fileSystem].filter(Boolean).join(' · ');
}
