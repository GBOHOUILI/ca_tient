import { computeSensitivity, SENSITIVITY_PERCENT } from "./sensitivity.js";
import type { Hypotheses } from "./financial-engine.types.js";

function hypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return { currency: "XOF", price: 5000, variableCostPerUnit: 2000, fixedCosts: 100000, volume: 50, ...overrides };
}

describe("computeSensitivity", () => {
  it("measures +/-10 % on each hypothesis and sorts by impact", () => {
    expect(SENSITIVITY_PERCENT).toBe(10);
    // base result = 250000 - 100000 - 100000 = 50000
    expect(computeSensitivity(hypotheses())).toEqual([
      { key: "price", resultIfUp: 75000, resultIfDown: 25000, impact: 25000 },
      { key: "volume", resultIfUp: 65000, resultIfDown: 35000, impact: 15000 },
      { key: "variableCostPerUnit", resultIfUp: 40000, resultIfDown: 60000, impact: 10000 },
      { key: "fixedCosts", resultIfUp: 40000, resultIfDown: 60000, impact: 10000 },
    ]);
  });

  it("keeps the fixed key order on equal impacts", () => {
    const keys = computeSensitivity(hypotheses()).map((entry) => entry.key);
    expect(keys.indexOf("variableCostPerUnit")).toBeLessThan(keys.indexOf("fixedCosts"));
  });

  it("gives an impact of 0 to a hypothesis at 0 and keeps it in the list", () => {
    const entries = computeSensitivity(hypotheses({ fixedCosts: 0 }));
    expect(entries).toHaveLength(4);
    expect(entries.find((entry) => entry.key === "fixedCosts")?.impact).toBe(0);
  });

  it("works with a zero unit margin", () => {
    const entries = computeSensitivity(hypotheses({ price: 2000 }));
    expect(entries).toHaveLength(4);
    expect(entries[0].impact).toBeGreaterThan(0);
  });
});
