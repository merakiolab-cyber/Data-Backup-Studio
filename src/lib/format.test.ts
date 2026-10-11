import {
  driveLabel,
  formatBytes,
  formatDuration,
  formatEta,
  formatSpeed,
  formatWhen,
  runPace,
} from './format';

describe('formatBytes', () => {
  it('formats like Windows Explorer with Czech decimals', () => {
    expect(formatBytes(0)).toBe('0\u00a0B');
    expect(formatBytes(512)).toBe('512\u00a0B');
    expect(formatBytes(1536)).toBe('1,5\u00a0kB');
    expect(formatBytes(2_000_398_934_016)).toBe('1,8\u00a0TB');
    expect(formatBytes(500 * 1024 ** 3)).toBe('500\u00a0GB');
  });
});

describe('driveLabel', () => {
  it('shortens drive roots only', () => {
    expect(driveLabel('E:\\')).toBe('E:');
    expect(driveLabel('C:\\Mount\\Zaloha\\')).toBe('C:\\Mount\\Zaloha\\');
  });
});

describe('formatWhen', () => {
  const noon = Date.parse('2026-10-11T12:00:00');

  it('uses today, yesterday and a calendar date', () => {
    expect(formatWhen(Date.parse('2026-10-11T14:32:00'), noon)).toMatch(/^dnes /);
    expect(formatWhen(Date.parse('2026-10-10T09:05:00'), noon)).toMatch(/^včera /);
    expect(formatWhen(Date.parse('2026-10-08T09:05:00'), noon)).toBe('před 3 dny');
    expect(formatWhen(Date.parse('2026-09-01T09:05:00'), noon)).toBe('1. 9. 2026');
  });
});

describe('formatDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatDuration(0, 12_000)).toBe('12 s');
    expect(formatDuration(0, 180_000)).toBe('3 min');
    expect(formatDuration(0, 184_000)).toBe('3 min 4 s');
    expect(formatDuration(0, 3_600_000)).toBe('1 h');
    expect(formatDuration(0, 3_900_000)).toBe('1 h 5 min');
  });
});

describe('runPace', () => {
  it('waits for warmup and then estimates ETA', () => {
    expect(runPace(8_000_000, 80_000_000, 400)).toEqual({ bytesPerSec: null, etaSeconds: null });
    expect(runPace(10_000_000, 40_000_000, 2_000)).toEqual({
      bytesPerSec: 5_000_000,
      etaSeconds: 6,
    });
    expect(runPace(40_000_000, 40_000_000, 2_000).etaSeconds).toBe(0);
  });
});

describe('formatSpeed', () => {
  it('appends per second', () => {
    expect(formatSpeed(1536)).toBe('1,5\u00a0kB/s');
    expect(formatEta(3)).toBe('skoro hotovo');
    expect(formatEta(184)).toBe('zbývá 3 min 4 s');
  });
});
