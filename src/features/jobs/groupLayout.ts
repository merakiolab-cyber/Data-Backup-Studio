import type { JobGroup, JobGroupId, JobView } from '@/lib/bindings';

export interface JobSection {
  /** `null` = ungrouped jobs at the bottom. */
  group: JobGroup | null;
  jobs: JobView[];
}

/** Groups jobs for the Jobs page: named groups first (by sortOrder), then ungrouped. */
export function buildJobSections(groups: JobGroup[], jobs: JobView[]): JobSection[] {
  const byGroup = new Map<JobGroupId, JobView[]>();
  const ungrouped: JobView[] = [];
  for (const view of jobs) {
    const id = view.job.groupId ?? null;
    if (id === null) {
      ungrouped.push(view);
      continue;
    }
    const list = byGroup.get(id) ?? [];
    list.push(view);
    byGroup.set(id, list);
  }

  const ordered = [...groups].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  const sections: JobSection[] = ordered.map((group) => ({
    group,
    jobs: sortJobs(byGroup.get(group.id) ?? []),
  }));
  if (ungrouped.length > 0 || sections.length === 0) {
    sections.push({ group: null, jobs: sortJobs(ungrouped) });
  }
  return sections;
}

function sortJobs(jobs: JobView[]): JobView[] {
  return [...jobs].sort((a, b) =>
    a.job.name.localeCompare(b.job.name, undefined, { sensitivity: 'base' }),
  );
}

const DRAG_PREFIX = 'dbs-jobs:';

/** Payload for dragging one or more job tiles onto a group. */
export function encodeJobDrag(ids: string[]): string {
  return DRAG_PREFIX + ids.join(',');
}

export function decodeJobDrag(raw: string): string[] | null {
  if (!raw.startsWith(DRAG_PREFIX)) {
    return null;
  }
  const ids = raw
    .slice(DRAG_PREFIX.length)
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return ids.length > 0 ? ids : null;
}

const COLLAPSED_KEY = 'dbs-job-groups-collapsed';

/** Persists which groups the user collapsed (UI-only; not in config.json). */
export function readCollapsedGroups(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export function writeCollapsedGroups(ids: Set<string>): void {
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...ids]));
}
