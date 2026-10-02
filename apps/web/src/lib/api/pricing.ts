import { API_BASE_URL } from "./http";

// Shown only when the API cannot be reached; the amount actually charged always comes from the server.
export const FALLBACK_ANALYSIS_PRICE_XOF = 1000;
const PRICE_REVALIDATE_SECONDS = 60;
// The free API host sleeps when idle: never let the landing page wait for it to wake up.
const PRICE_TIMEOUT_MS = 3_000;

// Server components: cached and refreshed in the background, so a price change on the API reaches
// the landing page within PRICE_REVALIDATE_SECONDS.
export async function getAnalysisPrice(): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/pricing`, {
      next: { revalidate: PRICE_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(PRICE_TIMEOUT_MS),
    });
    if (!response.ok) return FALLBACK_ANALYSIS_PRICE_XOF;
    return ((await response.json()) as { analysisPriceXof: number }).analysisPriceXof;
  } catch {
    return FALLBACK_ANALYSIS_PRICE_XOF;
  }
}

// Client components: the offer screen asks right before payment.
export async function fetchAnalysisPrice(): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/pricing`);
  if (!response.ok) throw new Error(`Prix indisponible (${response.status}).`);
  return ((await response.json()) as { analysisPriceXof: number }).analysisPriceXof;
}
