import { DEFAULT_LOCALE, type Locale } from "./locales";

// "/en", "/en/...", "/en?..." or "/en#..." — never "/enfant".
const PREFIX = /^\/(en|fr)(?=\/|$|\?|#)/;

export function stripLocale(pathname: string): { locale: Locale; path: string } {
  const match = pathname.match(PREFIX);
  if (!match) return { locale: DEFAULT_LOCALE, path: pathname };
  const rest = pathname.slice(match[0].length);
  return { locale: match[1] as Locale, path: rest.startsWith("/") ? rest : `/${rest}` };
}

// French lives at the root, English under /en: one address per page and language.
export function localizedPath(path: string, locale: Locale): string {
  const { path: bare } = stripLocale(path);
  if (locale === DEFAULT_LOCALE) return bare;
  if (bare === "/") return "/en";
  if (bare.startsWith("/?") || bare.startsWith("/#")) return `/en${bare.slice(1)}`;
  return `/en${bare}`;
}

export type LocaleRoute =
  | { action: "next" }
  | { action: "rewrite"; pathname: string }
  | { action: "redirect"; pathname: string };

export function resolveLocaleRoute(pathname: string): LocaleRoute {
  const match = pathname.match(PREFIX);
  if (match?.[1] === "en") return { action: "next" };
  if (match?.[1] === "fr") return { action: "redirect", pathname: stripLocale(pathname).path };
  return { action: "rewrite", pathname: pathname === "/" ? "/fr" : `/fr${pathname}` };
}
