import { computeResult, computeBreakEven } from "./financial-engine.calculations.js";
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

describe("computeResult", () => {
  it("computes revenue, gross margin and estimated result for the nominal case", () => {
    const result = computeResult(hypotheses());

    expect(result).toEqual({
      currency: "XOF",
      revenue: 250000,
      grossMargin: 150000,
      estimatedResult: 50000,
    });
  });

  it("returns a zero revenue and a negative result when volume is zero", () => {
    const result = computeResult(hypotheses({ volume: 0 }));

    expect(result).toEqual({
      currency: "XOF",
      revenue: 0,
      grossMargin: 0,
      estimatedResult: -100000,
    });
  });

  it("rejects invalid hypotheses", () => {
    expect(() => computeResult(hypotheses({ price: -1 }))).toThrow(FinancialEngineInputError);
  });
});

describe("computeBreakEven", () => {
  it("computes the break-even volume for the nominal case", () => {
    const result = computeBreakEven(hypotheses());

    expect(result).toEqual({ reachable: true, volumeUnits: 34 });
  });

  it("is exactly reachable when fixed costs divide evenly by the unit margin", () => {
    const result = computeBreakEven(hypotheses({ fixedCosts: 90000 }));

    expect(result).toEqual({ reachable: true, volumeUnits: 30 });
  });

  it("is reachable at volume zero when fixed costs are zero", () => {
    const result = computeBreakEven(hypotheses({ fixedCosts: 0 }));

    expect(result).toEqual({ reachable: true, volumeUnits: 0 });
  });

  it("is unreachable when the unit margin is zero", () => {
    const result = computeBreakEven(hypotheses({ price: 2000, variableCostPerUnit: 2000 }));

    expect(result).toEqual({ reachable: false, reason: "non_positive_unit_margin" });
  });

  it("is unreachable when the unit margin is negative", () => {
    const result = computeBreakEven(hypotheses({ price: 1000, variableCostPerUnit: 2000 }));

    expect(result).toEqual({ reachable: false, reason: "non_positive_unit_margin" });
  });

  it("rejects invalid hypotheses", () => {
    expect(() => computeBreakEven(hypotheses({ fixedCosts: -1 }))).toThrow(FinancialEngineInputError);
  });
});
