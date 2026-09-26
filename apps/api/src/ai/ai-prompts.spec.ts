import { describe, expect, it } from "vitest";
import { CANVAS_BLOCK_KEYS } from "./ai-provider.port.js";
import {
  buildCanvasPrompt,
  buildHypothesesPrompt,
  parseSuggestedCanvasBlocks,
  parseSuggestedHypotheses,
} from "./ai-prompts.js";

function input() {
  return {
    businessModel: "ECOMMERCE" as const,
    rawDescription: "Vente de vetements en ligne pour jeunes actifs.",
    currency: "XOF" as const,
  };
}

function validCanvasBlocks() {
  return {
    valueProposition: "Des vetements tendance livres en 24h.",
    customerSegments: "Jeunes actifs urbains.",
    channels: "Instagram et WhatsApp.",
    customerRelationships: "Suivi WhatsApp apres achat.",
    keyResources: "Stock et telephone.",
    keyActivities: "Sourcing et livraison.",
    keyPartners: "Grossistes et livreurs moto.",
  };
}

describe("buildHypothesesPrompt", () => {
  it("includes the description and the expected JSON shape", () => {
    const prompt = buildHypothesesPrompt(input());

    expect(prompt).toContain("Vente de vetements en ligne pour jeunes actifs.");
    expect(prompt).toContain('{"price": <entier>, "volume": <entier>, "variableCostPerUnit": <entier>, "fixedCosts": <entier>}');
  });
});

describe("buildCanvasPrompt", () => {
  it("lists every canvas block key in the expected JSON shape", () => {
    const prompt = buildCanvasPrompt(input());

    for (const key of CANVAS_BLOCK_KEYS) {
      expect(prompt).toContain(`"${key}": "<texte>"`);
    }
  });
});

describe("parseSuggestedHypotheses", () => {
  const valid = { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 };

  it("parses a valid JSON object", () => {
    expect(parseSuggestedHypotheses(JSON.stringify(valid))).toEqual(valid);
  });

  it("parses JSON wrapped in a markdown fence", () => {
    expect(parseSuggestedHypotheses("```json\n" + JSON.stringify(valid) + "\n```")).toEqual(valid);
  });

  it("returns null for invalid JSON", () => {
    expect(parseSuggestedHypotheses("ceci n'est pas du JSON")).toBeNull();
  });

  it("returns null for an empty response", () => {
    expect(parseSuggestedHypotheses(undefined)).toBeNull();
  });

  it("returns null when price is below 1", () => {
    expect(parseSuggestedHypotheses(JSON.stringify({ ...valid, price: 0 }))).toBeNull();
  });

  it("returns null when a value is not an integer", () => {
    expect(parseSuggestedHypotheses(JSON.stringify({ ...valid, volume: 12.5 }))).toBeNull();
  });

  it("returns null when a value is missing", () => {
    const { fixedCosts: _fixedCosts, ...incomplete } = valid;
    expect(parseSuggestedHypotheses(JSON.stringify(incomplete))).toBeNull();
  });

  it("returns null for a JSON array", () => {
    expect(parseSuggestedHypotheses(JSON.stringify([valid]))).toBeNull();
  });
});

describe("parseSuggestedCanvasBlocks", () => {
  it("parses and trims a valid JSON object", () => {
    const blocks = { ...validCanvasBlocks(), channels: "  Instagram et WhatsApp.  " };

    expect(parseSuggestedCanvasBlocks(JSON.stringify(blocks))).toEqual(validCanvasBlocks());
  });

  it("parses JSON wrapped in a markdown fence", () => {
    expect(parseSuggestedCanvasBlocks("```\n" + JSON.stringify(validCanvasBlocks()) + "\n```")).toEqual(
      validCanvasBlocks(),
    );
  });

  it("returns null when a block is missing", () => {
    const { keyPartners: _keyPartners, ...incomplete } = validCanvasBlocks();
    expect(parseSuggestedCanvasBlocks(JSON.stringify(incomplete))).toBeNull();
  });

  it("returns null when a block is blank", () => {
    expect(parseSuggestedCanvasBlocks(JSON.stringify({ ...validCanvasBlocks(), channels: "   " }))).toBeNull();
  });

  it("returns null when a block exceeds 500 characters", () => {
    expect(parseSuggestedCanvasBlocks(JSON.stringify({ ...validCanvasBlocks(), channels: "a".repeat(501) }))).toBeNull();
  });
});
