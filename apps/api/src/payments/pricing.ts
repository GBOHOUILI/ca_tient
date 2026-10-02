export const DEFAULT_ANALYSIS_PRICE_XOF = 1000;

// Price of the full analysis, in whole XOF (no subunit). The server is the only authority on the
// amount charged; the web app reads it from GET /pricing. 0 unlocks the analysis without payment.
export function analysisPriceXof(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.ANALYSIS_PRICE_XOF?.trim();
  if (!raw) return DEFAULT_ANALYSIS_PRICE_XOF;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`ANALYSIS_PRICE_XOF doit etre un montant entier positif ou nul en FCFA (recu : "${raw}").`);
  }
  return Number(raw);
}
