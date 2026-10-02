import { readAccessToken } from "./access-token";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function authHeaders(ideaId: string): Record<string, string> {
  const token = readAccessToken(ideaId);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class AccessDeniedError extends Error {
  constructor() {
    super("Accès à cette analyse refusé depuis ce navigateur.");
    this.name = "AccessDeniedError";
  }
}
