import type { BusKind, ConfirmReason, LiveVolume } from '@/lib/bindings';
import { formatBytes } from '@/lib/format';
import type { Messages } from '@/lib/i18n';

export function busLabel(bus: BusKind, t: Messages): string {
  switch (bus) {
    case 'usb':
      return 'USB';
    case 'sata':
      return 'SATA';
    case 'nvme':
      return 'NVMe';
    case 'sd':
      return t.volumes.busSd;
    case 'other':
      return t.volumes.busOther;
    default:
      return t.volumes.busUnknown;
  }
}

export function confirmReasonText(t: Messages): Record<ConfirmReason, string> {
  return {
    serialChanged: t.volumes.reasonSerial,
    markerMissing: t.volumes.reasonMarker,
    duplicate: t.volumes.reasonDuplicate,
  };
}

/** Suggested name for a new registration, e.g. `Záloha 1,8 TB`. */
export function suggestName(volume: LiveVolume): string {
  const base = volume.label.trim() || volume.model?.trim() || 'Disk';
  return `${base} ${formatBytes(volume.totalBytes)}`.slice(0, 64);
}

/** One-line technical description: `WD Elements 25A2 · USB · NTFS`. */
export function describeVolume(
  volume: Pick<LiveVolume, 'model' | 'bus' | 'fileSystem'>,
  t: Messages,
): string {
  return [volume.model, busLabel(volume.bus, t), volume.fileSystem].filter(Boolean).join(' · ');
}
