import { FinancialEngineInputError } from "./financial-engine.errors.js";
import { SUPPORTED_CURRENCIES, type Hypotheses } from "./financial-engine.types.js";

function assertSafeNonNegativeInteger(value: number, field: string): void {
  if (!Number.isInteger(value)) {
    throw new FinancialEngineInputError(`${field} doit être un entier (plus petite unité de la devise).`);
  }
  if (value < 0) {
    throw new FinancialEngineInputError(`${field} ne peut pas être négatif.`);
  }
  if (value > Number.MAX_SAFE_INTEGER) {
    throw new FinancialEngineInputError(`${field} dépasse la limite numérique sûre.`);
  }
}

export function assertValidHypotheses(hypotheses: Hypotheses): void {
  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(hypotheses.currency)) {
    throw new FinancialEngineInputError(`Devise non supportée : ${hypotheses.currency}.`);
  }

  assertSafeNonNegativeInteger(hypotheses.price, "price");
  if (hypotheses.price === 0) {
    throw new FinancialEngineInputError("price doit être strictement positif.");
  }
  assertSafeNonNegativeInteger(hypotheses.variableCostPerUnit, "variableCostPerUnit");
  assertSafeNonNegativeInteger(hypotheses.fixedCosts, "fixedCosts");
  assertSafeNonNegativeInteger(hypotheses.volume, "volume");
}
