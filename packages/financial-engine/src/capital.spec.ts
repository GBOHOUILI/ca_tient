import { computeCapitalNeed, CASH_RESERVE_MONTHS, type CapitalPlanInput } from "./capital.js";
import { FinancialEngineInputError } from "./financial-engine.errors.js";
import type { Hypotheses } from "./financial-engine.types.js";

function hypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return { currency: "XOF", price: 5000, variableCostPerUnit: 2000, fixedCosts: 100000, volume: 50, ...overrides };
}

function capital(overrides: Partial<CapitalPlanInput> = {}): CapitalPlanInput {
  return { equipment: 200000, initialStock: 150000, openingCosts: 50000, other: 0, availableCapital: 500000, ...overrides };
}

describe("computeCapitalNeed", () => {
  it("adds startup costs and a reserve of 3 months of fixed costs", () => {
    expect(CASH_RESERVE_MONTHS).toBe(3);
    expect(computeCapitalNeed(hypotheses(), capital())).toEqual({
      currency: "XOF",
      startupCosts: 400000,
      cashReserve: 300000,
      capitalNeeded: 700000,
      availableCapital: 500000,
      financingGap: 200000,
      surplus: 0,
    });
  });

  it("reports a surplus when the available capital exceeds the need", () => {
    const need = computeCapitalNeed(hypotheses(), capital({ availableCapital: 900000 }));
    expect(need.financingGap).toBe(0);
    expect(need.surplus).toBe(200000);
  });

  it("has neither gap nor surplus when capital matches the need exactly", () => {
    const need = computeCapitalNeed(hypotheses(), capital({ availableCapital: 700000 }));
    expect(need.financingGap).toBe(0);
    expect(need.surplus).toBe(0);
  });

  it("zero fixed costs and nothing entered gives a zero need", () => {
    const need = computeCapitalNeed(hypotheses({ fixedCosts: 0 }), {
      equipment: 0,
      initialStock: 0,
      openingCosts: 0,
      other: 0,
      availableCapital: 0,
    });
    expect(need).toMatchObject({ startupCosts: 0, cashReserve: 0, capitalNeeded: 0, financingGap: 0, surplus: 0 });
  });

  it("rejects negative or non-integer amounts", () => {
    expect(() => computeCapitalNeed(hypotheses(), capital({ equipment: -1 }))).toThrow(FinancialEngineInputError);
    expect(() => computeCapitalNeed(hypotheses(), capital({ availableCapital: 1.5 }))).toThrow(FinancialEngineInputError);
  });

  it("rejects totals beyond the safe integer limit", () => {
    const huge = Number.MAX_SAFE_INTEGER;
    expect(() => computeCapitalNeed(hypotheses(), capital({ equipment: huge, initialStock: huge }))).toThrow(
      FinancialEngineInputError,
    );
  });

  it("validates the hypotheses too", () => {
    expect(() => computeCapitalNeed(hypotheses({ price: 0 }), capital())).toThrow(FinancialEngineInputError);
  });
});
