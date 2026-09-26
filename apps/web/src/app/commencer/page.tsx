"use client";

import { useReducer, useState } from "react";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { StepBusinessType } from "@/components/wizard/StepBusinessType";
import { StepDescription } from "@/components/wizard/StepDescription";
import { StepHypotheses } from "@/components/wizard/StepHypotheses";
import { StepResults } from "@/components/wizard/StepResults";
import { StepEtSi } from "@/components/wizard/StepEtSi";
import { StepScenarios } from "@/components/wizard/StepScenarios";
import { StepCanvas } from "@/components/wizard/StepCanvas";
import { initialWizardState, wizardReducer } from "@/components/wizard/wizard-reducer";
import {
  CANVAS_BLOCK_KEYS,
  createIdea,
  suggestHypotheses,
  suggestCanvasBlocks,
  saveCanvasBlocks,
  type CreateIdeaResponse,
} from "@/lib/ideas-api";

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
    // Only suggest while the canvas is still blank: going back to hypotheses and resubmitting
    // must not overwrite blocks the user already has (edited or not).
    const canvasIsEmpty = CANVAS_BLOCK_KEYS.every((key) => state.canvasBlocks[key].trim() === "");
    try {
      const [result, canvasSuggestion] = await Promise.all([
        createIdea({
          businessModel: state.businessModel,
          rawDescription: state.rawDescription,
          currency: state.currency,
          hypotheses: state.hypotheses,
        }),
        canvasIsEmpty
          ? suggestCanvasBlocks({
              businessModel: state.businessModel,
              rawDescription: state.rawDescription,
              currency: state.currency,
            })
          : Promise.resolve({ available: false as const }),
      ]);
      setResponse(result);
      if (canvasSuggestion.available) {
        dispatch({ type: "SET_CANVAS_BLOCKS", blocks: canvasSuggestion.blocks });
      }
      dispatch({ type: "GO_TO_STEP", step: "canvas" });
    } catch {
      setError("Le calcul a echoue. Verifie tes valeurs et reessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCanvasNext() {
    if (!response) return;
    setSubmitting(true);
    setError(null);
    try {
      await saveCanvasBlocks(
        response.ideaId,
        state.canvasBlocks,
        state.canvasWasSuggested ? "ia_suggere" : "utilisateur_edite",
      );
      dispatch({ type: "GO_TO_STEP", step: "results" });
    } catch {
      setError("L'enregistrement a echoue. Reessaie.");
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

      {state.step === "canvas" && (
        <StepCanvas
          canvasBlocks={state.canvasBlocks}
          wasSuggested={state.canvasWasSuggested}
          onBlockChange={(key, value) => dispatch({ type: "SET_CANVAS_BLOCK", key, value })}
          onNext={handleCanvasNext}
          onBack={() => dispatch({ type: "GO_TO_STEP", step: "hypotheses" })}
          submitting={submitting}
          error={error}
        />
      )}

      {state.step === "results" && response && (
        <div className="flex flex-col items-center gap-8">
          <StepResults result={response.result} breakEven={response.breakEven} />
          <button
            type="button"
            onClick={() => dispatch({ type: "GO_TO_STEP", step: "et-si" })}
            className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white"
          >
            Explorer &quot;Et si ?&quot;
          </button>
        </div>
      )}

      {state.step === "et-si" && (
        <StepEtSi
          hypotheses={state.hypotheses}
          currency={state.currency}
          whatIfDeltas={state.whatIfDeltas}
          seasonalityProfile={state.seasonalityProfile}
          onDeltaChange={(key, value) => dispatch({ type: "SET_WHAT_IF_DELTA", key, value })}
          onSeasonalityChange={(profile) => dispatch({ type: "SET_SEASONALITY_PROFILE", profile })}
          onNext={() => dispatch({ type: "GO_TO_STEP", step: "scenarios" })}
          onBack={() => dispatch({ type: "GO_TO_STEP", step: "results" })}
        />
      )}

      {state.step === "scenarios" && (
        <StepScenarios
          hypotheses={state.hypotheses}
          currency={state.currency}
          whatIfDeltas={state.whatIfDeltas}
          onBack={() => dispatch({ type: "GO_TO_STEP", step: "et-si" })}
        />
      )}
    </main>
  );
}
