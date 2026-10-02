import type { BreakEvenResult, CurrencyCode, FinancialResult } from "financial-engine";
import { readAcquisition } from "../acquisition";
import type { BusinessModel } from "../business-models";
import { forgetAccessToken, saveAccessToken } from "./access-token";
import { AccessDeniedError, API_BASE_URL, authHeaders } from "./http";

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

export interface CreateIdeaResponse {
  ideaId: string;
  result: FinancialResult;
  breakEven: BreakEvenResult;
  accessToken?: string;
}

export async function createIdea(input: CreateIdeaInput): Promise<CreateIdeaResponse> {
  const response = await fetch(`${API_BASE_URL}/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, acquisition: readAcquisition() }),
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
    throw new Error(`L'enregistrement du canvas a échoué (${response.status}).`);
  }
}

export interface IdeaDetail {
  id: string;
  businessModel: BusinessModel;
  currency: CurrencyCode;
  hypotheses: { key: string; value: number }[];
  paid: boolean;
  hasCapitalPlan: boolean;
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

export interface ProfileInput {
  country: string;
  city: string;
  profile: string;
  stage: string;
  heardFrom: string;
  contact: string;
  contactConsent: boolean;
}

export const EMPTY_PROFILE: ProfileInput = {
  country: "",
  city: "",
  profile: "",
  stage: "",
  heardFrom: "",
  contact: "",
  contactConsent: false,
};

export async function saveProfile(ideaId: string, profile: ProfileInput): Promise<void> {
  // Empty fields are left out rather than sent as "" (the API validates every value it receives).
  const body = Object.fromEntries(
    Object.entries(profile).filter(([key, value]) => (key === "contactConsent" ? true : String(value).trim() !== "")),
  );
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(ideaId) },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`L'enregistrement du profil a échoué (${response.status}).`);
  }
}

// Deletes the analysis and everything attached to it, then forgets its token in this browser.
export async function deleteIdea(ideaId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}`, { method: "DELETE", headers: authHeaders(ideaId) });
  if (!response.ok && response.status !== 404) {
    throw new Error(`La suppression a échoué (${response.status}).`);
  }
  forgetAccessToken(ideaId);
}
