import { assertValidHypotheses } from "./financial-engine.validation.js";
import type { Hypotheses } from "./financial-engine.types.js";

export interface SensitivityDelta {
  price?: number;
  variableCostPerUnit?: number;
  fixedCosts?: number;
  volume?: number;
}

export type ScenarioKey = "prudent" | "realiste" | "ambitieux" | "crise";

// docs/FINANCIAL_ENGINE.md ne distingue pas coûts fixes/variables dans sa colonne
// "Coûts" : on applique le même pourcentage aux deux. Coefficients marqués par le
// document lui-même comme "un point de départ, à valider avant implémentation finale".
export const SCENARIO_DELTAS: Record<ScenarioKey, SensitivityDelta> = {
  prudent: { volume: -20, fixedCosts: 10, variableCostPerUnit: 10 },
  realiste: {},
  ambitieux: { volume: 30 },
  crise: { volume: -40, price: -10, fixedCosts: 15, variableCostPerUnit: 15 },
};

function applyPercent(value: number, percent: number | undefined): number {
  if (!percent) return value;
  return Math.round(value * (1 + percent / 100));
}

export function applyDelta(base: Hypotheses, delta: SensitivityDelta): Hypotheses {
  const adjusted: Hypotheses = {
    currency: base.currency,
    price: applyPercent(base.price, delta.price),
    variableCostPerUnit: applyPercent(base.variableCostPerUnit, delta.variableCostPerUnit),
    fixedCosts: applyPercent(base.fixedCosts, delta.fixedCosts),
    volume: applyPercent(base.volume, delta.volume),
  };

  assertValidHypotheses(adjusted);
  return adjusted;
}

export function applyScenario(base: Hypotheses, scenario: ScenarioKey): Hypotheses {
  return applyDelta(base, SCENARIO_DELTAS[scenario]);
}
