import type { BusinessModel } from "@prisma/client";
import type { CurrencyCode } from "../financial-engine/financial-engine.types.js";

export interface SuggestedHypotheses {
  price: number;
  volume: number;
  variableCostPerUnit: number;
  fixedCosts: number;
}

export interface AiSuggestionInput {
  businessModel: BusinessModel;
  rawDescription: string;
  currency: CurrencyCode;
}

export const AI_PROVIDER = Symbol("AI_PROVIDER");

export interface AiProvider {
  suggestHypotheses(input: AiSuggestionInput): Promise<SuggestedHypotheses | null>;
}
