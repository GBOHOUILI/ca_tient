import { computeResult } from "./financial-engine.calculations.js";
import { applyDelta } from "./scenarios.js";
import type { Hypotheses } from "./financial-engine.types.js";

export const SENSITIVITY_PERCENT = 10;

export type SensitivityKey = "price" | "volume" | "variableCostPerUnit" | "fixedCosts";

export interface SensitivityEntry {
  key: SensitivityKey;
  resultIfUp: number;
  resultIfDown: number;
  impact: number;
}

const KEYS: readonly SensitivityKey[] = ["price", "volume", "variableCostPerUnit", "fixedCosts"];

export function computeSensitivity(hypotheses: Hypotheses): SensitivityEntry[] {
  const base = computeResult(hypotheses).estimatedResult;

  const entries = KEYS.map((key) => {
    const resultIfUp = computeResult(applyDelta(hypotheses, { [key]: SENSITIVITY_PERCENT })).estimatedResult;
    const resultIfDown = computeResult(applyDelta(hypotheses, { [key]: -SENSITIVITY_PERCENT })).estimatedResult;
    const impact = Math.max(Math.abs(resultIfUp - base), Math.abs(resultIfDown - base));
    return { key, resultIfUp, resultIfDown, impact };
  });

  // Array.prototype.sort is stable: equal impacts keep the KEYS order.
  return entries.sort((a, b) => b.impact - a.impact);
}
