// Once the visitor has chosen a language (switch or banner), the suggestion banner never comes back.
const COOKIE = "ct_lang_hint";
const listeners = new Set<() => void>();

export function hasLanguageChoice(): boolean {
  return document.cookie.split("; ").some((entry) => entry.startsWith(`${COOKIE}=`));
}

export function rememberLanguageChoice() {
  document.cookie = `${COOKIE}=1; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`;
  listeners.forEach((listener) => listener());
}

export function subscribeLanguageChoice(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
