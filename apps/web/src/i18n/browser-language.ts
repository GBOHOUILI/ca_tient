import { hasLocale, type Locale } from "./locales";

// First language of navigator.languages that the site supports ("en-US" -> "en").
export function preferredLocale(languages: readonly string[]): Locale | null {
  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if (hasLocale(base)) return base;
  }
  return null;
}
