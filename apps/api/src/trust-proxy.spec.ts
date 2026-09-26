import { describe, expect, it } from "vitest";
import { parseTrustProxy } from "./trust-proxy.js";

describe("parseTrustProxy", () => {
  it("is undefined when the variable is unset or blank", () => {
    expect(parseTrustProxy(undefined)).toBeUndefined();
    expect(parseTrustProxy("  ")).toBeUndefined();
  });

  it("parses a hop count", () => {
    expect(parseTrustProxy("1")).toBe(1);
  });

  it("parses booleans", () => {
    expect(parseTrustProxy("true")).toBe(true);
    expect(parseTrustProxy("false")).toBe(false);
  });

  it("keeps any other value as an Express trust proxy string (subnets, loopback...)", () => {
    expect(parseTrustProxy("loopback, 10.0.0.0/8")).toBe("loopback, 10.0.0.0/8");
  });
});
