import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { DICTIONARIES, type Dictionary } from "./dictionaries";
import { localizedPath } from "./locale-route";
import { hasLocale, type Locale } from "./locales";

// Server components read the language from the [lang] root segment, without prop drilling.
export async function getI18n(): Promise<{ locale: Locale; t: Dictionary; href: (path: string) => string }> {
  const value = await lang();
  if (!value || !hasLocale(value)) notFound();
  return { locale: value, t: DICTIONARIES[value], href: (path) => localizedPath(path, value) };
}
