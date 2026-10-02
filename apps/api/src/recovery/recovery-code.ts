import { createHash, randomInt } from "node:crypto";

// Crockford base32: no I, L, O, U, so a code read aloud or copied by hand stays unambiguous.
export const RECOVERY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 10;
const PREFIX = "CT";

export function generateRecoveryCode(): string {
  let raw = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) raw += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
  return `${PREFIX}-${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export function normalizeRecoveryCode(input: string): string | null {
  let compact = input.toUpperCase().replace(/[\s-]/g, "");
  // The prefix is only stripped from a full-length entry: a bare code may itself start with "CT".
  if (compact.length === CODE_LENGTH + PREFIX.length && compact.startsWith(PREFIX)) {
    compact = compact.slice(PREFIX.length);
  }
  compact = compact.replace(/O/g, "0").replace(/[IL]/g, "1");

  if (compact.length !== CODE_LENGTH) return null;
  for (const char of compact) if (!RECOVERY_ALPHABET.includes(char)) return null;
  return compact;
}

export function hashRecoveryCode(normalized: string): string {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
