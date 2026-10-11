import type {
  BackupMode,
  JobView,
  RegisteredVolumeView,
  RunSummary,
  VolumeStatus,
} from '@/lib/bindings';

export interface DiskUsage {
  id: string;
  name: string;
  state: VolumeStatus['state'];
  totalBytes: number;
  /** Known only while the disk is connected. */
  freeBytes: number | null;
}

export interface OverviewStats {
  /** Capacity of all registered target disks, connected or not. */
  totalBytes: number;
  /** Free space on connected target disks; `null` when none is connected. */
  freeBytes: number | null;
  modes: Record<BackupMode, number>;
  excludes: number;
  disks: DiskUsage[];
}

export function overviewStats(registered: RegisteredVolumeView[], jobs: JobView[]): OverviewStats {
  const disks = registered.map<DiskUsage>(({ volume, status, live }) => ({
    id: volume.id,
    name: volume.name,
    state: status.state,
    totalBytes: live?.totalBytes ?? volume.totalBytes,
    freeBytes: status.state === 'connected' && live ? live.freeBytes : null,
  }));
  const connected = disks.filter((d) => d.freeBytes !== null);

  return {
    totalBytes: disks.reduce((sum, d) => sum + d.totalBytes, 0),
    freeBytes: connected.length ? connected.reduce((sum, d) => sum + (d.freeBytes ?? 0), 0) : null,
    modes: {
      update: jobs.filter((j) => j.job.mode === 'update').length,
      mirror: jobs.filter((j) => j.job.mode === 'mirror').length,
    },
    excludes: jobs.reduce((sum, j) => sum + j.job.excludes.length, 0),
    disks,
  };
}

export interface BackupStats {
  runCount: number;
  bytesCopied: number;
  last: RunSummary | null;
}

export function backupStats(runs: RunSummary[]): BackupStats {
  return {
    runCount: runs.length,
    bytesCopied: runs.reduce((sum, run) => sum + run.bytesCopied, 0),
    last: runs[0] ?? null,
  };
}

/** Latest finished run per job (input must already be newest-first). */
export function latestByJob(runs: RunSummary[]): Map<string, RunSummary> {
  const latest = new Map<string, RunSummary>();
  for (const run of runs) {
    if (!latest.has(run.jobId)) {
      latest.set(run.jobId, run);
    }
  }
  return latest;
}

/** Share of used space in 0–1, or `null` when the free space is unknown. */
export function usedRatio(disk: DiskUsage): number | null {
  if (disk.freeBytes === null || disk.totalBytes <= 0) {
    return null;
  }
  return Math.min(Math.max((disk.totalBytes - disk.freeBytes) / disk.totalBytes, 0), 1);
}
