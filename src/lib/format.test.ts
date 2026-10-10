import { driveLabel, formatBytes } from './format';

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
