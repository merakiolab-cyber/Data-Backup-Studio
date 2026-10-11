import type { JobView, RegisteredVolumeView, RunSummary } from '@/lib/bindings';
import { freshnessLevel, jobFreshnessRows } from './freshness';
import { backupStats, latestByJob, overviewStats, usedRatio } from './stats';

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

function run(jobId: string, bytesCopied: number): RunSummary {
  return {
    id: `d4d4d4d4-0000-4000-8000-${jobId.slice(-12)}`,
    jobId,
    jobName: jobId,
    mode: 'mirror',
    status: 'done',
    startedAtMs: 1,
    finishedAtMs: 2,
    copied: 1,
    updated: 0,
    deleted: 0,
    dirsCreated: 0,
    bytesCopied,
    errorCount: 0,
  };
}

describe('freshness', () => {
  const now = 1_700_000_000_000;

  it('classifies age and lists recent run dots', () => {
    expect(freshnessLevel(null, now)).toBe('never');
    expect(
      freshnessLevel({ ...run('a', 0), finishedAtMs: now - 2 * 86_400_000, status: 'done' }, now),
    ).toBe('fresh');
    expect(
      freshnessLevel({ ...run('a', 0), finishedAtMs: now - 10 * 86_400_000, status: 'done' }, now),
    ).toBe('aging');
    expect(
      freshnessLevel({ ...run('a', 0), finishedAtMs: now - 40 * 86_400_000, status: 'done' }, now),
    ).toBe('stale');

    const view = job('mirror', []);
    const id = view.job.id;
    const rows = jobFreshnessRows(
      [view],
      [
        { ...run(id, 100), finishedAtMs: now - 86_400_000 },
        { ...run(id, 50), finishedAtMs: now - 2 * 86_400_000 },
      ],
      now,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.level).toBe('fresh');
    expect(rows[0]?.recentRuns.map((dot) => dot.status)).toEqual(['done', 'done']);
  });
});

describe('backupStats', () => {
  it('takes the newest run as last and sums copied bytes', () => {
    const newer = run('c3c3c3c3-0000-4000-8000-000000000001', 100);
    const older = run('c3c3c3c3-0000-4000-8000-000000000002', 50);
    const stats = backupStats([newer, older]);
    expect(stats.runCount).toBe(2);
    expect(stats.bytesCopied).toBe(150);
    expect(stats.last).toBe(newer);
    expect(latestByJob([newer, older]).get(newer.jobId)).toBe(newer);
  });
});
