import { DEFAULT_LOCALE, hasLocale, type Locale } from "@/i18n/locales";
import { saveAccessToken } from "./access-token";
import { API_BASE_URL, authHeaders } from "./http";

export class RecoveryCodeNotFoundError extends Error {
  constructor() {
    super("Ce code ne correspond à aucune analyse.");
    this.name = "RecoveryCodeNotFoundError";
  }
}

export class TooManyAttemptsError extends Error {
  constructor() {
    super("Trop d'essais.");
    this.name = "TooManyAttemptsError";
  }
}

export async function issueRecoveryCode(ideaId: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/recovery-code`, {
    method: "POST",
    headers: authHeaders(ideaId),
  });

  if (!response.ok) {
    throw new Error(`Le code n'a pas pu être généré (${response.status}).`);
  }

  return ((await response.json()) as { code: string }).code;
}

export async function redeemRecoveryCode(code: string): Promise<{ ideaId: string; locale: Locale }> {
  const response = await fetch(`${API_BASE_URL}/recovery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (response.status === 404 || response.status === 400) {
    throw new RecoveryCodeNotFoundError();
  }
  if (response.status === 429) {
    throw new TooManyAttemptsError();
  }
  if (!response.ok) {
    throw new Error(`La récupération a échoué (${response.status}).`);
  }

  const body = (await response.json()) as { ideaId: string; accessToken: string; locale?: string };
  saveAccessToken(body.ideaId, body.accessToken);
  return { ideaId: body.ideaId, locale: body.locale && hasLocale(body.locale) ? body.locale : DEFAULT_LOCALE };
}
