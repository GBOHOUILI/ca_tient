import type { CapitalNeed, ScenarioKey, SensitivityEntry, WatchPointCode } from "financial-engine";

export const BUSINESS_MODELS = ["ECOMMERCE", "FORMATION", "EBOOK", "SERVICE", "PRODUIT_PHYSIQUE", "AUTRE"] as const;
export type BusinessModel = (typeof BUSINESS_MODELS)[number];

export const CURRENCIES = ["XOF", "EUR", "USD", "GBP", "NGN", "GHS"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export interface HypothesesInput {
  price: number;
  volume: number;
  variableCostPerUnit: number;
  fixedCosts: number;
}

export interface CreateIdeaInput {
  businessModel: BusinessModel;
  rawDescription: string;
  currency: CurrencyCode;
  hypotheses: HypothesesInput;
}

export interface FinancialResult {
  currency: CurrencyCode;
  revenue: number;
  grossMargin: number;
  estimatedResult: number;
}

export type BreakEvenResult = { reachable: true; volumeUnits: number } | { reachable: false; reason: string };

export interface CreateIdeaResponse {
  ideaId: string;
  result: FinancialResult;
  breakEven: BreakEvenResult;
  accessToken?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const ACCESS_KEY_PREFIX = "ca-tient:access:";

// localStorage can throw (private browsing, storage disabled): access is then simply not remembered.
export function saveAccessToken(ideaId: string, token: string): void {
  try {
    window.localStorage.setItem(`${ACCESS_KEY_PREFIX}${ideaId}`, token);
  } catch {
    // ignored on purpose
  }
}

export function readAccessToken(ideaId: string): string | null {
  try {
    return window.localStorage.getItem(`${ACCESS_KEY_PREFIX}${ideaId}`);
  } catch {
    return null;
  }
}

function authHeaders(ideaId: string): Record<string, string> {
  const token = readAccessToken(ideaId);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class AccessDeniedError extends Error {
  constructor() {
    super("Acces a cette analyse refuse depuis ce navigateur.");
    this.name = "AccessDeniedError";
  }
}

export async function createIdea(input: CreateIdeaInput): Promise<CreateIdeaResponse> {
  const response = await fetch(`${API_BASE_URL}/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`La création de l'idée a échoué (${response.status}).`);
  }

  const body = (await response.json()) as CreateIdeaResponse;
  if (body.accessToken) {
    saveAccessToken(body.ideaId, body.accessToken);
  }
  return body;
}

export async function updateIdea(ideaId: string, input: CreateIdeaInput): Promise<CreateIdeaResponse> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(ideaId) },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`La mise à jour de l'idée a échoué (${response.status}).`);
  }

  return (await response.json()) as CreateIdeaResponse;
}

export interface SuggestHypothesesInput {
  businessModel: BusinessModel;
  rawDescription: string;
  currency: CurrencyCode;
}

export type SuggestHypothesesResponse =
  | { available: true; hypotheses: HypothesesInput }
  | { available: false };

export async function suggestHypotheses(input: SuggestHypothesesInput): Promise<SuggestHypothesesResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/ideas/suggest-hypotheses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return { available: false };
    }

    return (await response.json()) as SuggestHypothesesResponse;
  } catch {
    return { available: false };
  }
}

export const CANVAS_BLOCK_KEYS = [
  "valueProposition",
  "customerSegments",
  "channels",
  "customerRelationships",
  "keyResources",
  "keyActivities",
  "keyPartners",
] as const;

export type CanvasBlockKey = (typeof CANVAS_BLOCK_KEYS)[number];
export type CanvasBlocks = Record<CanvasBlockKey, string>;

export interface SuggestCanvasBlocksInput {
  businessModel: BusinessModel;
  rawDescription: string;
  currency: CurrencyCode;
}

export type SuggestCanvasBlocksResponse = { available: true; blocks: CanvasBlocks } | { available: false };

export async function suggestCanvasBlocks(input: SuggestCanvasBlocksInput): Promise<SuggestCanvasBlocksResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/ideas/suggest-canvas-blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return { available: false };
    }

    return (await response.json()) as SuggestCanvasBlocksResponse;
  } catch {
    return { available: false };
  }
}

export async function saveCanvasBlocks(
  ideaId: string,
  blocks: CanvasBlocks,
  source: "ia_suggere" | "utilisateur_edite",
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/canvas-blocks`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(ideaId) },
    body: JSON.stringify({
      blocks: CANVAS_BLOCK_KEYS.map((key) => ({ key, content: blocks[key] })),
      source,
    }),
  });

  if (!response.ok) {
    throw new Error(`L'enregistrement du canvas a echoue (${response.status}).`);
  }
}

export type PaymentStatus = "pending" | "approved" | "declined" | "canceled";

export interface IdeaDetail {
  id: string;
  businessModel: BusinessModel;
  currency: CurrencyCode;
  hypotheses: { key: string; value: number }[];
  paid: boolean;
  hasCapitalPlan: boolean;
}

export async function startPayment(ideaId: string): Promise<{ redirectUrl: string }> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/payments`, {
    method: "POST",
    headers: authHeaders(ideaId),
  });

  if (response.status === 409) {
    return { redirectUrl: `/analyse/${ideaId}` };
  }
  if (response.status === 401 || response.status === 404) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(`Le paiement n'a pas pu demarrer (${response.status}).`);
  }

  const body = (await response.json()) as { redirectUrl: string };
  return { redirectUrl: body.redirectUrl };
}

export async function fetchPaymentStatus(ideaId: string): Promise<{ paid: boolean; status: PaymentStatus | null }> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/payment`, { headers: authHeaders(ideaId) });

  if (response.status === 401 || response.status === 404) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(`Le statut du paiement est indisponible (${response.status}).`);
  }

  return (await response.json()) as { paid: boolean; status: PaymentStatus | null };
}

export async function fetchIdea(ideaId: string): Promise<IdeaDetail> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}`, { headers: authHeaders(ideaId) });

  if (response.status === 401 || response.status === 404) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(`L'analyse est indisponible (${response.status}).`);
  }

  return (await response.json()) as IdeaDetail;
}

export function hypothesesFromDetail(detail: IdeaDetail): HypothesesInput {
  const value = (key: keyof HypothesesInput) => detail.hypotheses.find((h) => h.key === key)?.value ?? 0;
  return {
    price: value("price"),
    volume: value("volume"),
    variableCostPerUnit: value("variableCostPerUnit"),
    fixedCosts: value("fixedCosts"),
  };
}

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
  summary: { text: string; source: "ai" | "template" };
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
