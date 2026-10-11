import type { UiLocale } from '@/lib/bindings';
import type { Locale } from './catalog';

export const STORAGE_KEY = 'dbs-locale';

let activeLocale: Locale = 'cs';

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

export function readStoredLocale(): Locale {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'en' || value === 'cs') {
      return value;
    }
  } catch {
    // ignore missing storage
  }
  return 'cs';
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore quota / private mode
  }
}

export function toLocale(value: UiLocale | string | undefined | null): Locale {
  return value === 'en' ? 'en' : 'cs';
}
