import { describe, expect, it } from "vitest";
import { localizedPath, resolveLocaleRoute, stripLocale } from "./locale-route";

describe("resolveLocaleRoute", () => {
  it("rewrites unprefixed paths to French", () => {
    expect(resolveLocaleRoute("/")).toEqual({ action: "rewrite", pathname: "/fr" });
    expect(resolveLocaleRoute("/commencer")).toEqual({ action: "rewrite", pathname: "/fr/commencer" });
  });

  it("leaves English paths alone", () => {
    expect(resolveLocaleRoute("/en")).toEqual({ action: "next" });
    expect(resolveLocaleRoute("/en/commencer")).toEqual({ action: "next" });
  });

  it("redirects explicit French paths to the unprefixed address", () => {
    expect(resolveLocaleRoute("/fr")).toEqual({ action: "redirect", pathname: "/" });
    expect(resolveLocaleRoute("/fr/retrouver")).toEqual({ action: "redirect", pathname: "/retrouver" });
  });

  it("serves generated social images under /fr without redirecting", () => {
    expect(resolveLocaleRoute("/fr/opengraph-image")).toEqual({ action: "next" });
    expect(resolveLocaleRoute("/fr/twitter-image")).toEqual({ action: "next" });
  });

  it("does not mistake words starting with en or fr for a locale", () => {
    expect(resolveLocaleRoute("/enfant")).toEqual({ action: "rewrite", pathname: "/fr/enfant" });
    expect(resolveLocaleRoute("/franchise")).toEqual({ action: "rewrite", pathname: "/fr/franchise" });
  });
});

describe("localizedPath", () => {
  it("prefixes English and strips any existing locale", () => {
    expect(localizedPath("/commencer", "en")).toBe("/en/commencer");
    expect(localizedPath("/en/commencer", "fr")).toBe("/commencer");
    expect(localizedPath("/", "en")).toBe("/en");
    expect(localizedPath("/en", "fr")).toBe("/");
  });

  it("keeps the query string and hash", () => {
    expect(localizedPath("/analyse/abc?status=approved", "en")).toBe("/en/analyse/abc?status=approved");
    expect(localizedPath("/#faq", "en")).toBe("/en#faq");
    expect(localizedPath("/en?x=1", "fr")).toBe("/?x=1");
  });
});

describe("stripLocale", () => {
  it("returns the locale and the path without prefix", () => {
    expect(stripLocale("/en/retrouver")).toEqual({ locale: "en", path: "/retrouver" });
    expect(stripLocale("/retrouver")).toEqual({ locale: "fr", path: "/retrouver" });
  });
});
