import type { BusinessModel } from "@prisma/client";
import type { CurrencyCode } from "financial-engine";

export interface SuggestedHypotheses {
  price: number;
  volume: number;
  variableCostPerUnit: number;
  fixedCosts: number;
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

export type SuggestedCanvasBlocks = Record<CanvasBlockKey, string>;

export interface AiSuggestionInput {
  businessModel: BusinessModel;
  rawDescription: string;
  currency: CurrencyCode;
}

// Qualitative facts only: no amount ever reaches the model (CLAUDE.md rule #3).
export interface ReportSummaryFacts {
  businessModel: BusinessModel;
  holds: boolean;
  breakEvenReachable: boolean;
  watchPoints: readonly string[];
  mostSensitive: readonly string[];
  financing: "gap" | "covered" | "unknown";
  valueProposition: string | null;
  customerSegments: string | null;
}

export const AI_PROVIDER = Symbol("AI_PROVIDER");

export interface AiProvider {
  suggestHypotheses(input: AiSuggestionInput): Promise<SuggestedHypotheses | null>;
  suggestCanvasBlocks(input: AiSuggestionInput): Promise<SuggestedCanvasBlocks | null>;
  writeReportSummary(facts: ReportSummaryFacts): Promise<string | null>;
}
