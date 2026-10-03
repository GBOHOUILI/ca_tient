import { describe, expect, it } from "vitest";
import { deviceType } from "./traffic";

describe("deviceType", () => {
  it("recognises phones", () => {
    expect(deviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148", 5)).toBe("mobile");
    expect(deviceType("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile Safari/537.36", 5)).toBe("mobile");
  });

  it("recognises tablets, including iPads that report a Mac", () => {
    expect(deviceType("Mozilla/5.0 (Linux; Android 13; SM-X200) Chrome/120 Safari/537.36", 5)).toBe("tablet");
    expect(deviceType("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)", 5)).toBe("tablet");
    expect(deviceType("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15", 5)).toBe("tablet");
  });

  it("defaults to desktop", () => {
    expect(deviceType("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120", 0)).toBe("desktop");
    expect(deviceType("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15", 0)).toBe("desktop");
  });
});
