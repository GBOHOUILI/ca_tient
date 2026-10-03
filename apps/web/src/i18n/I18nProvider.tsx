"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DICTIONARIES, type Dictionary } from "./dictionaries";
import { localizedPath } from "./locale-route";
import type { Locale } from "./locales";

interface I18nValue {
  locale: Locale;
  t: Dictionary;
  href: (path: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

// Only the locale crosses the server/client boundary: dictionaries hold functions, which cannot.
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(
    () => ({ locale, t: DICTIONARIES[locale], href: (path: string) => localizedPath(path, locale) }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
