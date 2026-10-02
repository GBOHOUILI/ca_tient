import type { BreakEvenResult, CapitalNeed, CurrencyCode, FinancialResult, ScenarioKey, SensitivityEntry, WatchPointCode } from "financial-engine";
import type { BusinessModel } from "../business-models";
import type { CanvasBlockKey, HypothesesInput } from "./ideas";
import { AccessDeniedError, API_BASE_URL, authHeaders } from "./http";

export interface CapitalPlanInput {
  equipment: number;
  initialStock: number;
  openingCosts: number;
  other: number;
  availableCapital: number;
}

export interface IdeaReport {
  idea: { id: string; businessModel: BusinessModel; rawDescription: string; currency: CurrencyCode };
  hypotheses: HypothesesInput & { currency: CurrencyCode };
  result: FinancialResult;
  breakEven: BreakEvenResult;
  scenarios: { key: ScenarioKey; result: FinancialResult }[];
  capital: { plan: CapitalPlanInput; need: CapitalNeed } | null;
  sensitivity: SensitivityEntry[];
  watchPoints: WatchPointCode[];
  canvas: {
    blocks: Partial<Record<CanvasBlockKey, string>>;
    costStructure: { variableCostPerUnit: number; fixedCosts: number; startupCosts: number | null };
    revenueStreams: { price: number; volume: number; revenue: number };
  };
}

export interface ReportSummary {
  text: string;
  source: "ai" | "template";
}

export async function saveCapital(ideaId: string, plan: CapitalPlanInput): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/capital`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(ideaId) },
    body: JSON.stringify(plan),
  });

  if (response.status === 401 || response.status === 404) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(`L'enregistrement du capital a echoue (${response.status}).`);
  }
}

export async function fetchReport(ideaId: string): Promise<IdeaReport> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/report`, { headers: authHeaders(ideaId) });

  if (response.status === 401 || response.status === 404) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(`Le rapport est indisponible (${response.status}).`);
  }

  return (await response.json()) as IdeaReport;
}

export async function fetchReportSummary(ideaId: string): Promise<ReportSummary> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/report/summary`, { headers: authHeaders(ideaId) });

  if (!response.ok) {
    throw new Error(`La synthese est indisponible (${response.status}).`);
  }

  return (await response.json()) as ReportSummary;
}
