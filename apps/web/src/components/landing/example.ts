import type { CapitalPlanInput, Hypotheses } from "financial-engine";

// One clearly labelled example shared by the free preview and the paid report extract on the
// landing page, so both show figures computed by the same engine on the same idea.
export const EXAMPLE_HYPOTHESES: Hypotheses = {
  currency: "XOF",
  price: 15000,
  volume: 40,
  variableCostPerUnit: 9000,
  fixedCosts: 120000,
};

export const EXAMPLE_CAPITAL: CapitalPlanInput = {
  equipment: 300000,
  initialStock: 200000,
  openingCosts: 0,
  other: 0,
  availableCapital: 400000,
};
