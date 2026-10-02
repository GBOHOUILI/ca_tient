import { assertSafeNonNegativeInteger, assertValidHypotheses } from "./financial-engine.validation.js";
import type { CurrencyCode, Hypotheses } from "./financial-engine.types.js";

// Forfait de trésorerie : le moteur n'a pas de montée en charge mois par mois, un cumul
// des pertes jusqu'au point mort vaudrait 0 dès que le mois type est rentable.
export const CASH_RESERVE_MONTHS = 3;

export interface CapitalPlanInput {
  equipment: number;
  initialStock: number;
  openingCosts: number;
  other: number;
  availableCapital: number;
}

export interface CapitalNeed {
  currency: CurrencyCode;
  startupCosts: number;
  cashReserve: number;
  capitalNeeded: number;
  availableCapital: number;
  financingGap: number;
  surplus: number;
}

export function computeCapitalNeed(hypotheses: Hypotheses, capital: CapitalPlanInput): CapitalNeed {
  assertValidHypotheses(hypotheses);
  for (const field of ["equipment", "initialStock", "openingCosts", "other", "availableCapital"] as const) {
    assertSafeNonNegativeInteger(capital[field], field);
  }

  const startupCosts = capital.equipment + capital.initialStock + capital.openingCosts + capital.other;
  const cashReserve = CASH_RESERVE_MONTHS * hypotheses.fixedCosts;
  const capitalNeeded = startupCosts + cashReserve;
  assertSafeNonNegativeInteger(capitalNeeded, "capitalNeeded");

  return {
    currency: hypotheses.currency,
    startupCosts,
    cashReserve,
    capitalNeeded,
    availableCapital: capital.availableCapital,
    financingGap: Math.max(0, capitalNeeded - capital.availableCapital),
    surplus: Math.max(0, capital.availableCapital - capitalNeeded),
  };
}
