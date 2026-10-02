import { describe, expect, it } from "vitest";
import {
  conversionBy,
  countBy,
  dailyActivity,
  holds,
  median,
  perBusinessModel,
  revenueSeries,
  type IdeaRow,
  type PaymentRow,
} from "./admin-stats.js";

function idea(overrides: Partial<IdeaRow> = {}): IdeaRow {
  return {
    id: "i1",
    createdAt: new Date("2026-10-01T10:00:00Z"),
    businessModel: "SERVICE",
    currency: "XOF",
    paidAt: null,
    hypotheses: { currency: "XOF", price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
    country: "BJ",
    profile: null,
    stage: null,
    heardFrom: null,
    utmSource: null,
    capital: null,
    ...overrides,
  };
}

describe("median", () => {
  it("handles odd, even and empty lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(3); // (2 + 3) / 2 = 2.5 rounded
    expect(median([])).toBeNull();
  });
});

describe("countBy", () => {
  it("counts, labels missing values and sorts by count then key", () => {
    expect(countBy([idea({ country: "TG" }), idea({ country: "BJ" }), idea({ country: "BJ" }), idea({ country: null })], (r) => r.country)).toEqual([
      { key: "BJ", count: 2 },
      { key: "TG", count: 1 },
      { key: "inconnu", count: 1 },
    ]);
  });
});

describe("holds", () => {
  it("uses the engine and tolerates incomplete hypotheses", () => {
    expect(holds(idea())).toBe(true);
    expect(holds(idea({ hypotheses: { currency: "XOF", price: 5000, volume: 10, variableCostPerUnit: 2000, fixedCosts: 100000 } }))).toBe(false);
    expect(holds(idea({ hypotheses: null }))).toBeNull();
    expect(holds(idea({ hypotheses: { currency: "XOF", price: 0, volume: 1, variableCostPerUnit: 0, fixedCosts: 0 } }))).toBeNull();
  });
});

describe("perBusinessModel", () => {
  it("computes medians in the chosen currency only", () => {
    const rows = [
      idea({ id: "a" }),
      idea({ id: "b", hypotheses: { currency: "XOF", price: 7000, volume: 10, variableCostPerUnit: 2000, fixedCosts: 100000 } }),
      idea({ id: "c", currency: "EUR", hypotheses: { currency: "EUR", price: 999999, volume: 1, variableCostPerUnit: 0, fixedCosts: 0 } }),
      idea({ id: "d", businessModel: "EBOOK" }),
    ];
    const service = perBusinessModel(rows, "XOF").find((entry) => entry.key === "SERVICE");
    expect(service).toMatchObject({ count: 3, medianPrice: 6000, medianVolume: 30, medianFixedCosts: 100000 });
    // A ratio, not an amount: computed over every currency (a and c hold, b does not).
    expect(service?.holdsShare).toBeCloseTo(2 / 3);
  });

  it("includes capital medians from ideas that entered one", () => {
    const rows = [
      idea({ capital: { equipment: 100000, initialStock: 0, openingCosts: 0, other: 0, availableCapital: 0 } }),
      idea({ id: "b" }),
    ];
    // need = 100000 + 3 * 100000 = 400000 ; gap = 400000
    expect(perBusinessModel(rows, "XOF")[0]).toMatchObject({ withCapital: 1, medianCapitalNeeded: 400000, medianFinancingGap: 400000 });
  });

  it("returns null medians when no idea uses the currency", () => {
    expect(perBusinessModel([idea()], "EUR")[0]).toMatchObject({ medianPrice: null, medianCapitalNeeded: null, holdsShare: 1 });
  });
});

describe("conversionBy", () => {
  it("counts ideas, paid ideas and the rate per key", () => {
    const rows = [idea({ heardFrom: "whatsapp", paidAt: new Date() }), idea({ heardFrom: "whatsapp" }), idea({ heardFrom: null })];
    expect(conversionBy(rows, (r) => r.heardFrom)).toEqual([
      { key: "whatsapp", ideas: 2, paid: 1, rate: 0.5 },
      { key: "inconnu", ideas: 1, paid: 0, rate: 0 },
    ]);
  });
});

describe("dailyActivity", () => {
  it("fills every UTC day of the range with ideas and payments", () => {
    const rows = [
      idea({ createdAt: new Date("2026-10-01T23:30:00Z"), paidAt: new Date("2026-10-03T08:00:00Z") }),
      idea({ createdAt: new Date("2026-10-03T01:00:00Z") }),
    ];
    expect(dailyActivity(rows, new Date("2026-10-01T00:00:00Z"), new Date("2026-10-03T12:00:00Z"))).toEqual([
      { date: "2026-10-01", ideas: 1, payments: 0 },
      { date: "2026-10-02", ideas: 0, payments: 0 },
      { date: "2026-10-03", ideas: 1, payments: 1 },
    ]);
  });
});

describe("revenueSeries", () => {
  it("sums approved XOF payments per day and per Monday-starting week", () => {
    const payments: PaymentRow[] = [
      { amount: 1000, currency: "XOF", status: "approved", createdAt: new Date("2026-09-27T10:00:00Z"), confirmedAt: new Date("2026-09-27T10:01:00Z") },
      { amount: 1000, currency: "XOF", status: "approved", createdAt: new Date("2026-09-28T10:00:00Z"), confirmedAt: new Date("2026-09-28T10:01:00Z") },
      { amount: 1000, currency: "XOF", status: "declined", createdAt: new Date("2026-09-28T11:00:00Z"), confirmedAt: null },
      { amount: 1000, currency: "XOF", status: "approved", createdAt: new Date("2026-09-29T10:00:00Z"), confirmedAt: new Date("2026-09-29T10:01:00Z") },
    ];
    const series = revenueSeries(payments);
    expect(series.total).toBe(3000);
    expect(series).toMatchObject({ approved: 3, declined: 1, canceled: 0, pending: 0 });
    expect(series.daily).toEqual([
      { date: "2026-09-27", revenue: 1000, approved: 1 },
      { date: "2026-09-28", revenue: 1000, approved: 1 },
      { date: "2026-09-29", revenue: 1000, approved: 1 },
    ]);
    // 2026-09-27 is a Sunday (week of Monday 09-21), 09-28 a Monday
    expect(series.weekly).toEqual([
      { weekStart: "2026-09-21", revenue: 1000 },
      { weekStart: "2026-09-28", revenue: 2000 },
    ]);
  });
});
