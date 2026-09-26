import { describe, expect, it, vi } from "vitest";
import { FallbackAiProvider } from "./fallback-ai.provider.js";
import { KeyPool } from "./key-pool.js";
import { LlmError, type LlmBackend, type LlmRequest } from "./llm-backend.js";

const HYPOTHESES = { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 };
const VALID_HYPOTHESES = JSON.stringify(HYPOTHESES);

const CANVAS = {
  valueProposition: "Des vetements tendance.",
  customerSegments: "Jeunes actifs.",
  channels: "Instagram.",
  customerRelationships: "WhatsApp.",
  keyResources: "Stock.",
  keyActivities: "Livraison.",
  keyPartners: "Grossistes.",
};

function input() {
  return {
    businessModel: "ECOMMERCE" as const,
    rawDescription: "Vente de vetements en ligne pour jeunes actifs.",
    currency: "XOF" as const,
  };
}

class FakeBackend implements LlmBackend {
  readonly calls: string[] = [];

  constructor(
    readonly name: string,
    readonly pool: KeyPool,
    private readonly respond: (apiKey: string, request: LlmRequest) => Promise<string>,
  ) {}

  generateJson(request: LlmRequest): Promise<string> {
    this.calls.push(request.apiKey);
    return this.respond(request.apiKey, request);
  }
}

function setup() {
  const clock = { now: 0 };
  const pool = (...keys: string[]) => new KeyPool(keys, () => clock.now);
  return { clock, pool, now: () => clock.now };
}

