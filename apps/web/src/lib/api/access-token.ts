const ACCESS_KEY_PREFIX = "ca-tient:access:";

// Fallback for when localStorage throws (private browsing, storage disabled): keeps the free
// flow (wizard -> results -> canvas) working for this tab even without persistence. Lost on
// reload, which matters after the FedaPay redirect — see isAccessTokenPersisted below.
const memoryTokens = new Map<string, string>();

export function saveAccessToken(ideaId: string, token: string): void {
  memoryTokens.set(ideaId, token);
  try {
    window.localStorage.setItem(`${ACCESS_KEY_PREFIX}${ideaId}`, token);
  } catch {
    // ignored on purpose: memoryTokens already has it
  }
}

export function readAccessToken(ideaId: string): string | null {
  const inMemory = memoryTokens.get(ideaId);
  if (inMemory) return inMemory;
  try {
    return window.localStorage.getItem(`${ACCESS_KEY_PREFIX}${ideaId}`);
  } catch {
    return null;
  }
}

// True only if the token actually made it into localStorage (survives a reload/redirect),
// as opposed to only living in memoryTokens for this tab.
export function isAccessTokenPersisted(ideaId: string): boolean {
  try {
    return window.localStorage.getItem(`${ACCESS_KEY_PREFIX}${ideaId}`) !== null;
  } catch {
    return false;
  }
}

export function forgetAccessToken(ideaId: string): void {
  memoryTokens.delete(ideaId);
  try {
    window.localStorage.removeItem(`${ACCESS_KEY_PREFIX}${ideaId}`);
  } catch {
    // nothing stored
  }
}

export function ideaIdsFromStorageKeys(keys: readonly string[]): string[] {
  return keys
    .filter((key) => key.startsWith(ACCESS_KEY_PREFIX) && key.length > ACCESS_KEY_PREFIX.length)
    .map((key) => key.slice(ACCESS_KEY_PREFIX.length));
}

// Ideas created or reopened in this browser: the tokens are the only link we keep, no account needed.
export function storedIdeaIds(): string[] {
  try {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index) ?? "");
    return ideaIdsFromStorageKeys(keys);
  } catch {
    return [];
  }
}
