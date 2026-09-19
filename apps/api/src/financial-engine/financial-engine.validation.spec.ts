import { assertValidHypotheses } from "./financial-engine.validation.js";
import { FinancialEngineInputError } from "./financial-engine.errors.js";
import type { Hypotheses } from "./financial-engine.types.js";

function validHypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return {
    currency: "XOF",
    price: 5000,
    variableCostPerUnit: 2000,
    fixedCosts: 100000,
    volume: 50,
    ...overrides,
  };
}

describe("assertValidHypotheses", () => {
  it("accepts valid hypotheses without throwing", () => {
    expect(() => assertValidHypotheses(validHypotheses())).not.toThrow();
  });

  it("rejects an unsupported currency", () => {
    expect(() => assertValidHypotheses(validHypotheses({ currency: "JPY" as Hypotheses["currency"] }))).toThrow(
      FinancialEngineInputError,
    );
  });

  it("rejects a price of zero", () => {
    expect(() => assertValidHypotheses(validHypotheses({ price: 0 }))).toThrow(FinancialEngineInputError);
  });

  it("rejects a negative price", () => {
    expect(() => assertValidHypotheses(validHypotheses({ price: -100 }))).toThrow(FinancialEngineInputError);
  });

  it("rejects a non-integer price", () => {
    expect(() => assertValidHypotheses(validHypotheses({ price: 100.5 }))).toThrow(FinancialEngineInputError);
  });

  it("rejects a negative variableCostPerUnit", () => {
    expect(() => assertValidHypotheses(validHypotheses({ variableCostPerUnit: -1 }))).toThrow(
      FinancialEngineInputError,
    );
  });

  it("rejects a negative fixedCosts", () => {
    expect(() => assertValidHypotheses(validHypotheses({ fixedCosts: -1 }))).toThrow(FinancialEngineInputError);
  });

  it("rejects a negative volume", () => {
    expect(() => assertValidHypotheses(validHypotheses({ volume: -1 }))).toThrow(FinancialEngineInputError);
  });

  it("accepts a volume of zero", () => {
    expect(() => assertValidHypotheses(validHypotheses({ volume: 0 }))).not.toThrow();
  });

  it("accepts a fixedCosts of zero", () => {
    expect(() => assertValidHypotheses(validHypotheses({ fixedCosts: 0 }))).not.toThrow();
  });

  it("rejects an amount beyond Number.MAX_SAFE_INTEGER", () => {
    expect(() =>
      assertValidHypotheses(validHypotheses({ fixedCosts: Number.MAX_SAFE_INTEGER + 1 })),
    ).toThrow(FinancialEngineInputError);
  });
});
