import { API_BASE_URL } from "./api/http";

const SESSION_KEY = "ca-tient:analytics-session";

export type AnalyticsEventType =
  | "landing_view"
  | "test_started"
  | "offer_viewed"
  | "what_if_used"
  | "report_viewed"
  | "report_printed";

// Fallback when sessionStorage is unavailable (strict private browsing): one id per page load.
let memorySessionId: string | null = null;

export function sessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    memorySessionId ??= crypto.randomUUID();
    return memorySessionId;
  }
}

// Fire-and-forget: measuring the funnel must never get in the way of the funnel itself.
export function trackEvent(type: AnalyticsEventType, ideaId?: string): void {
  if (typeof window === "undefined") return;
  try {
    void fetch(`${API_BASE_URL}/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, sessionId: sessionId(), ...(ideaId ? { ideaId } : {}) }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // crypto.randomUUID or fetch unavailable: skip the event
  }
}
