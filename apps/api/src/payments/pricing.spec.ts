import { describe, expect, it } from "vitest";
import { analysisPriceXof, DEFAULT_ANALYSIS_PRICE_XOF } from "./pricing.js";

describe("analysisPriceXof", () => {
  it("defaults to 1 000 FCFA when the variable is absent or empty", () => {
    expect(DEFAULT_ANALYSIS_PRICE_XOF).toBe(1000);
    expect(analysisPriceXof({})).toBe(1000);
    expect(analysisPriceXof({ ANALYSIS_PRICE_XOF: "" })).toBe(1000);
  });

  it("reads a whole amount, including 0 for free tests", () => {
    expect(analysisPriceXof({ ANALYSIS_PRICE_XOF: "2500" })).toBe(2500);
    expect(analysisPriceXof({ ANALYSIS_PRICE_XOF: " 0 " })).toBe(0);
  });

  it("refuses anything that is not a whole, non-negative amount", () => {
    for (const value of ["-1", "1000.5", "mille", "1e3", "10 000"]) {
      expect(() => analysisPriceXof({ ANALYSIS_PRICE_XOF: value }), value).toThrow(/ANALYSIS_PRICE_XOF/);
    }
  });
});
