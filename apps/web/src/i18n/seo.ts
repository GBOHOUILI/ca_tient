import { localizedPath } from "./locale-route";
import type { Locale } from "./locales";

// hreflang links: every indexable page exists in both languages, French being the default.
export function alternatesFor(path: string, locale: Locale) {
  const fr = localizedPath(path, "fr");
  return {
    canonical: localizedPath(path, locale),
    languages: { fr, en: localizedPath(path, "en"), "x-default": fr },
  };
}
