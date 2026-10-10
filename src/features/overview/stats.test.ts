import type { JobView, RegisteredVolumeView } from '@/lib/bindings';
import { overviewStats, usedRatio } from './stats';

const TB = 1024 ** 4;

function disk(
  id: string,
  name: string,
  totalBytes: number,
  freeBytes: number | null,
): RegisteredVolumeView {
  const volume = {
    id,
    name,
    serial: 0x1234abcd,
    guidPath: `\\\\?\\Volume{${id}}\\`,
    fileSystem: 'NTFS',
    model: 'WD Elements 25A2',
    totalBytes,
    registeredAtMs: 0,
  };
  if (freeBytes === null) {
    return { volume, status: { state: 'disconnected' }, live: null };
  }
  return {
    volume,
    status: { state: 'connected' },
    live: {
      guidPath: volume.guidPath,
      mountPoint: 'G:\\',
      label: name,
      serial: volume.serial,
      fileSystem: 'NTFS',
      driveKind: 'fixed',
      bus: 'usb',
      model: volume.model,
      totalBytes,
      freeBytes,
      isSystem: false,
      isExternal: true,
      marker: null,
    },
  };
}

function job(mode: JobView['job']['mode'], excludes: string[]): JobView {
  return {
    job: {
      id: `c3c3c3c3-0000-4000-8000-00000000000${excludes.length}`,
      name: 'Fotky',
      source: { volumeId: 'b2b2b2b2-0000-4000-8000-000000000001', relPath: 'Fotky' },
      target: { volumeId: 'a1a1a1a1-0000-4000-8000-000000000001', relPath: 'Záloha\\Fotky' },
      mode,
      excludes,
      createdAtMs: 0,
      updatedAtMs: 0,
    },
    source: { volumeName: 'Data', status: { state: 'connected' }, path: 'D:\\Fotky' },
    target: { volumeName: 'WD Elements 2 TB', status: { state: 'connected' }, path: null },
  };
}

describe('overviewStats', () => {
  it('sums capacity of all disks but free space only of connected ones', () => {
    const stats = overviewStats(
      [
        disk('a1a1a1a1-0000-4000-8000-000000000001', 'WD Elements 2 TB', 2 * TB, 1.5 * TB),
        disk('a1a1a1a1-0000-4000-8000-000000000002', 'Kancelář 1 TB', TB, null),
      ],
      [job('update', ['*.tmp']), job('mirror', ['*.tmp', 'Thumbs.db']), job('mirror', [])],
    );
    expect(stats.totalBytes).toBe(3 * TB);
    expect(stats.freeBytes).toBe(1.5 * TB);
    expect(stats.modes).toEqual({ update: 1, mirror: 2 });
    expect(stats.excludes).toBe(3);
    expect(stats.disks.map(usedRatio)).toEqual([0.25, null]);
  });

  it('has no free space without a connected disk', () => {
    const stats = overviewStats(
      [disk('a1a1a1a1-0000-4000-8000-000000000003', 'Archiv', TB, null)],
      [],
    );
    expect(stats.freeBytes).toBeNull();
    expect(stats.modes).toEqual({ update: 0, mirror: 0 });
  });
});
