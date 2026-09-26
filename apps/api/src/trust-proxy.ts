// Behind a reverse proxy, req.ip (used by the rate limiter) is the proxy's IP unless Express
// trusts it. The right value depends on the hosting (hop count, subnet), hence an env variable.
export function parseTrustProxy(value: string | undefined): boolean | number | string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}
