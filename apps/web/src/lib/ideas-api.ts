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

export async function updateIdea(ideaId: string, input: CreateIdeaInput): Promise<CreateIdeaResponse> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: CANVAS_BLOCK_KEYS.map((key) => ({ key, content: blocks[key] })),
      source,
    }),
  });

  if (!response.ok) {
    throw new Error(`L'enregistrement du canvas a echoue (${response.status}).`);
  }
}
