import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useSettings } from '@/features/settings/api';
import { catalogs, type Locale, type Messages } from './catalog';
import { persistLocale, readStoredLocale, setActiveLocale, toLocale } from './locale';

export type { Locale, Messages } from './catalog';
export { fmt } from './catalog';
export { getActiveLocale, toLocale } from './locale';

interface I18nValue {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue>({
  locale: 'cs',
  t: catalogs.cs,
  setLocale: () => undefined,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    if (settings.data?.locale) {
      setLocaleState(toLocale(settings.data.locale));
    }
  }, [settings.data?.locale]);

  useEffect(() => {
    persistLocale(locale);
    setActiveLocale(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t: catalogs[locale],
      setLocale: setLocaleState,
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nValue {
  return useContext(I18nContext);
}
