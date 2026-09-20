import { applyDelta } from "./scenarios.js";
import { computeResult } from "./financial-engine.calculations.js";
import type { Hypotheses, FinancialResult } from "./financial-engine.types.js";

export type SeasonalityProfileKey = "stable" | "fetes_fin_annee" | "ete" | "rentree_scolaire";

export interface MonthlyResult {
  month: number; // 1 = janvier ... 12 = décembre
  result: FinancialResult;
}

// Pourcentages de variation du volume par mois (janvier -> decembre), somme = 0.
// Points de depart a calibrer avec des donnees reelles avant mise en production,
// meme statut que SCENARIO_DELTAS dans scenarios.ts ("un point de depart, a valider").
export const SEASONALITY_PROFILES: Record<SeasonalityProfileKey, number[]> = {
  stable: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  fetes_fin_annee: [-25, -20, -10, -5, 0, 0, 0, 0, 0, 5, 25, 30],
  ete: [-10, -10, -5, 0, 5, 20, 30, 20, -5, -15, -15, -15],
  rentree_scolaire: [-10, -10, -5, -5, -5, -10, -15, 0, 30, 35, 0, -5],
};

export function computeAnnualProjection(base: Hypotheses, profile: SeasonalityProfileKey): MonthlyResult[] {
  return SEASONALITY_PROFILES[profile].map((percent, index) => ({
    month: index + 1,
    result: computeResult(applyDelta(base, { volume: percent })),
  }));
}
