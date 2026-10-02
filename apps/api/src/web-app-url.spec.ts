import { describe, expect, it } from "vitest";
import { corsOrigins, primaryWebAppUrl } from "./web-app-url.js";

describe("WEB_APP_URL", () => {
  it("accepts a comma-separated list, trimmed and without trailing slashes", () => {
    const env = { WEB_APP_URL: " https://catient.zerotoone.bj/ , https://catient.netlify.app " };
    expect(corsOrigins(env)).toEqual(["https://catient.zerotoone.bj", "https://catient.netlify.app"]);
    expect(primaryWebAppUrl(env)).toBe("https://catient.zerotoone.bj");
  });

  it("keeps working with a single URL", () => {
    expect(corsOrigins({ WEB_APP_URL: "https://catient.netlify.app" })).toEqual(["https://catient.netlify.app"]);
    expect(primaryWebAppUrl({ WEB_APP_URL: "https://catient.netlify.app/" })).toBe("https://catient.netlify.app");
  });

  it("falls back to the local web app when unset or empty", () => {
    expect(corsOrigins({})).toEqual(["http://localhost:3000"]);
    expect(primaryWebAppUrl({ WEB_APP_URL: " , " })).toBe("http://localhost:3000");
  });
});
