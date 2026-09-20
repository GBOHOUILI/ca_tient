import { applyDelta, applyScenario, SCENARIO_DELTAS } from "./scenarios.js";
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

describe("applyDelta", () => {
  it("returns the base hypotheses unchanged when no delta is given", () => {
    expect(applyDelta(hypotheses(), {})).toEqual(hypotheses());
  });

  it("applies a percentage variation and rounds to the nearest integer", () => {
    const result = applyDelta(hypotheses({ volume: 33 }), { volume: -20 });

    expect(result.volume).toBe(26); // 33 * 0.8 = 26.4 -> 26
  });

  it("applies independent deltas to price, costs and volume at once", () => {
    const result = applyDelta(hypotheses(), { price: -10, volume: -40, fixedCosts: 15, variableCostPerUnit: 15 });

    expect(result).toEqual({
      currency: "XOF",
      price: 4500, // 5000 * 0.9
      variableCostPerUnit: 2300, // 2000 * 1.15
      fixedCosts: 115000, // 100000 * 1.15
      volume: 30, // 50 * 0.6
    });
  });

  it("throws when a delta pushes a value into invalid territory", () => {
    expect(() => applyDelta(hypotheses(), { price: -150 })).toThrow(FinancialEngineInputError);
  });
});

describe("applyScenario", () => {
  it("leaves hypotheses unchanged for the realiste scenario", () => {
    expect(applyScenario(hypotheses(), "realiste")).toEqual(hypotheses());
  });

  it("applies the prudent scenario coefficients", () => {
    const result = applyScenario(hypotheses(), "prudent");

    expect(result).toEqual({
      currency: "XOF",
      price: 5000,
      variableCostPerUnit: 2200, // +10 %
      fixedCosts: 110000, // +10 %
      volume: 40, // -20 %
    });
  });

  it("applies the ambitieux scenario coefficients", () => {
    const result = applyScenario(hypotheses(), "ambitieux");

    expect(result).toEqual({
      currency: "XOF",
      price: 5000,
      variableCostPerUnit: 2000,
      fixedCosts: 100000,
      volume: 65, // +30 %
    });
  });

  it("applies the crise scenario coefficients", () => {
    const result = applyScenario(hypotheses(), "crise");

    expect(result).toEqual({
      currency: "XOF",
      price: 4500, // -10 %
      variableCostPerUnit: 2300, // +15 %
      fixedCosts: 115000, // +15 %
      volume: 30, // -40 %
    });
  });

  it("exposes the four documented scenario keys", () => {
    expect(Object.keys(SCENARIO_DELTAS).sort()).toEqual(["ambitieux", "crise", "prudent", "realiste"]);
  });
});
