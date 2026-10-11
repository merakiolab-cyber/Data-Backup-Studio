import type { JobGroup, JobView } from '@/lib/bindings';
import { buildJobSections, decodeJobDrag, encodeJobDrag } from './groupLayout';

function view(id: string, name: string, groupId: string | null = null): JobView {
  return {
    job: {
      id,
      name,
      source: { volumeId: 's', relPath: 'A' },
      target: { volumeId: 't', relPath: 'B' },
      mode: 'mirror',
      excludes: [],
      groupId,
      createdAtMs: 0,
      updatedAtMs: 0,
    },
    source: { volumeName: 'Data', status: { state: 'connected' }, path: 'D:\\A' },
    target: { volumeName: 'Disk', status: { state: 'connected' }, path: 'G:\\B' },
  };
}

const groups: JobGroup[] = [
  { id: 'g2', name: 'Seagate', sortOrder: 2 },
  { id: 'g1', name: 'WD Elements', sortOrder: 1 },
];

describe('buildJobSections', () => {
  it('orders groups by sortOrder and keeps ungrouped last', () => {
    const sections = buildJobSections(groups, [
      view('j3', 'C', null),
      view('j1', 'B', 'g1'),
      view('j2', 'A', 'g1'),
      view('j4', 'Z', 'g2'),
    ]);
    expect(sections.map((s) => s.group?.name ?? null)).toEqual(['WD Elements', 'Seagate', null]);
    expect(sections[0]?.jobs.map((j) => j.job.name)).toEqual(['A', 'B']);
    expect(sections[2]?.jobs.map((j) => j.job.name)).toEqual(['C']);
  });
});

describe('job drag payload', () => {
  it('round-trips job ids and ignores other text', () => {
    const raw = encodeJobDrag(['a', 'b']);
    expect(decodeJobDrag(raw)).toEqual(['a', 'b']);
    expect(decodeJobDrag('Fotky')).toBeNull();
    expect(decodeJobDrag('dbs-jobs:')).toBeNull();
  });
});
