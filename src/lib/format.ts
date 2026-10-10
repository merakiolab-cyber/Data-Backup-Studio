const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'] as const;

/** Formats bytes the way Windows Explorer does (base 1024), e.g. `1,8 TB`. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0\u00a0B';
  }
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const formatted = new Intl.NumberFormat('cs-CZ', {
    maximumFractionDigits: value < 10 && exponent > 0 ? 1 : 0,
  }).format(value);
  return `${formatted}\u00a0${UNITS[exponent]}`;
}

/** `E:\` → `E:`; folder mount points are returned unchanged. */
export function driveLabel(mountPoint: string): string {
  return /^[A-Za-z]:\\$/.test(mountPoint) ? mountPoint.slice(0, 2) : mountPoint;
}
