import { computeAnnualProjection, SEASONALITY_PROFILES } from "./seasonality.js";
import { computeResult } from "./financial-engine.calculations.js";
import { applyScenario } from "./scenarios.js";
import { FinancialEngineInputError } from "./financial-engine.errors.js";
import type { Hypotheses } from "./financial-engine.types.js";

function hypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return {
    currency: "XOF",
    price: 5000,
    variableCostPerUnit: 2000,
    fixedCosts: 100000,
    volume: 50,
    ...overrides,
  };
}

describe("SEASONALITY_PROFILES", () => {
  it("exposes the four documented profile keys", () => {
    expect(Object.keys(SEASONALITY_PROFILES).sort()).toEqual(["ete", "fetes_fin_annee", "rentree_scolaire", "stable"]);
  });

  it("each profile has exactly 12 monthly percentages summing to zero", () => {
    for (const [key, percentages] of Object.entries(SEASONALITY_PROFILES)) {
      expect(percentages, `profile ${key} should have 12 months`).toHaveLength(12);
      const sum = percentages.reduce((total, value) => total + value, 0);
      expect(sum, `profile ${key} should average to zero`).toBe(0);
    }
  });
});

describe("computeAnnualProjection", () => {
  it("returns 12 monthly results numbered 1 to 12 in order", () => {
    const projection = computeAnnualProjection(hypotheses(), "stable");

    expect(projection).toHaveLength(12);
    expect(projection.map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("the stable profile matches the base result for all 12 months", () => {
    const projection = computeAnnualProjection(hypotheses(), "stable");
    const base = computeResult(hypotheses());

    for (const monthly of projection) {
      expect(monthly.result).toEqual(base);
    }
  });

  it("a non-stable profile redistributes volume: at least one month above and one below the base", () => {
    const projection = computeAnnualProjection(hypotheses(), "fetes_fin_annee");
    const base = computeResult(hypotheses());

    expect(projection.some((m) => m.result.revenue > base.revenue)).toBe(true);
    expect(projection.some((m) => m.result.revenue < base.revenue)).toBe(true);
  });

  it("composes with a scenario applied beforehand, not with the raw base", () => {
    const scenarioAdjusted = applyScenario(hypotheses(), "prudent");
    const projectionOnScenario = computeAnnualProjection(scenarioAdjusted, "fetes_fin_annee");
    const projectionOnRawBase = computeAnnualProjection(hypotheses(), "fetes_fin_annee");

    expect(projectionOnScenario).not.toEqual(projectionOnRawBase);
    // Le mois de decembre (index 11) du profil fetes_fin_annee a +30% de volume :
    // sur la base ajustee prudent (volume 40, cf. scenarios.spec.ts), 40 * 1.3 = 52.
    expect(projectionOnScenario[11]?.result.revenue).toBe(computeResult({ ...scenarioAdjusted, volume: 52 }).revenue);
  });

  it("rejects invalid base hypotheses regardless of profile", () => {
    expect(() => computeAnnualProjection(hypotheses({ price: 0 }), "stable")).toThrow(FinancialEngineInputError);
  });
});
