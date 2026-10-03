import { describe, expect, it } from "vitest";
import { preferredLocale } from "./browser-language";

describe("preferredLocale", () => {
  it("takes the first supported language", () => {
    expect(preferredLocale(["en-US", "fr"])).toBe("en");
    expect(preferredLocale(["de", "fr-BE"])).toBe("fr");
  });

  it("returns null when no supported language is preferred", () => {
    expect(preferredLocale(["de", "es"])).toBeNull();
    expect(preferredLocale([])).toBeNull();
  });
});
