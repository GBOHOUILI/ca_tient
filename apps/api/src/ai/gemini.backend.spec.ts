import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { models: { generateContent: generateContentMock } };
  }),
  Type: { OBJECT: "OBJECT", INTEGER: "INTEGER", STRING: "STRING" },
}));

const { GoogleGenAI } = await import("@google/genai");
const { GeminiBackend } = await import("./gemini.backend.js");
const { HYPOTHESES_JSON_SCHEMA } = await import("./ai-prompts.js");
const { KeyPool } = await import("./key-pool.js");

function backend() {
  return new GeminiBackend(new KeyPool(["k1", "k2"]), "gemini-2.5-flash");
}

function request(apiKey = "k1") {
  return { prompt: "le prompt", schema: HYPOTHESES_JSON_SCHEMA, apiKey, signal: new AbortController().signal };
}

function apiError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

describe("GeminiBackend.generateJson", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    vi.mocked(GoogleGenAI).mockClear();
  });

  it("returns the response text and sends the schema as a Gemini responseSchema", async () => {
    generateContentMock.mockResolvedValue({ text: '{"price":5000}' });
    const req = request();

    const text = await backend().generateJson(req);

    expect(text).toBe('{"price":5000}');
    expect(generateContentMock).toHaveBeenCalledWith({
      model: "gemini-2.5-flash",
      contents: "le prompt",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            price: { type: "INTEGER" },
            volume: { type: "INTEGER" },
            variableCostPerUnit: { type: "INTEGER" },
            fixedCosts: { type: "INTEGER" },
          },
          required: ["price", "volume", "variableCostPerUnit", "fixedCosts"],
        },
        abortSignal: req.signal,
      },
    });
  });

  it("creates one SDK client per API key and reuses it", async () => {
    generateContentMock.mockResolvedValue({ text: "{}" });
    const gemini = backend();

    await gemini.generateJson(request("k1"));
    await gemini.generateJson(request("k1"));
    await gemini.generateJson(request("k2"));

    expect(GoogleGenAI).toHaveBeenCalledTimes(2);
    expect(GoogleGenAI).toHaveBeenNthCalledWith(1, { apiKey: "k1" });
    expect(GoogleGenAI).toHaveBeenNthCalledWith(2, { apiKey: "k2" });
  });

  it("throws rate_limited with the suggested retry delay on 429", async () => {
    generateContentMock.mockRejectedValue(apiError(429, "Quota exceeded. Please retry in 40.5s."));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "rate_limited", retryAfterMs: 40_500 });
  });

  it.each([
    [401, "Unauthorized"],
    [403, "Permission denied"],
    [400, "API key not valid. Please pass a valid API key."],
  ])("throws unauthorized on %i (%s)", async (status, message) => {
    generateContentMock.mockRejectedValue(apiError(status, message));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("throws unavailable on any other error", async () => {
    generateContentMock.mockRejectedValue(new Error("fetch failed"));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("throws unavailable when the response has no text", async () => {
    generateContentMock.mockResolvedValue({ text: undefined });

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unavailable" });
  });
});
