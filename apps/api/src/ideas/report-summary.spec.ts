import { describe, expect, it } from "vitest";
import type { WatchPointCode } from "financial-engine";
import { buildReportFacts, factsHash, templateSummary } from "./report-summary.js";

const baseInput = {
  locale: "fr" as const,
  businessModel: "SERVICE" as const,
  estimatedResult: 50000,
  breakEvenReachable: true,
  watchPoints: [] as WatchPointCode[],
  sensitivity: [
    { key: "price" as const, resultIfUp: 0, resultIfDown: 0, impact: 3 },
    { key: "volume" as const, resultIfUp: 0, resultIfDown: 0, impact: 2 },
    { key: "fixedCosts" as const, resultIfUp: 0, resultIfDown: 0, impact: 1 },
  ],
  capitalNeed: null,
  valueProposition: "Cours a domicile",
  customerSegments: null,
};

describe("buildReportFacts", () => {
  it("keeps only qualitative facts", () => {
    expect(buildReportFacts(baseInput)).toEqual({
      locale: "fr",
      businessModel: "SERVICE",
      holds: true,
      breakEvenReachable: true,
      watchPoints: [],
      mostSensitive: ["price", "volume"],
      financing: "unknown",
      valueProposition: "Cours a domicile",
      customerSegments: null,
    });
  });

  it("derives the financing status from the capital need", () => {
    const need = {
      currency: "XOF" as const,
      startupCosts: 0,
      cashReserve: 0,
      capitalNeeded: 10,
      availableCapital: 5,
      financingGap: 5,
      surplus: 0,
    };
    expect(buildReportFacts({ ...baseInput, capitalNeed: need }).financing).toBe("gap");
    expect(buildReportFacts({ ...baseInput, capitalNeed: { ...need, financingGap: 0 } }).financing).toBe("covered");
  });
});

describe("factsHash", () => {
  it("is stable for equal facts and changes when a fact changes", () => {
    const facts = buildReportFacts(baseInput);
    expect(factsHash(facts)).toBe(factsHash(buildReportFacts(baseInput)));
    expect(factsHash(facts)).not.toBe(factsHash(buildReportFacts({ ...baseInput, estimatedResult: -1 })));
  });
});

describe("templateSummary", () => {
  it("contains no digit and always reminds it is not a guarantee", () => {
    for (const estimatedResult of [50000, -1]) {
      const watchPoints: WatchPointCode[] = ["financing_gap"];
      const text = templateSummary(buildReportFacts({ ...baseInput, estimatedResult, watchPoints }));
      expect(text).not.toMatch(/\d/);
      expect(text).toContain("pas une garantie");
    }
  });
});

describe("language of the summary", () => {
  it("never reuses a summary across languages", () => {
    const fr = buildReportFacts(baseInput);
    const en = buildReportFacts({ ...baseInput, locale: "en" });
    expect(factsHash(fr)).not.toBe(factsHash(en));
  });

  it("has an English fallback summary", () => {
    const text = templateSummary(buildReportFacts({ ...baseInput, locale: "en" }));
    expect(text).toMatch(/^With your assumptions/);
    expect(text).not.toMatch(/\d/);
  });

  it("writes the French fallback summary with accents", () => {
    expect(templateSummary(buildReportFacts(baseInput))).toContain("Avec tes hypothèses, ton idée");
  });
});
