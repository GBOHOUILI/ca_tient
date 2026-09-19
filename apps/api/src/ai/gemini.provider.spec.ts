import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { models: { generateContent: generateContentMock } };
  }),
  Type: { OBJECT: "OBJECT", INTEGER: "INTEGER" },
}));

const { GeminiProvider } = await import("./gemini.provider.js");

function input() {
  return {
    businessModel: "ECOMMERCE" as const,
    rawDescription: "Vente de vetements en ligne pour jeunes actifs.",
    currency: "XOF" as const,
  };
}

describe("GeminiProvider.suggestHypotheses", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("returns the parsed hypotheses when Gemini responds with valid JSON", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({ price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 }),
    });

    const provider = new GeminiProvider();
    const result = await provider.suggestHypotheses(input());

    expect(result).toEqual({ price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 });
  });

  it("returns null when the response is not valid JSON", async () => {
    generateContentMock.mockResolvedValue({ text: "ceci n'est pas du JSON" });

    const provider = new GeminiProvider();
    const result = await provider.suggestHypotheses(input());

    expect(result).toBeNull();
  });

  it("returns null when a value is out of bounds (price must be >= 1)", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({ price: 0, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 }),
    });

    const provider = new GeminiProvider();
    const result = await provider.suggestHypotheses(input());

    expect(result).toBeNull();
  });

  it("returns null when the SDK call throws", async () => {
    generateContentMock.mockRejectedValue(new Error("quota exceeded"));

    const provider = new GeminiProvider();
    const result = await provider.suggestHypotheses(input());

    expect(result).toBeNull();
  });
});
