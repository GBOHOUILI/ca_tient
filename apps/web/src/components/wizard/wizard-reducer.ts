import type { BusinessModel, CurrencyCode, HypothesesInput } from "@/lib/ideas-api";

export type WizardStep = "business-type" | "description" | "hypotheses" | "results";

export interface WizardState {
  step: WizardStep;
  businessModel: BusinessModel | null;
  rawDescription: string;
  currency: CurrencyCode;
  hypotheses: HypothesesInput;
  wasSuggested: boolean;
}

export type WizardAction =
  | { type: "SELECT_BUSINESS_MODEL"; businessModel: BusinessModel }
  | { type: "SET_DESCRIPTION"; rawDescription: string }
  | { type: "SET_CURRENCY"; currency: CurrencyCode }
  | { type: "SET_HYPOTHESIS"; key: keyof HypothesesInput; value: number }
  | { type: "SET_HYPOTHESES"; hypotheses: HypothesesInput }
  | { type: "GO_TO_STEP"; step: WizardStep };

export const initialWizardState: WizardState = {
  step: "business-type",
  businessModel: null,
  rawDescription: "",
  currency: "XOF",
  hypotheses: { price: 0, volume: 0, variableCostPerUnit: 0, fixedCosts: 0 },
  wasSuggested: false,
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
    case "GO_TO_STEP":
      return { ...state, step: action.step };
    default:
      return state;
  }
}
