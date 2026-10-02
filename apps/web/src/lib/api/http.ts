import { readAccessToken } from "./access-token";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function authHeaders(ideaId: string): Record<string, string> {
  const token = readAccessToken(ideaId);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class AccessDeniedError extends Error {
  constructor() {
    super("Acces a cette analyse refuse depuis ce navigateur.");
    this.name = "AccessDeniedError";
  }
}
