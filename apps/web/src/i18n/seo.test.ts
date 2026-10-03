import { describe, expect, it } from "vitest";
import { alternatesFor } from "./seo";
import { priceLabel } from "@/lib/price";

describe("alternatesFor", () => {
  it("points each page to both languages, French as default", () => {
    expect(alternatesFor("/commencer", "en")).toEqual({
      canonical: "/en/commencer",
      languages: { fr: "/commencer", en: "/en/commencer", "x-default": "/commencer" },
    });
    expect(alternatesFor("/", "fr").canonical).toBe("/");
  });
});

describe("priceLabel", () => {
  it("adds the approximate euro amount in English", () => {
    expect(priceLabel(1000, "en")).toBe("1,000 CFA francs (about €1.52)");
  });

  it("keeps the CFA franc label in French", () => {
    expect(priceLabel(1000, "fr")?.replace(/\s/g, " ")).toBe("1 000 F CFA");
  });

  it("returns null when the analysis is free", () => {
    expect(priceLabel(0, "en")).toBeNull();
  });
});
