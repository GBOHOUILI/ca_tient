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
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function createIdea(input: CreateIdeaInput): Promise<CreateIdeaResponse> {
  const response = await fetch(`${API_BASE_URL}/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`La création de l'idée a échoué (${response.status}).`);
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
