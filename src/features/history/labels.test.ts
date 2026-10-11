import type { RunSummary } from '@/lib/bindings';
import { catalogs } from '@/lib/i18n/catalog';
import { runCounts } from './labels';

function run(partial: Partial<RunSummary>): RunSummary {
  return {
    id: 'd4d4d4d4-0000-4000-8000-000000000001',
    jobId: 'c3c3c3c3-0000-4000-8000-000000000001',
    jobName: 'Fotky',
    mode: 'mirror',
    status: 'done',
    startedAtMs: 0,
    finishedAtMs: 1,
    copied: 0,
    updated: 0,
    deleted: 0,
    dirsCreated: 0,
    bytesCopied: 0,
    errorCount: 0,
    ...partial,
  };
}

describe('runCounts', () => {
  it('joins copied, updated and deleted counts', () => {
    expect(runCounts(run({ copied: 3, updated: 1, deleted: 2 }), catalogs.cs)).toBe(
      '3 nové · 1 změněné · 2 smazané',
    );
    expect(runCounts(run({}), catalogs.cs)).toBe('Beze změn');
    expect(runCounts(run({ status: 'failed' }), catalogs.cs)).toBe('Nic se nezkopírovalo');
  });
});
