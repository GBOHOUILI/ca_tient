export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export function asLocale(value: string): Locale {
  return (LOCALES as readonly string[]).includes(value) ? (value as Locale) : DEFAULT_LOCALE;
}

// Mirrors the web routing: French at the root, English under /en.
export function localePrefix(locale: Locale): string {
  return locale === "en" ? "/en" : "";
}
