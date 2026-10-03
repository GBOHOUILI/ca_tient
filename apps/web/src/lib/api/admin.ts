import { API_BASE_URL } from "./http";

export class AdminKeyRejectedError extends Error {}
export class StatsDisabledError extends Error {}

export interface FunnelStats {
  period: AdminPeriod;
  from: string | null;
  steps: { key: string; count: number }[];
  reportPrinted: number;
  recoveries: number;
}

export type AdminPeriod = "7d" | "30d" | "90d" | "all";

export interface AdminFilters {
  period: AdminPeriod;
  businessModel: string;
  country: string;
}

export interface Count {
  key: string;
  count: number;
}

export interface ConversionRow {
  key: string;
  ideas: number;
  paid: number;
  rate: number;
}

export interface Overview {
  kpis: {
    visits: number;
    ideas: number;
    paidIdeas: number;
    revenue: number;
    previewToPaidRate: number | null;
    holdsShare: number | null;
  };
  daily: { date: string; ideas: number; payments: number }[];
}

export interface Market {
  total: number;
  currency: string;
  currencies: Count[];
  byBusinessModel: Count[];
  byCountry: Count[];
  byProfile: Count[];
  byStage: Count[];
  perBusinessModel: {
    key: string;
    count: number;
    medianPrice: number | null;
    medianVolume: number | null;
    medianFixedCosts: number | null;
    holdsShare: number | null;
    withCapital: number;
    medianCapitalNeeded: number | null;
    medianFinancingGap: number | null;
  }[];
}

export interface Conversion {
  funnel: FunnelStats;
  byBusinessModel: ConversionRow[];
  byHeardFrom: ConversionRow[];
  byUtmSource: ConversionRow[];
  byCountry: ConversionRow[];
}

export interface Revenue {
  total: number;
  approved: number;
  declined: number;
  canceled: number;
  pending: number;
  daily: { date: string; revenue: number; approved: number }[];
  weekly: { weekStart: string; revenue: number }[];
}

export interface IdeaListItem {
  id: string;
  createdAt: string;
  businessModel: string;
  country: string | null;
  currency: string;
  holds: boolean | null;
  paid: boolean;
  hasContact: boolean;
  excerpt: string;
}

export interface IdeaList {
  total: number;
  page: number;
  pageSize: number;
  items: IdeaListItem[];
}

export interface IdeaDetail {
  idea: { id: string; createdAt: string; businessModel: string; rawDescription: string; currency: string; paidAt: string | null };
  acquisition: { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; referrerHost: string | null };
  hypotheses: { currency: string; price: number; volume: number; variableCostPerUnit: number; fixedCosts: number } | null;
  result: { revenue: number; grossMargin: number; estimatedResult: number } | null;
  breakEven: { reachable: true; volumeUnits: number } | { reachable: false; reason: string } | null;
  canvas: Record<string, string>;
  capital: {
    plan: { equipment: number; initialStock: number; openingCosts: number; other: number; availableCapital: number };
    need: { startupCosts: number; cashReserve: number; capitalNeeded: number; financingGap: number; surplus: number };
  } | null;
  profile: {
    country: string | null;
    city: string | null;
    profile: string | null;
    stage: string | null;
    heardFrom: string | null;
    contact: string | null;
    consentAt: string | null;
  } | null;
  payments: { status: string; amount: number; currency: string; provider: string; createdAt: string; confirmedAt: string | null }[];
  events: { type: string; createdAt: string }[];
  recoveries: number;
}

export class AdminNotFoundError extends Error {}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

async function adminRequest(adminKey: string, path: string): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { "x-admin-key": adminKey } });
  if (response.status === 401) throw new AdminKeyRejectedError();
  if (response.status === 404 && path.startsWith("/admin/ideas/")) throw new AdminNotFoundError();
  if (response.status === 404) throw new StatsDisabledError();
  if (!response.ok) throw new Error(`Données indisponibles (${response.status}).`);
  return response;
}

export async function adminGet<T>(adminKey: string, path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const response = await adminRequest(adminKey, `${path}${query(params)}`);
  return (await response.json()) as T;
}

export function filterParams(filters: AdminFilters): Record<string, string> {
  return { period: filters.period, businessModel: filters.businessModel, country: filters.country };
}

// The key travels in a header, so a plain link cannot download the file: fetch it, then save the blob.
export async function downloadContactsCsv(adminKey: string): Promise<void> {
  const response = await adminRequest(adminKey, "/admin/contacts.csv");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "contacts-ca-tient.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export async function deleteAdminIdea(adminKey: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/ideas/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "x-admin-key": adminKey },
  });
  if (response.status === 401) throw new AdminKeyRejectedError();
  if (!response.ok && response.status !== 404) throw new Error(`Suppression impossible (${response.status}).`);
}

export interface AdminReview {
  id: string;
  ideaId: string;
  rating: number;
  comment: string;
  displayName: string | null;
  publishConsent: boolean;
  status: "pending" | "published" | "hidden";
  createdAt: string;
}

export async function moderateReview(adminKey: string, id: string, status: AdminReview["status"]): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/reviews/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
    body: JSON.stringify({ status }),
  });
  if (response.status === 401) throw new AdminKeyRejectedError();
  if (!response.ok) throw new Error(`Modération impossible (${response.status}).`);
}
