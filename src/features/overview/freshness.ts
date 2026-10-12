import type { JobView, RunSummary } from '@/lib/bindings';
import { latestByJob } from './stats';

const DAY_MS = 86_400_000;
export const FRESH_DAYS = 7;
export const STALE_DAYS = 30;
const RECENT_DOTS = 5;

export type FreshnessLevel =
  | 'never'
  | 'current'
  | 'fresh'
  | 'aging'
  | 'stale'
  | 'failed'
  | 'cancelled';

export interface JobFreshnessRow {
  view: JobView;
  lastRun: RunSummary | null;
  level: FreshnessLevel;
  /** Whole days since the last finished run; `null` when there is no run. */
  daysSince: number | null;
  /** Newest-first dots for the last few runs of this job. */
  recentRuns: Pick<RunSummary, 'id' | 'status'>[];
}

/** Successful run that only verified source/target are already in sync. */
export function isNoChangeRun(run: RunSummary): boolean {
  return (
    run.status === 'done' &&
    run.copied === 0 &&
    run.updated === 0 &&
    run.deleted === 0 &&
    run.dirsCreated === 0 &&
    run.errorCount === 0
  );
}

export function freshnessLevel(run: RunSummary | null, now = Date.now()): FreshnessLevel {
  if (!run) {
    return 'never';
  }
  if (run.status === 'failed') {
    return 'failed';
  }
  if (run.status === 'cancelled') {
    return 'cancelled';
  }
  if (isNoChangeRun(run)) {
    return 'current';
  }
  const days = (now - run.finishedAtMs) / DAY_MS;
  if (days <= FRESH_DAYS) {
    return 'fresh';
  }
  if (days <= STALE_DAYS) {
    return 'aging';
  }
  return 'stale';
}

export function daysSinceRun(run: RunSummary | null, now = Date.now()): number | null {
  if (!run) {
    return null;
  }
  return Math.max(0, Math.floor((now - run.finishedAtMs) / DAY_MS));
}

/** One row per job, sorted by name. */
export function jobFreshnessRows(
  jobs: JobView[],
  runs: RunSummary[],
  now = Date.now(),
): JobFreshnessRow[] {
  const latest = latestByJob(runs);
  const byJob = new Map<string, RunSummary[]>();
  for (const run of runs) {
    const list = byJob.get(run.jobId) ?? [];
    list.push(run);
    byJob.set(run.jobId, list);
  }

  return [...jobs]
    .sort((a, b) => a.job.name.localeCompare(b.job.name, undefined, { sensitivity: 'base' }))
    .map((view) => {
      const jobRuns = byJob.get(view.job.id) ?? [];
      const lastRun = latest.get(view.job.id) ?? null;
      return {
        view,
        lastRun,
        level: freshnessLevel(lastRun, now),
        daysSince: daysSinceRun(lastRun, now),
        recentRuns: jobRuns
          .slice(0, RECENT_DOTS)
          .map((run) => ({ id: run.id, status: run.status })),
      };
    });
}
