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
