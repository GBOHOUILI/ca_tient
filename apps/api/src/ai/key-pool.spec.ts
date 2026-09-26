import { describe, expect, it } from "vitest";
import { KeyPool } from "./key-pool.js";

describe("KeyPool.fromEnv", () => {
  it("loads the base key then the suffixed keys in order, skipping gaps", () => {
    const pool = KeyPool.fromEnv("GEMINI_API_KEY", {
      GEMINI_API_KEY: "k1",
      GEMINI_API_KEY_3: "k3",
      GEMINI_API_KEY_10: "k10",
    });

    expect(pool.available().map((entry) => entry.key)).toEqual(["k1", "k3", "k10"]);
    expect(pool.size).toBe(3);
  });

  it("ignores empty and whitespace-only values", () => {
    const pool = KeyPool.fromEnv("GROQ_API_KEY", { GROQ_API_KEY: "", GROQ_API_KEY_2: "   ", GROQ_API_KEY_3: " k3 " });

    expect(pool.available().map((entry) => entry.key)).toEqual(["k3"]);
  });

  it("keeps a key listed twice only once", () => {
    const pool = KeyPool.fromEnv("GEMINI_API_KEY", { GEMINI_API_KEY: "same", GEMINI_API_KEY_2: "same" });

    expect(pool.size).toBe(1);
  });

  it("is empty when no key is configured", () => {
    const pool = KeyPool.fromEnv("MISTRAL_API_KEY", {});

    expect(pool.size).toBe(0);
    expect(pool.available()).toEqual([]);
  });
});

describe("KeyPool availability", () => {
  it("hides a paused key until the pause has elapsed", () => {
    let now = 1_000;
    const pool = new KeyPool(["k1", "k2"], () => now);

    pool.pause(0, 60_000);
    expect(pool.available()).toEqual([{ index: 1, key: "k2" }]);

    now += 59_999;
    expect(pool.available().map((entry) => entry.key)).toEqual(["k2"]);

    now += 1;
    expect(pool.available().map((entry) => entry.key)).toEqual(["k1", "k2"]);
  });

  it("never returns a disabled key again", () => {
    let now = 0;
    const pool = new KeyPool(["k1", "k2"], () => now);

    pool.disable(1);
    now += 24 * 60 * 60 * 1000;

    expect(pool.available()).toEqual([{ index: 0, key: "k1" }]);
  });
});
