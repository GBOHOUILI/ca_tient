import { describe, expect, it } from "vitest";
import { approxEurFromXof, fromMinorUnits, minorUnitDigits, relabelCurrency, toMinorUnits } from "./money.js";

describe("minorUnitDigits", () => {
  it("has no sub-unit for XOF", () => {
    expect(minorUnitDigits("XOF")).toBe(0);
  });

  it("has two decimals for EUR, USD, GBP, NGN and GHS", () => {
    for (const currency of ["EUR", "USD", "GBP", "NGN", "GHS"] as const) {
      expect(minorUnitDigits(currency)).toBe(2);
    }
  });
});

describe("toMinorUnits", () => {
  it("converts euros to cents", () => {
    expect(toMinorUnits(2.5, "EUR")).toBe(250);
    expect(toMinorUnits(9.99, "EUR")).toBe(999);
  });

  it("rounds to the nearest cent instead of keeping float noise", () => {
    expect(toMinorUnits(1.005, "USD")).toBe(101);
    expect(toMinorUnits(0.1 + 0.2, "EUR")).toBe(30);
  });

  it("keeps XOF amounts as whole units", () => {
    expect(toMinorUnits(3000, "XOF")).toBe(3000);
    expect(toMinorUnits(2.6, "XOF")).toBe(3);
  });
});

describe("fromMinorUnits", () => {
  it("converts cents back to euros", () => {
    expect(fromMinorUnits(250, "EUR")).toBe(2.5);
    expect(fromMinorUnits(30_000_000, "EUR")).toBe(300_000);
  });

  it("leaves XOF unchanged", () => {
    expect(fromMinorUnits(3000, "XOF")).toBe(3000);
  });

  it("round-trips with toMinorUnits", () => {
    expect(toMinorUnits(fromMinorUnits(999, "GBP"), "GBP")).toBe(999);
  });
});

describe("relabelCurrency", () => {
  it("keeps the displayed number when switching from XOF to EUR", () => {
    expect(relabelCurrency(3000, "XOF", "EUR")).toBe(300_000);
  });

  it("drops the cents when switching from EUR to XOF", () => {
    expect(relabelCurrency(250, "EUR", "XOF")).toBe(3);
  });

  it("is a no-op between currencies with the same sub-unit", () => {
    expect(relabelCurrency(999, "EUR", "USD")).toBe(999);
  });
});

describe("approxEurFromXof", () => {
  it("uses the fixed official parity, in euro cents", () => {
    expect(approxEurFromXof(1000)).toBe(152);
    expect(approxEurFromXof(655_957)).toBe(100_000);
  });
});
