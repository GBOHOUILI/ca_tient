import { describe, expect, it } from "vitest";
import { accessTokenMatches, generateAccessToken, hashAccessToken } from "./access-token.js";

describe("access token", () => {
  it("generates a 32-byte base64url token and its sha-256 hash", () => {
    const { token, hash } = generateAccessToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashAccessToken(token));
  });

  it("generates a different token each time", () => {
    expect(generateAccessToken().token).not.toBe(generateAccessToken().token);
  });

  it("matches only the token that produced the hash", () => {
    const { token, hash } = generateAccessToken();

    expect(accessTokenMatches(token, hash)).toBe(true);
    expect(accessTokenMatches(generateAccessToken().token, hash)).toBe(false);
  });

  it("does not match a malformed stored hash", () => {
    const { token } = generateAccessToken();

    expect(accessTokenMatches(token, "pas-un-hash")).toBe(false);
  });
});
