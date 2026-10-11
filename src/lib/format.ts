import { catalogs, fmt, type Locale } from './i18n/catalog';
import { getActiveLocale } from './i18n/locale';

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'] as const;

function intlTag(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'cs-CZ';
}

/** Formats bytes the way Windows Explorer does (base 1024), e.g. `1,8 TB`. */
export function formatBytes(bytes: number, locale: Locale = getActiveLocale()): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0\u00a0B';
  }
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const formatted = new Intl.NumberFormat(intlTag(locale), {
    maximumFractionDigits: value < 10 && exponent > 0 ? 1 : 0,
  }).format(value);
  return `${formatted}\u00a0${UNITS[exponent]}`;
}

/** `E:\` → `E:`; folder mount points are returned unchanged. */
export function driveLabel(mountPoint: string): string {
  return /^[A-Za-z]:\\$/.test(mountPoint) ? mountPoint.slice(0, 2) : mountPoint;
}

const DAY_MS = 86_400_000;

function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Relative timestamp for a finished run, e.g. `dnes 14:32` / `today 14:32`. */
export function formatWhen(
  ms: number,
  now = Date.now(),
  locale: Locale = getActiveLocale(),
): string {
  const date = new Date(ms);
  const time = new Intl.DateTimeFormat(intlTag(locale), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / DAY_MS);
  const text = catalogs[locale].format;
  if (days === 0) {
    return fmt(text.today, { time });
  }
  if (days === 1) {
    return fmt(text.yesterday, { time });
  }
  if (days >= 2 && days < 14) {
    return fmt(text.daysAgo, { days });
  }
  return new Intl.DateTimeFormat(intlTag(locale), {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(date);
}

/** Elapsed time between two timestamps, e.g. `12 s` or `3 min 4 s`. */
export function formatDuration(startedAtMs: number, finishedAtMs: number): string {
  const seconds = Math.max(0, Math.round((finishedAtMs - startedAtMs) / 1000));
  if (seconds < 60) {
    return `${seconds} s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) {
    return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
  }
  const hours = Math.floor(minutes / 60);
  const minRest = minutes % 60;
  return minRest === 0 ? `${hours} h` : `${hours} h ${minRest} min`;
}

export interface RunPace {
  bytesPerSec: number | null;
  etaSeconds: number | null;
}

/** Instantaneous average since the start of the run. Needs a short warmup so the first files don't spike ETA. */
export function runPace(bytesDone: number, bytesTotal: number, elapsedMs: number): RunPace {
  if (elapsedMs < 800 || bytesDone <= 0) {
    return { bytesPerSec: null, etaSeconds: null };
  }
  const bytesPerSec = bytesDone / (elapsedMs / 1000);
  if (bytesTotal > 0 && bytesDone >= bytesTotal) {
    return { bytesPerSec, etaSeconds: 0 };
  }
  if (bytesTotal <= bytesDone) {
    return { bytesPerSec, etaSeconds: null };
  }
  return { bytesPerSec, etaSeconds: (bytesTotal - bytesDone) / bytesPerSec };
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatEta(seconds: number, locale: Locale = getActiveLocale()): string {
  const text = catalogs[locale].format;
  if (seconds < 5) {
    return text.almostDone;
  }
  return fmt(text.remaining, { duration: formatDuration(0, seconds * 1000) });
}
