import { computeWatchPoints, THIN_MARGIN_PERCENT } from "./watch-points.js";
import { computeCapitalNeed } from "./capital.js";
import type { Hypotheses } from "./financial-engine.types.js";

function hypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return { currency: "XOF", price: 5000, variableCostPerUnit: 2000, fixedCosts: 100000, volume: 50, ...overrides };
}

function startup(h: Hypotheses, equipment: number, availableCapital: number) {
  return computeCapitalNeed(h, { equipment, initialStock: 0, openingCosts: 0, other: 0, availableCapital });
}

describe("computeWatchPoints", () => {
  it("returns nothing for a healthy idea without capital", () => {
    expect(THIN_MARGIN_PERCENT).toBe(20);
    expect(computeWatchPoints(hypotheses({ volume: 100 }), null)).toEqual([]);
  });

  it("zero unit margin only flags non_positive_unit_margin", () => {
    expect(computeWatchPoints(hypotheses({ price: 2000 }), null)).toEqual(["non_positive_unit_margin"]);
  });

  it("flags a volume below the break-even point", () => {
    // break-even = ceil(100000 / 3000) = 34
    expect(computeWatchPoints(hypotheses({ volume: 33 }), null)).toContain("below_break_even");
    expect(computeWatchPoints(hypotheses({ volume: 34 }), null)).not.toContain("below_break_even");
  });

  it("flags a gross margin under 20 % of revenue, not at exactly 20 %", () => {
    expect(computeWatchPoints(hypotheses({ price: 1000, variableCostPerUnit: 801, fixedCosts: 0 }), null)).toContain(
      "thin_gross_margin",
    );
    expect(
      computeWatchPoints(hypotheses({ price: 1000, variableCostPerUnit: 800, fixedCosts: 0 }), null),
    ).not.toContain("thin_gross_margin");
  });

  it("flags a profitable idea whose prudent scenario loses money", () => {
    // base 50000 ; prudent: volume 40, cv 2200, fixed 110000 -> 2000 >= 0
    expect(computeWatchPoints(hypotheses(), null)).not.toContain("prudent_scenario_loss");
    // volume 36: base 8000 ; prudent volume 29 -> 29*2800 - 110000 = -28800
    expect(computeWatchPoints(hypotheses({ volume: 36 }), null)).toContain("prudent_scenario_loss");
  });

  it("does not flag the prudent scenario when the base already loses money", () => {
    expect(computeWatchPoints(hypotheses({ volume: 10 }), null)).not.toContain("prudent_scenario_loss");
  });

  it("flags a financing gap and a missing cash reserve from the capital need", () => {
    const h = hypotheses({ volume: 100 });
    expect(computeWatchPoints(h, startup(h, 400000, 300000))).toEqual(["financing_gap", "no_cash_reserve"]);
    expect(computeWatchPoints(h, startup(h, 400000, 500000))).toEqual(["financing_gap"]);
  });

  it("no financing gap when covered", () => {
    const h = hypotheses({ volume: 100 });
    expect(computeWatchPoints(h, startup(h, 0, 300000))).toEqual([]);
  });
});
