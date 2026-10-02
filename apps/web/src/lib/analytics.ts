const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
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

function sessionId(): string {
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

export type StatsPeriod = "7d" | "30d" | "all";

export interface FunnelStats {
  period: StatsPeriod;
  from: string | null;
  steps: { key: string; count: number }[];
  reportPrinted: number;
  recoveries: number;
}

export class AdminKeyRejectedError extends Error {}
export class StatsDisabledError extends Error {}

export async function fetchStats(adminKey: string, period: StatsPeriod): Promise<FunnelStats> {
  const response = await fetch(`${API_BASE_URL}/admin/stats?period=${period}`, { headers: { "x-admin-key": adminKey } });
  if (response.status === 401) throw new AdminKeyRejectedError();
  if (response.status === 404) throw new StatsDisabledError();
  if (!response.ok) throw new Error(`Statistiques indisponibles (${response.status}).`);
  return (await response.json()) as FunnelStats;
}
