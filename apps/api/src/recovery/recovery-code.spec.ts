import { describe, expect, it } from "vitest";
import { generateRecoveryCode, hashRecoveryCode, normalizeRecoveryCode } from "./recovery-code.js";

const FORMAT = /^CT-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/;

describe("generateRecoveryCode", () => {
  it("produces CT-XXXXX-XXXXX with the Crockford alphabet", () => {
    for (let i = 0; i < 100; i += 1) expect(generateRecoveryCode()).toMatch(FORMAT);
  });

  it("does not repeat over 1 000 draws", () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateRecoveryCode()));
    expect(codes.size).toBe(1000);
  });

  it("always normalizes back to 10 characters", () => {
    expect(normalizeRecoveryCode(generateRecoveryCode())).toHaveLength(10);
  });
});

describe("normalizeRecoveryCode", () => {
  it("ignores case, spaces, dashes and the optional CT prefix", () => {
    expect(normalizeRecoveryCode("ct 7k4mq-9xp2r")).toBe("7K4MQ9XP2R");
    expect(normalizeRecoveryCode("7K4MQ9XP2R")).toBe("7K4MQ9XP2R");
  });

  it("maps the look-alike letters O, I and L to digits", () => {
    expect(normalizeRecoveryCode("CT-OOIIL-LLLLL")).toBe("0011111111");
  });

  it("rejects wrong lengths and characters outside the alphabet", () => {
    expect(normalizeRecoveryCode("CT-7K4MQ-9XP2")).toBeNull();
    expect(normalizeRecoveryCode("CT-7K4MQ-9XP2RR")).toBeNull();
    expect(normalizeRecoveryCode("CT-7K4MU-9XP2R")).toBeNull();
    expect(normalizeRecoveryCode("CT-7K4M*-9XP2R")).toBeNull();
    expect(normalizeRecoveryCode("")).toBeNull();
  });
});

describe("hashRecoveryCode", () => {
  it("is a stable SHA-256 hex digest", () => {
    expect(hashRecoveryCode("7K4MQ9XP2R")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRecoveryCode("7K4MQ9XP2R")).toBe(hashRecoveryCode("7K4MQ9XP2R"));
    expect(hashRecoveryCode("7K4MQ9XP2R")).not.toBe(hashRecoveryCode("7K4MQ9XP2S"));
  });
});
