import { describe, expect, it } from "vitest";
import { countryFromTimeZone, normalizePath, trafficSource, trafficStats, type TrafficView } from "./traffic.js";

describe("normalizePath", () => {
  it("never keeps an analysis id", () => {
    expect(normalizePath("/analyse/cmus8gfhv00023x73r1rvhodo")).toBe("/analyse/:id");
    expect(normalizePath("/en/analyse/cmus8gfhv00023x73r1rvhodo")).toBe("/en/analyse/:id");
  });

  it("drops a trailing slash except on the home page", () => {
    expect(normalizePath("/commencer/")).toBe("/commencer");
    expect(normalizePath("/")).toBe("/");
  });
});

describe("countryFromTimeZone", () => {
  it("maps the time zones of the main markets", () => {
    expect(countryFromTimeZone("Africa/Porto-Novo")).toBe("BJ");
    expect(countryFromTimeZone("Africa/Lagos")).toBe("NG");
    expect(countryFromTimeZone("Europe/Paris")).toBe("FR");
  });

  it("returns null for an unknown or missing zone", () => {
    expect(countryFromTimeZone("Mars/Base")).toBeNull();
    expect(countryFromTimeZone(undefined)).toBeNull();
  });
});

describe("trafficSource", () => {
  it("is direct without utm nor referrer", () => {
    expect(trafficSource({})).toBe("direct");
  });

  it("groups the hosts of the same network", () => {
    expect(trafficSource({ referrerHost: "www.google.fr" })).toBe("google");
    expect(trafficSource({ referrerHost: "l.facebook.com" })).toBe("facebook");
    expect(trafficSource({ referrerHost: "m.facebook.com" })).toBe("facebook");
    expect(trafficSource({ referrerHost: "blog.example.org" })).toBe("blog.example.org");
  });

  it("prefers utm_source, case-insensitively, and maps known networks", () => {
    expect(trafficSource({ utmSource: "WhatsApp", referrerHost: "google.com" })).toBe("whatsapp");
    expect(trafficSource({ utmSource: "Facebook" })).toBe("facebook");
  });
});

describe("trafficStats", () => {
  const from = new Date("2026-10-01T00:00:00Z");
  const to = new Date("2026-10-03T12:00:00Z");
  const view = (overrides: Partial<TrafficView>): TrafficView => ({
    visitorId: "v1",
    sessionId: "s1",
    path: "/",
    locale: "fr",
    device: "mobile",
    country: "BJ",
    source: "direct",
    createdAt: new Date("2026-10-02T10:00:00Z"),
    ...overrides,
  });
  const views = [
    view({}),
    view({ path: "/commencer" }),
    view({ visitorId: "v2", sessionId: "s2", device: "desktop", country: null, source: "google", locale: "en" }),
    view({ visitorId: "v2", sessionId: "s3", createdAt: new Date("2026-10-02T23:30:00Z") }),
  ];
  const firstSeen = new Map([
    ["v1", new Date("2026-10-02T10:00:00Z")],
    ["v2", new Date("2026-09-15T08:00:00Z")],
  ]);
  const stats = trafficStats(views, firstSeen, from, to);

  it("counts distinct visitors, visits and page views", () => {
    expect(stats.kpis).toEqual({ visitors: 2, visits: 3, pageViews: 4, pagesPerVisit: 4 / 3, newVisitors: 1 });
  });

  it("fills every day of the period, including empty ones", () => {
    expect(stats.daily.map((day) => day.date)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(stats.daily[0]).toEqual({ date: "2026-10-01", visitors: 0, pageViews: 0 });
    expect(stats.daily[1]).toEqual({ date: "2026-10-02", visitors: 2, pageViews: 4 });
  });

  it("buckets hours in Benin time (UTC+1)", () => {
    expect(stats.hours).toHaveLength(24);
    expect(stats.hours[11]).toEqual({ hour: 11, pageViews: 3 });
    expect(stats.hours[0]).toEqual({ hour: 0, pageViews: 1 });
  });

  it("ranks pages by views and breaks traffic down", () => {
    expect(stats.pages[0]).toEqual({ key: "/", views: 3, visitors: 2 });
    expect(stats.sources).toEqual([
      { key: "direct", count: 2 },
      { key: "google", count: 1 },
    ]);
    expect(stats.devices).toEqual([
      { key: "mobile", count: 2 },
      { key: "desktop", count: 1 },
    ]);
    expect(stats.countries).toEqual([
      { key: "BJ", count: 2 },
      { key: "unknown", count: 1 },
    ]);
  });
});
