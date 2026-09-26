import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HYPOTHESES_JSON_SCHEMA } from "./ai-prompts.js";
import { KeyPool } from "./key-pool.js";
import { OpenAiCompatibleBackend } from "./openai-compatible.backend.js";

const fetchMock = vi.fn();

function backend() {
  return new OpenAiCompatibleBackend(
    { name: "groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
    new KeyPool(["k1"]),
  );
}

function request() {
  return { prompt: "le prompt", schema: HYPOTHESES_JSON_SCHEMA, apiKey: "k1", signal: new AbortController().signal };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" }, ...init });
}

describe("OpenAiCompatibleBackend.generateJson", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the message content and sends a json_object chat completion request", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: '{"price":5000}' } }] }));

    const text = await backend().generateJson(request());

    expect(text).toBe('{"price":5000}');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k1");
    expect(JSON.parse(init.body as string)).toEqual({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "le prompt" }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
  });

  it("throws rate_limited with the Retry-After delay on 429", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: {} }, { status: 429, headers: { "Retry-After": "12" } }));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "rate_limited", retryAfterMs: 12_000 });
  });

  it("throws rate_limited without delay when Retry-After is an HTTP date", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: {} }, { status: 429, headers: { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" } }),
    );

    await expect(backend().generateJson(request())).rejects.toMatchObject({
      kind: "rate_limited",
      retryAfterMs: undefined,
    });
  });

  it.each([401, 403])("throws unauthorized on %i", async (status) => {
    fetchMock.mockResolvedValue(jsonResponse({ error: {} }, { status }));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("throws unavailable on a 5xx response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: {} }, { status: 503 }));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("throws unavailable when the request is aborted by the attempt timeout", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("throws unavailable when the response has no content", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: "" } }] }));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unavailable" });
  });
});
