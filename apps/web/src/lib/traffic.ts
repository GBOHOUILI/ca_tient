import type { Locale } from "@/i18n/locales";
import { readAcquisition } from "./acquisition";
import { sessionId } from "./analytics";
import { API_BASE_URL } from "./api/http";

const VISITOR_KEY = "ca-tient:visitor";
export const NO_TRACK_KEY = "ca-tient:no-track";

export type Device = "mobile" | "tablet" | "desktop";

// Only this class is sent, never the user agent itself.
export function deviceType(userAgent: string, maxTouchPoints: number): Device {
  if (/iPad|Tablet/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))) return "tablet";
  // iPadOS reports a desktop Mac user agent: a Mac with a touch screen is an iPad.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "tablet";
  if (/Mobi|iPhone|Android/i.test(userAgent)) return "mobile";
  return "desktop";
}

let memoryVisitorId: string | null = null;

// Random id kept in this browser to count unique visitors; it identifies nobody.
function visitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    memoryVisitorId ??= crypto.randomUUID();
    return memoryVisitorId;
  }
}

export function isTrackingDisabled(): boolean {
  if (navigator.webdriver) return true;
  try {
    return window.localStorage.getItem(NO_TRACK_KEY) === "1";
  } catch {
    return false;
  }
}

// Fire-and-forget, like the funnel events: counting visits must never slow a page down.
export function trackPageView(path: string, locale: Locale): void {
  if (typeof window === "undefined" || isTrackingDisabled()) return;
  try {
    const acquisition = readAcquisition();
    void fetch(`${API_BASE_URL}/analytics/pageviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: visitorId(),
        sessionId: sessionId(),
        path: path.toLowerCase(),
        locale,
        device: deviceType(navigator.userAgent, navigator.maxTouchPoints ?? 0),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(acquisition?.referrerHost ? { referrerHost: acquisition.referrerHost } : {}),
        ...(acquisition?.utmSource ? { utmSource: acquisition.utmSource } : {}),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // crypto, storage or fetch unavailable: the view is simply not counted
  }
}
