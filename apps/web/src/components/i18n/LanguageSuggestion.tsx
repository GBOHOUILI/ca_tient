"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { preferredLocale } from "@/i18n/browser-language";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { useI18n } from "@/i18n/I18nProvider";
import { localizedPath } from "@/i18n/locale-route";
import type { Locale } from "@/i18n/locales";
import { hasLanguageChoice, rememberLanguageChoice, subscribeLanguageChoice } from "./language-hint";

// Suggests the other language when the browser prefers it; never redirects, so a shared link keeps its language.
export function LanguageSuggestion() {
  const { locale } = useI18n();
  const pathname = usePathname();
  const suggested = useSyncExternalStore<Locale | null>(
    subscribeLanguageChoice,
    () => {
      if (hasLanguageChoice()) return null;
      const preferred = preferredLocale(navigator.languages ?? []);
      return preferred && preferred !== locale ? preferred : null;
    },
    () => null,
  );

  if (!suggested) return null;
  const copy = DICTIONARIES[suggested].suggestion;

  return (
    <div lang={suggested} className="no-print flex items-center justify-center gap-3 border-b border-border bg-surface px-4 py-2 text-small">
      <span className="text-text-secondary">{copy.text}</span>
      <a
        href={localizedPath(pathname, suggested)}
        hrefLang={suggested}
        onClick={(event) => {
          event.preventDefault();
          rememberLanguageChoice();
          const { pathname: current, search, hash } = window.location;
          window.location.assign(localizedPath(`${current}${search}${hash}`, suggested));
        }}
        className="font-medium text-accent-emerald hover:underline"
      >
        {copy.link}
      </a>
      <button type="button" onClick={rememberLanguageChoice} aria-label={copy.close} className="text-text-secondary hover:text-text-primary">
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}