describe("FallbackAiProvider", () => {
  it("returns the first valid suggestion from the first backend", async () => {
    const { pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1", "g2"), async () => VALID_HYPOTHESES);

    const result = await new FallbackAiProvider([gemini], now).suggestHypotheses(input());

    expect(result).toEqual(HYPOTHESES);
    expect(gemini.calls).toEqual(["g1"]);
  });

  it("rotates to the next key of the same backend on rate limit, and skips the paused key on the next request", async () => {
    const { pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1", "g2"), async (key) => {
      if (key === "g1") throw new LlmError("rate_limited", "429");
      return VALID_HYPOTHESES;
    });
    const provider = new FallbackAiProvider([gemini], now);

    expect(await provider.suggestHypotheses(input())).toEqual(HYPOTHESES);
    expect(await provider.suggestHypotheses(input())).toEqual(HYPOTHESES);

    expect(gemini.calls).toEqual(["g1", "g2", "g2"]);
  });

  it("pauses a rate-limited key for retryAfterMs, or 60 s by default", async () => {
    const { clock, pool, now } = setup();
    let failures = 2;
    const gemini = new FakeBackend("gemini", pool("g1"), async () => {
      if (failures-- > 0) throw new LlmError("rate_limited", "429", failures === 1 ? 5_000 : undefined);
      return VALID_HYPOTHESES;
    });
    const provider = new FallbackAiProvider([gemini], now);

    expect(await provider.suggestHypotheses(input())).toBeNull(); // paused 5 s
    clock.now = 4_999;
    expect(await provider.suggestHypotheses(input())).toBeNull(); // still paused, not called
    clock.now = 5_000;
    expect(await provider.suggestHypotheses(input())).toBeNull(); // retried, paused 60 s by default
    clock.now = 64_999;
    expect(await provider.suggestHypotheses(input())).toBeNull(); // still paused, not called
    clock.now = 65_000;
    expect(await provider.suggestHypotheses(input())).toEqual(HYPOTHESES);

    expect(gemini.calls).toEqual(["g1", "g1", "g1"]);
  });

  it("falls back to the next backend when every key of the first one is rate-limited", async () => {
    const { pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1", "g2"), async () => {
      throw new LlmError("rate_limited", "429");
    });
    const groq = new FakeBackend("groq", pool("q1"), async () => VALID_HYPOTHESES);

    const result = await new FallbackAiProvider([gemini, groq], now).suggestHypotheses(input());

    expect(result).toEqual(HYPOTHESES);
    expect(gemini.calls).toEqual(["g1", "g2"]);
    expect(groq.calls).toEqual(["q1"]);
  });

  it("disables an unauthorized key for good", async () => {
    const { clock, pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1", "g2"), async (key) => {
      if (key === "g1") throw new LlmError("unauthorized", "401");
      return VALID_HYPOTHESES;
    });
    const provider = new FallbackAiProvider([gemini], now);

    await provider.suggestHypotheses(input());
    clock.now = 24 * 60 * 60 * 1000;
    await provider.suggestHypotheses(input());

    expect(gemini.calls).toEqual(["g1", "g2", "g2"]);
  });

  it("moves to the next backend without trying other keys when a backend is unavailable", async () => {
    const { pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1", "g2"), async () => {
      throw new LlmError("unavailable", "timeout");
    });
    const groq = new FakeBackend("groq", pool("q1"), async () => VALID_HYPOTHESES);

    const result = await new FallbackAiProvider([gemini, groq], now).suggestHypotheses(input());

    expect(result).toEqual(HYPOTHESES);
    expect(gemini.calls).toEqual(["g1"]);
  });

  it("treats a non-LlmError exception as unavailable", async () => {
    const { pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1"), async () => {
      throw new TypeError("boom");
    });
    const groq = new FakeBackend("groq", pool("q1"), async () => VALID_HYPOTHESES);

    expect(await new FallbackAiProvider([gemini, groq], now).suggestHypotheses(input())).toEqual(HYPOTHESES);
  });

  it("moves to the next backend when the response fails validation", async () => {
    const { pool, now } = setup();
    const groq = new FakeBackend("groq", pool("q1", "q2"), async () => JSON.stringify({ ...HYPOTHESES, price: 0 }));
    const mistral = new FakeBackend("mistral", pool("m1"), async () => VALID_HYPOTHESES);

    const result = await new FallbackAiProvider([groq, mistral], now).suggestHypotheses(input());

    expect(result).toEqual(HYPOTHESES);
    expect(groq.calls).toEqual(["q1"]);
  });

  it("gives up once the 15 s budget is spent, without calling the remaining backends", async () => {
    const { clock, pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1"), async () => {
      clock.now += 15_000;
      throw new LlmError("unavailable", "timeout");
    });
    const groq = new FakeBackend("groq", pool("q1"), async () => VALID_HYPOTHESES);

    const result = await new FallbackAiProvider([gemini, groq], now).suggestHypotheses(input());

    expect(result).toBeNull();
    expect(groq.calls).toEqual([]);
  });

  it("gives each attempt a signal that is not yet aborted", async () => {
    const { pool, now } = setup();
    let signal: AbortSignal | undefined;
    const gemini = new FakeBackend("gemini", pool("g1"), async (_key, request) => {
      signal = request.signal;
      return VALID_HYPOTHESES;
    });

    await new FallbackAiProvider([gemini], now).suggestHypotheses(input());

    expect(signal?.aborted).toBe(false);
  });

  it("caps the attempt timeout to the remaining budget", async () => {
    const { clock, pool, now } = setup();
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const gemini = new FakeBackend("gemini", pool("g1"), async () => {
      clock.now += 10_000;
      throw new LlmError("unavailable", "timeout");
    });
    const groq = new FakeBackend("groq", pool("q1"), async () => VALID_HYPOTHESES);

    const result = await new FallbackAiProvider([gemini, groq], now).suggestHypotheses(input());

    expect(result).toEqual(HYPOTHESES);
    expect(timeoutSpy).toHaveBeenNthCalledWith(1, 8_000);
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, 5_000);
    timeoutSpy.mockRestore();
  });

  it("returns null when no backend is configured", async () => {
    expect(await new FallbackAiProvider([]).suggestHypotheses(input())).toBeNull();
  });

  it("parses canvas blocks with the canvas parser", async () => {
    const { pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1"), async () => JSON.stringify(CANVAS));

    expect(await new FallbackAiProvider([gemini], now).suggestCanvasBlocks(input())).toEqual(CANVAS);
  });
});
