import { describe, expect, it } from 'vitest';
import { needsBackup } from './freshness';

describe('needsBackup', () => {
  it('accepts a backup up to a month old', () => {
    expect(needsBackup('fresh', 3)).toBe(false);
    expect(needsBackup('aging', 30)).toBe(false);
  });

  it('requires a backup when older than a month', () => {
    expect(needsBackup('stale', 31)).toBe(true);
    expect(needsBackup('stale', 180)).toBe(true);
  });

  it('requires a backup when there is none or the last run did not finish', () => {
    expect(needsBackup('never', null)).toBe(true);
    expect(needsBackup('failed', 1)).toBe(true);
    expect(needsBackup('cancelled', 0)).toBe(true);
  });

  it('does not trust an old "no changes" check', () => {
    expect(needsBackup('current', 2)).toBe(false);
    expect(needsBackup('current', 90)).toBe(true);
  });
});
