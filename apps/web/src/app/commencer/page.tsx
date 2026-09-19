"use client";

import { useReducer, useState } from "react";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { StepBusinessType } from "@/components/wizard/StepBusinessType";
import { StepDescription } from "@/components/wizard/StepDescription";
import { StepHypotheses } from "@/components/wizard/StepHypotheses";
import { StepResults } from "@/components/wizard/StepResults";
import { initialWizardState, wizardReducer } from "@/components/wizard/wizard-reducer";
import { createIdea, suggestHypotheses, type CreateIdeaResponse } from "@/lib/ideas-api";

export default function CommencerPage() {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const [suggesting, setSuggesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<CreateIdeaResponse | null>(null);

  async function handleDescriptionNext() {
    if (!state.businessModel) return;
    setSuggesting(true);
    try {
      const suggestion = await suggestHypotheses({
        businessModel: state.businessModel,
        rawDescription: state.rawDescription,
        currency: state.currency,
      });
      if (suggestion.available) {
        dispatch({ type: "SET_HYPOTHESES", hypotheses: suggestion.hypotheses });
      }
    } finally {
      setSuggesting(false);
      dispatch({ type: "GO_TO_STEP", step: "hypotheses" });
    }
  }

  async function handleSubmit() {
    if (!state.businessModel) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createIdea({
        businessModel: state.businessModel,
        rawDescription: state.rawDescription,
        currency: state.currency,
        hypotheses: state.hypotheses,
      });
      setResponse(result);
      dispatch({ type: "GO_TO_STEP", step: "results" });
    } catch {
      setError("Le calcul a echoue. Verifie tes valeurs et reessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-16 sm:px-6">
      <WizardProgress currentStep={state.step} />

      {state.step === "business-type" && (
        <StepBusinessType onSelect={(businessModel) => dispatch({ type: "SELECT_BUSINESS_MODEL", businessModel })} />
      )}

      {state.step === "description" && (
        <StepDescription
          value={state.rawDescription}
          onChange={(rawDescription) => dispatch({ type: "SET_DESCRIPTION", rawDescription })}
          onNext={handleDescriptionNext}
          onBack={() => dispatch({ type: "GO_TO_STEP", step: "business-type" })}
          loading={suggesting}
        />
      )}

      {state.step === "hypotheses" && state.businessModel && (
        <StepHypotheses
          businessModel={state.businessModel}
          hypotheses={state.hypotheses}
          currency={state.currency}
          wasSuggested={state.wasSuggested}
          onHypothesisChange={(key, value) => dispatch({ type: "SET_HYPOTHESIS", key, value })}
          onCurrencyChange={(currency) => dispatch({ type: "SET_CURRENCY", currency })}
          onSubmit={handleSubmit}
          onBack={() => dispatch({ type: "GO_TO_STEP", step: "description" })}
          submitting={submitting}
          error={error}
        />
      )}

      {state.step === "results" && response && (
        <StepResults result={response.result} breakEven={response.breakEven} />
      )}
    </main>
  );
}
