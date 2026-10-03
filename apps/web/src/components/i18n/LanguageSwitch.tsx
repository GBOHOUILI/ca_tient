"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { localizedPath } from "@/i18n/locale-route";
import { rememberLanguageChoice } from "./language-hint";

// Opens the same page in the other language, keeping the query string and the anchor.
export function LanguageSwitch({ className, onSwitch }: { className?: string; onSwitch?: () => void }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const other = locale === "fr" ? "en" : "fr";

  return (
    <a
      href={localizedPath(pathname, other)}
      hrefLang={other}
      lang={other}
      aria-label={t.header.switchLanguageLabel}
      onClick={(event) => {
        event.preventDefault();
        rememberLanguageChoice();
        onSwitch?.();
        const { pathname: current, search, hash } = window.location;
        window.location.assign(localizedPath(`${current}${search}${hash}`, other));
      }}
      className={className}
    >
      {t.header.switchLanguage}
    </a>
  );
}
