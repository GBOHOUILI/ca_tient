import type { BusinessModel, CanvasBlockKey, CanvasBlocks, CurrencyCode, HypothesesInput } from "@/lib/ideas-api";
import type { SeasonalityProfileKey } from "financial-engine";

export type WizardStep =
  | "business-type"
  | "description"
  | "hypotheses"
  | "canvas"
  | "results"
  | "et-si"
  | "scenarios";

export interface WhatIfDeltas {
  price: number;
  volume: number;
  variableCostPerUnit: number;
  fixedCosts: number;
}

const EMPTY_CANVAS_BLOCKS: CanvasBlocks = {
  valueProposition: "",
  customerSegments: "",
  channels: "",
  customerRelationships: "",
  keyResources: "",
  keyActivities: "",
  keyPartners: "",
};

export interface WizardState {
  step: WizardStep;
  businessModel: BusinessModel | null;
  rawDescription: string;
  currency: CurrencyCode;
  hypotheses: HypothesesInput;
  wasSuggested: boolean;
  whatIfDeltas: WhatIfDeltas;
  seasonalityProfile: SeasonalityProfileKey;
  canvasBlocks: CanvasBlocks;
  canvasWasSuggested: boolean;
}

export type WizardAction =
  | { type: "SELECT_BUSINESS_MODEL"; businessModel: BusinessModel }
  | { type: "SET_DESCRIPTION"; rawDescription: string }
  | { type: "SET_CURRENCY"; currency: CurrencyCode }
  | { type: "SET_HYPOTHESIS"; key: keyof HypothesesInput; value: number }
  | { type: "SET_HYPOTHESES"; hypotheses: HypothesesInput }
  | { type: "SET_WHAT_IF_DELTA"; key: keyof WhatIfDeltas; value: number }
  | { type: "SET_SEASONALITY_PROFILE"; profile: SeasonalityProfileKey }
  | { type: "SET_CANVAS_BLOCKS"; blocks: CanvasBlocks }
  | { type: "SET_CANVAS_BLOCK"; key: CanvasBlockKey; value: string }
  | { type: "GO_TO_STEP"; step: WizardStep };

export const initialWizardState: WizardState = {
  step: "business-type",
  businessModel: null,
  rawDescription: "",
  currency: "XOF",
  hypotheses: { price: 0, volume: 0, variableCostPerUnit: 0, fixedCosts: 0 },
  wasSuggested: false,
  whatIfDeltas: { price: 0, volume: 0, variableCostPerUnit: 0, fixedCosts: 0 },
  seasonalityProfile: "stable",
  canvasBlocks: EMPTY_CANVAS_BLOCKS,
  canvasWasSuggested: false,
};

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SELECT_BUSINESS_MODEL":
      return { ...state, businessModel: action.businessModel, step: "description" };
    case "SET_DESCRIPTION":
      return { ...state, rawDescription: action.rawDescription };
    case "SET_CURRENCY":
      return { ...state, currency: action.currency, wasSuggested: false };
    case "SET_HYPOTHESIS":
      return { ...state, hypotheses: { ...state.hypotheses, [action.key]: action.value }, wasSuggested: false };
    case "SET_HYPOTHESES":
      return { ...state, hypotheses: action.hypotheses, wasSuggested: true };
    case "SET_WHAT_IF_DELTA":
      return { ...state, whatIfDeltas: { ...state.whatIfDeltas, [action.key]: action.value } };
    case "SET_SEASONALITY_PROFILE":
      return { ...state, seasonalityProfile: action.profile };
    case "SET_CANVAS_BLOCKS":
      return { ...state, canvasBlocks: action.blocks, canvasWasSuggested: true };
    case "SET_CANVAS_BLOCK":
      return {
        ...state,
        canvasBlocks: { ...state.canvasBlocks, [action.key]: action.value },
        canvasWasSuggested: false,
      };
    case "GO_TO_STEP":
      return { ...state, step: action.step };
    default:
      return state;
  }
}
