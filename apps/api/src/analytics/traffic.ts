export interface TrafficView {
  visitorId: string;
  sessionId: string;
  path: string;
  locale: string;
  device: string;
  country: string | null;
  source: string;
  createdAt: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Benin (UTC+1, no daylight saving): the hours chart reads in local time.
const BENIN_OFFSET_HOURS = 1;
const TOP_PAGES = 15;

// Analysis ids are private: only the shape of the path is kept.
export function normalizePath(path: string): string {
  const masked = path.replace(/^(\/en)?\/analyse\/[^/]+/, "$1/analyse/:id");
  return masked.length > 1 ? masked.replace(/\/+$/, "") : masked;
}

// Estimated from the browser time zone: no IP is ever used. Only zones of the expected audience.
const TIME_ZONE_COUNTRIES: Record<string, string> = {
  "Africa/Porto-Novo": "BJ",
  "Africa/Lome": "TG",
  "Africa/Abidjan": "CI",
  "Africa/Dakar": "SN",
  "Africa/Ouagadougou": "BF",
  "Africa/Niamey": "NE",
  "Africa/Bamako": "ML",
  "Africa/Conakry": "GN",
  "Africa/Douala": "CM",
  "Africa/Libreville": "GA",
  "Africa/Brazzaville": "CG",
  "Africa/Kinshasa": "CD",
  "Africa/Lubumbashi": "CD",
  "Africa/Lagos": "NG",
  "Africa/Accra": "GH",
  "Europe/Paris": "FR",
  "Europe/Brussels": "BE",
  "America/Toronto": "CA",
  "America/Montreal": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Halifax": "CA",
};

export function countryFromTimeZone(timeZone: string | undefined): string | null {
  return (timeZone && TIME_ZONE_COUNTRIES[timeZone]) || null;
}

const NETWORKS: { source: string; pattern: RegExp }[] = [
  { source: "google", pattern: /(^|\.)google\.[a-z.]+$/ },
  { source: "facebook", pattern: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/ },
  { source: "instagram", pattern: /(^|\.)instagram\.com$/ },
  { source: "whatsapp", pattern: /(^|\.)(whatsapp\.com|wa\.me)$/ },
  { source: "tiktok", pattern: /(^|\.)tiktok\.com$/ },
  { source: "linkedin", pattern: /(^|\.)(linkedin\.com|lnkd\.in)$/ },
  { source: "x", pattern: /(^|\.)(x\.com|twitter\.com|t\.co)$/ },
  { source: "bing", pattern: /(^|\.)bing\.com$/ },
  { source: "youtube", pattern: /(^|\.)(youtube\.com|youtu\.be)$/ },
];

// utm_source first (it is what a shared link says), then the referrer host grouped by network.
export function trafficSource(input: { utmSource?: string; referrerHost?: string }): string {
  const utm = input.utmSource?.trim().toLowerCase();
  if (utm) return utm;
  const host = input.referrerHost?.trim().toLowerCase();
  if (!host) return "direct";
  return NETWORKS.find((network) => network.pattern.test(host))?.source ?? host.replace(/^www\./, "");
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function countDistinct<T>(items: T[], key: (item: T) => string, distinct: (item: T) => string) {
  const sets = new Map<string, Set<string>>();
  for (const item of items) {
    const bucket = sets.get(key(item)) ?? new Set<string>();
    bucket.add(distinct(item));
    sets.set(key(item), bucket);
  }
  return [...sets.entries()]
    .map(([name, set]) => ({ key: name, count: set.size }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

// Breakdowns count visits (a tab session), so a long visit does not outweigh many short ones.
export function trafficStats(views: TrafficView[], firstSeen: Map<string, Date>, from: Date, to: Date) {
  const visitors = new Set(views.map((view) => view.visitorId));
  const visits = new Set(views.map((view) => view.sessionId));
  const newVisitors = [...visitors].filter((id) => {
    const first = firstSeen.get(id);
    return first !== undefined && first >= from;
  }).length;

  const days: { date: string; visitors: number; pageViews: number }[] = [];
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  for (let time = start; time <= to.getTime(); time += DAY_MS) {
    days.push({ date: dayKey(new Date(time)), visitors: 0, pageViews: 0 });
  }
  const dayIndex = new Map(days.map((day, position) => [day.date, position]));
  const dayVisitors = new Map<string, Set<string>>();
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, pageViews: 0 }));

  for (const view of views) {
    const date = dayKey(view.createdAt);
    const position = dayIndex.get(date);
    if (position !== undefined) {
      days[position].pageViews += 1;
      const set = dayVisitors.get(date) ?? new Set<string>();
      set.add(view.visitorId);
      dayVisitors.set(date, set);
    }
    hours[(view.createdAt.getUTCHours() + BENIN_OFFSET_HOURS) % 24].pageViews += 1;
  }
  for (const day of days) day.visitors = dayVisitors.get(day.date)?.size ?? 0;

  const pageViews = new Map<string, { key: string; views: number; visitors: Set<string> }>();
  for (const view of views) {
    const page = pageViews.get(view.path) ?? { key: view.path, views: 0, visitors: new Set<string>() };
    page.views += 1;
    page.visitors.add(view.visitorId);
    pageViews.set(view.path, page);
  }
  const pages = [...pageViews.values()]
    .map((page) => ({ key: page.key, views: page.views, visitors: page.visitors.size }))
    .sort((a, b) => b.views - a.views || a.key.localeCompare(b.key))
    .slice(0, TOP_PAGES);

  const bySession = (view: TrafficView) => view.sessionId;
  return {
    kpis: {
      visitors: visitors.size,
      visits: visits.size,
      pageViews: views.length,
      pagesPerVisit: visits.size === 0 ? 0 : views.length / visits.size,
      newVisitors,
    },
    daily: days,
    hours,
    pages,
    sources: countDistinct(views, (view) => view.source, bySession),
    devices: countDistinct(views, (view) => view.device, bySession),
    locales: countDistinct(views, (view) => view.locale, bySession),
    countries: countDistinct(views, (view) => view.country ?? "unknown", bySession),
  };
}
